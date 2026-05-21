// =============================================================================
// Document analysis service (CLAUDE.md S3-B1).
//
// Takes the OCR'd text of an uploaded regulatory document and produces the
// structured analysis the Document Analyser UI renders. Uses Claude Opus 4
// (highest-stakes reasoning task in the product — see CLAUDE.md §S3-B1).
//
// Output structure persisted in `uploaded_documents.analysis_result`:
//
//   {
//     plain_language_summary: string,
//     issuing_regulator: { code, name, department },
//     urgency_level: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW',
//     urgency_reasoning: string,
//     regulatory_ask: string[],
//     response_deadline: {
//       days_remaining: number|null,
//       date_string: string|null,
//       is_specified: boolean
//     },
//     action_plan: [{ step, action, urgency, notes }],
//     draft_response: string,
//     citations: [{ regulation, section, relevance }],
//     disclaimer: string
//   }
//
// Why we model the output ourselves instead of letting Claude return raw
// JSON: the §6 prompt is verbatim and uses section headers (PLAIN LANGUAGE
// SUMMARY: / URGENCY LEVEL: / 72-HOUR ACTION PLAN: …) not JSON. Section
// headers are more reliable for compliance-grade output, so we parse them
// back into JSON server-side.
// =============================================================================
import { Prisma } from '@prisma/client';
import {
  getAnthropicClient,
  KLARIFY_BASE_SYSTEM_PROMPT,
  KLARIFY_ANALYSE_PROMPT,
  getKlarifyModel,
  LEGAL_DISCLAIMER,
} from '@klarify/ai';
import { retrieveRelevantChunks, assembleContext } from '@klarify/ai/rag';
import type { JurisdictionCode } from '@klarify/ai/rag';
import { classifyAnthropicError } from '@klarify/ai/chat';
import { prisma } from '../db.js';

export type UrgencyLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ActionUrgency = 'IMMEDIATE' | 'TODAY' | 'THIS_WEEK';

export interface ActionStep {
  step: number;
  action: string;
  urgency: ActionUrgency;
  notes: string | null;
}

export interface ResponseDeadline {
  days_remaining: number | null;
  date_string: string | null;
  is_specified: boolean;
}

export interface IssuingRegulator {
  code: string | null;
  name: string | null;
  department: string | null;
}

export interface Citation {
  regulation: string;
  section: string;
  relevance: string | null;
}

export interface DocumentAnalysisResult {
  plain_language_summary: string;
  issuing_regulator: IssuingRegulator;
  urgency_level: UrgencyLevel;
  urgency_reasoning: string;
  regulatory_ask: string[];
  response_deadline: ResponseDeadline;
  action_plan: ActionStep[];
  draft_response: string;
  citations: Citation[];
  disclaimer: string;
}

export class DocumentAnalysisError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NO_TEXT'
      | 'NOT_FOUND'
      | 'UPSTREAM_FAILURE'
      | 'PARSE_FAILED',
    public readonly category: string | null = null,
  ) {
    super(message);
    this.name = 'DocumentAnalysisError';
  }
}

/**
 * Run the analyser against an OCR'd document. Persists the result and
 * updates status. Throws on failure (caller writes status='error').
 */
export async function analyseDocument(
  documentId: string,
): Promise<DocumentAnalysisResult> {
  const doc = await prisma.uploadedDocument.findUnique({
    where: { id: documentId },
    include: {
      org: { include: { members: { take: 5, include: { user: true } } } },
    },
  });
  if (!doc) {
    throw new DocumentAnalysisError(
      `Document ${documentId} not found.`,
      'NOT_FOUND',
    );
  }
  if (!doc.extractedText || doc.extractedText.trim().length < 50) {
    await markError(
      documentId,
      'No text could be extracted from this document. Try a clearer scan or paste the text directly.',
    );
    throw new DocumentAnalysisError(
      'No extracted text on document.',
      'NO_TEXT',
    );
  }

  // ----- Load org context for the draft response -----
  // The analyser prompt injects company name + officer details into the
  // draft so the user can submit it as-is. Pull the org name + the org
  // owner as a default signatory.
  const owner = doc.org.members.find((m) => m.role === 'owner') ?? doc.org.members[0];
  const orgContext = {
    companyName: doc.org.name,
    signatoryName: owner?.user.name ?? 'Compliance Officer',
    signatoryEmail: owner?.user.email ?? null,
  };

  // ----- Retrieve relevant corpus chunks -----
  // The first 500 chars usually contain the regulator's letterhead +
  // subject — exactly what the search needs. We append fixed keywords
  // for the enforcement / compliance lexicon.
  const query =
    doc.extractedText.slice(0, 500) +
    ' regulatory notice enforcement SEC Nigeria CBN NFIU response deadline compliance';

  // Default to Nigeria if user has no target markets set yet.
  const jurisdictions: JurisdictionCode[] = ['NG'];
  const chunks = await retrieveRelevantChunks(query, {
    topK: 10,
    jurisdictions,
    minSimilarity: 0.5,
  });
  const ragContext = assembleContext(chunks, {
    productTypes: [],
    targetMarkets: jurisdictions,
    stage: null,
    readinessScore: null,
  });

  // ----- Build Claude messages -----
  const systemBlocks: string[] = [
    KLARIFY_BASE_SYSTEM_PROMPT,
    KLARIFY_ANALYSE_PROMPT,
  ];
  if (ragContext.text) {
    systemBlocks.push(
      `--- RELEVANT REGULATORY CONTEXT ---\n${ragContext.text}\n--- END CONTEXT ---`,
    );
  }
  systemBlocks.push(
    `When generating the DRAFT ACKNOWLEDGMENT RESPONSE, address it on behalf of ` +
      `"${orgContext.companyName}" and sign it from "${orgContext.signatoryName}". ` +
      `Never make legal admissions. End the draft with: ` +
      `"This draft was prepared with AI assistance. Review with a qualified ` +
      `Nigerian digital asset regulatory specialist before submission."`,
  );

  const userBlock = `DOCUMENT TEXT TO ANALYSE:\n\n${doc.extractedText}`;

  // ----- Call Opus 4 -----
  const model = getKlarifyModel('architect');
  const anthropic = getAnthropicClient();

  let raw: string;
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const completion = await anthropic.messages.create({
      model,
      max_tokens: 3000,
      temperature: 0,
      system: systemBlocks.join('\n\n'),
      messages: [{ role: 'user', content: userBlock }],
    });
    raw = completion.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');
    inputTokens = completion.usage?.input_tokens ?? 0;
    outputTokens = completion.usage?.output_tokens ?? 0;
  } catch (err) {
    const classified = classifyAnthropicError(err);
    const rawMsg = err instanceof Error ? err.message : String(err);
    console.error(
      '[ai/analyse] anthropic error: category=%s upstreamType=%s upstreamStatus=%s raw=%s',
      classified.category,
      classified.upstreamType,
      classified.upstreamStatus,
      rawMsg,
    );
    await markError(documentId, classified.message);
    throw new DocumentAnalysisError(
      classified.message,
      'UPSTREAM_FAILURE',
      classified.category,
    );
  }

  // ----- Parse the section-headed output into structured JSON -----
  let parsed: DocumentAnalysisResult;
  try {
    parsed = parseAnalyserOutput(raw);
  } catch (err) {
    console.error('[ai/analyse] parse failed:', err, 'raw=', raw.slice(0, 500));
    await markError(
      documentId,
      'Klarify could not interpret the analysis result. Please try again.',
    );
    throw new DocumentAnalysisError(
      'Failed to parse analyser output.',
      'PARSE_FAILED',
    );
  }

  // ----- Persist -----
  const tokensUsed = inputTokens + outputTokens;
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.uploadedDocument.update({
      where: { id: documentId },
      data: {
        analysisResult: parsed as unknown as Prisma.JsonObject,
        urgencyLevel: parsed.urgency_level,
        actionItems: parsed.action_plan as unknown as Prisma.JsonArray,
        draftResponse: parsed.draft_response,
        status: 'complete',
        analysedAt: new Date(),
        errorMessage: null,
      },
    });
    // Lightweight audit row — same `ingestion_log` pattern used in Sprint 2
    // for visibility, but for analysis instead of ingest. Optional; omit
    // until we add the table. For now we just log.
  });

  console.warn(
    '[ai/analyse] document=%s urgency=%s tokens=%d',
    documentId,
    parsed.urgency_level,
    tokensUsed,
  );

  return parsed;
}

async function markError(documentId: string, message: string): Promise<void> {
  try {
    await prisma.uploadedDocument.update({
      where: { id: documentId },
      data: { status: 'error', errorMessage: message },
    });
  } catch (err) {
    console.error('[ai/analyse] markError failed for %s', documentId, err);
  }
}

// =============================================================================
// Section-header parser — exported for unit tests.
// =============================================================================

const SECTION_LABELS = [
  'PLAIN LANGUAGE SUMMARY',
  'ISSUING REGULATOR',
  'URGENCY LEVEL',
  'WHAT THE REGULATOR IS ASKING FOR',
  'RESPONSE DEADLINE',
  '72-HOUR ACTION PLAN',
  'DRAFT ACKNOWLEDGMENT RESPONSE',
  'DISCLAIMER',
] as const;

/**
 * Parse the verbatim §6 section-headed output into our typed result.
 *
 * The model is given the section headers explicitly so we can do a
 * regex split and trust each section's contents. Any missing section
 * is filled with a safe default — we never throw on a partial output,
 * because a missing CITATIONS section is better than a 500 page.
 */
export function parseAnalyserOutput(raw: string): DocumentAnalysisResult {
  const sections = splitSections(raw);

  const summary = sections.get('PLAIN LANGUAGE SUMMARY') ?? '';
  if (!summary.trim()) {
    throw new Error('PLAIN LANGUAGE SUMMARY is missing.');
  }

  const issuingRegulator = parseIssuingRegulator(
    sections.get('ISSUING REGULATOR') ?? '',
  );
  const { level, reasoning } = parseUrgencyLevel(
    sections.get('URGENCY LEVEL') ?? '',
  );
  const asks = parseBulletList(
    sections.get('WHAT THE REGULATOR IS ASKING FOR') ?? '',
  );
  const deadline = parseDeadline(sections.get('RESPONSE DEADLINE') ?? '');
  const actionPlan = parseActionPlan(
    sections.get('72-HOUR ACTION PLAN') ?? '',
  );
  const draft = (sections.get('DRAFT ACKNOWLEDGMENT RESPONSE') ?? '').trim();

  // Citations may be returned inline like "[ISA 2025, Section 357]".
  // Pull them out of the full raw text — citations can appear anywhere.
  const citations = extractCitations(raw);

  return {
    plain_language_summary: summary.trim(),
    issuing_regulator: issuingRegulator,
    urgency_level: level,
    urgency_reasoning: reasoning,
    regulatory_ask: asks,
    response_deadline: deadline,
    action_plan: actionPlan,
    draft_response: draft,
    citations,
    disclaimer: LEGAL_DISCLAIMER,
  };
}

/** Build a Map of section-label → body using the §6 header set.
 *
 * Tolerates both formats Claude emits in practice:
 *   1. The verbatim §6 form:           `PLAIN LANGUAGE SUMMARY:`
 *   2. The markdown-styled drift form: `## PLAIN LANGUAGE SUMMARY`
 *      (also `# LABEL` / `### LABEL`, with or without a trailing colon)
 *   3. Bold-emphasised drift:          `**PLAIN LANGUAGE SUMMARY:**`
 *
 * Empirically: even with the §6 prompt explicitly demanding "LABEL:",
 * Opus drifts into markdown roughly 1 in 3 generations. Rather than
 * fight the prompt forever, we just accept the drift here — every
 * header form anchors on a line start, allows optional leading `#`
 * markers + bold markers, and an optional trailing colon.
 */
function splitSections(raw: string): Map<string, string> {
  const out = new Map<string, string>();
  const labelPattern = SECTION_LABELS.map((l) => escapeRegex(l)).join('|');
  // Anchored to line start. Accepts every header form we've observed:
  //   - Canonical:     `PLAIN LANGUAGE SUMMARY: body on same line`
  //   - Canonical alone: `PLAIN LANGUAGE SUMMARY:`  (body on next line)
  //   - Markdown drift:  `## PLAIN LANGUAGE SUMMARY`
  //   - Markdown + colon:`### PLAIN LANGUAGE SUMMARY:`
  //   - Bold-wrapped:    `**PLAIN LANGUAGE SUMMARY:**`
  //   - Mixed:           `## **PLAIN LANGUAGE SUMMARY**`
  //
  // After the (captured) label, we require EITHER a `:` (with optional
  // closing `**`) OR end-of-line — this prevents false matches against
  // paragraph text that happens to contain a label substring.
  const re = new RegExp(
    `^[ \\t]*` +
      `(?:#{1,6}[ \\t]*)?` + // optional markdown heading prefix
      `\\*{0,2}` + // optional opening bold
      `(${labelPattern})` + // the canonical label
      `\\*{0,2}` + // optional closing bold (markdown heading form)
      `[ \\t]*` +
      `(?::\\*{0,2}|$)`, // `:` (with optional closing **) OR end-of-line
    'im',
  );

  const headers: Array<{ label: string; start: number; end: number }> = [];
  const globalRe = new RegExp(re.source, 'gim');
  let m: RegExpExecArray | null;
  while ((m = globalRe.exec(raw)) !== null) {
    headers.push({
      label: m[1]!.toUpperCase().replace(/\s+/g, ' '),
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  if (headers.length === 0) return out;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]!;
    const next = headers[i + 1];
    const body = raw.slice(h.end, next ? next.start : raw.length);
    // Strip markdown bold emphasis (`**...**`) from every section EXCEPT the
    // draft response, where emphasis is part of the letter content and the
    // user might genuinely want it preserved when copying into Word.
    // Without this strip, downstream parsers see `**CRITICAL**` instead of
    // `CRITICAL`, `**21 June 2026**` instead of a parseable date, etc.
    const isDraft = h.label === 'DRAFT ACKNOWLEDGMENT RESPONSE';
    const cleaned = isDraft
      ? body.trim()
      : body.trim().replace(/\*\*(.+?)\*\*/g, '$1');
    out.set(h.label, cleaned);
  }
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseIssuingRegulator(text: string): IssuingRegulator {
  const cleaned = text.trim();
  if (!cleaned) {
    return { code: null, name: null, department: null };
  }
  // Pattern: "Central Bank of Nigeria — Payments System Department"
  //          or "CBN, Payments Department"
  //          or just "Central Bank of Nigeria"
  const parts = cleaned.split(/[—,–-]\s+|\.\s+/, 2);
  const name = parts[0]?.trim() ?? null;
  const department = parts[1]?.trim() ?? null;
  const code = inferRegulatorCode(name ?? '');
  return { name, department, code };
}

function inferRegulatorCode(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes('securities and exchange') || n.includes('sec nigeria')) return 'SEC_NIGERIA';
  if (n.includes('central bank')) return 'CBN';
  if (n.includes('nfiu') || n.includes('financial intelligence')) return 'NFIU';
  if (n.includes('nitda')) return 'NITDA';
  if (n.includes('corporate affairs') || n.includes('cac')) return 'CAC';
  if (n.includes('efcc') || n.includes('economic and financial crimes')) return 'EFCC';
  if (n.includes('naicom') || n.includes('insurance')) return 'NAICOM';
  return null;
}

function parseUrgencyLevel(text: string): {
  level: UrgencyLevel;
  reasoning: string;
} {
  const cleaned = text.trim();
  // First line is the level itself.
  const firstLine = cleaned.split('\n')[0]?.trim() ?? '';
  const levelMatch = firstLine.match(/(CRITICAL|HIGH|MEDIUM|LOW)/i);
  const level = (levelMatch?.[1]?.toUpperCase() ?? 'MEDIUM') as UrgencyLevel;
  // Anything after the first line is reasoning.
  const reasoning = cleaned.split('\n').slice(1).join('\n').trim();
  return { level, reasoning };
}

/** Parse a markdown-style bullet list into a string array. */
function parseBulletList(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*[-*•]\s+/, '').replace(/^\s*\d+[.)]\s+/, '').trim())
    .filter((line) => line.length > 0);
}

const DAY_MS = 1000 * 60 * 60 * 24;

/** Parse "21 June 2026" / "2026-06-21" / "Not specified" / etc. */
export function parseDeadline(text: string): ResponseDeadline {
  const cleaned = text.trim();
  if (!cleaned || /not\s+specified|not\s+stated/i.test(cleaned)) {
    return { days_remaining: null, date_string: null, is_specified: false };
  }

  // Try YYYY-MM-DD first.
  const iso = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(
      Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])),
    );
    return formatDeadline(date, cleaned);
  }
  // Try "21 June 2026" / "June 21, 2026".
  const parsed = Date.parse(cleaned);
  if (!Number.isNaN(parsed)) {
    return formatDeadline(new Date(parsed), cleaned);
  }
  // Try fuzzy DD/MM/YYYY.
  const dmy = cleaned.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) {
    const year = Number(dmy[3]!.length === 2 ? `20${dmy[3]}` : dmy[3]);
    const date = new Date(
      Date.UTC(year, Number(dmy[2]) - 1, Number(dmy[1])),
    );
    if (!Number.isNaN(date.valueOf())) {
      return formatDeadline(date, cleaned);
    }
  }

  // Couldn't parse a date but the section wasn't "Not specified" — keep
  // the string so the UI can render it, but mark days_remaining null.
  return { days_remaining: null, date_string: cleaned, is_specified: true };
}

function formatDeadline(date: Date, original: string): ResponseDeadline {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const days = Math.round((date.valueOf() - today.valueOf()) / DAY_MS);
  return {
    days_remaining: days,
    date_string: original,
    is_specified: true,
  };
}

/** Parse the numbered action plan into structured steps. */
function parseActionPlan(text: string): ActionStep[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const steps: ActionStep[] = [];
  let step = 0;
  let buffer: string[] = [];
  let urgency: ActionUrgency = 'THIS_WEEK';

  const flush = (): void => {
    if (buffer.length === 0) return;
    const action = buffer.join(' ').trim();
    if (action) {
      step += 1;
      steps.push({
        step,
        action,
        urgency: pickActionUrgency(step, action, urgency),
        notes: null,
      });
    }
    buffer = [];
  };

  for (const line of lines) {
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (numbered) {
      flush();
      buffer.push(numbered[2]!);
      continue;
    }
    if (/^\s*[-*•]\s+/.test(line)) {
      flush();
      buffer.push(line.replace(/^\s*[-*•]\s+/, ''));
      continue;
    }
    // Continuation of the previous step.
    if (buffer.length > 0) buffer.push(line);
  }
  flush();

  return steps;
}

function pickActionUrgency(
  stepIdx: number,
  text: string,
  prior: ActionUrgency,
): ActionUrgency {
  const t = text.toLowerCase();
  if (/immediate|today|within\s+24|right now|asap/.test(t)) return 'IMMEDIATE';
  if (/this week|within\s+72|by friday/.test(t)) return 'THIS_WEEK';
  if (/today|by end of day/.test(t)) return 'TODAY';
  // Cascade by position: first step → IMMEDIATE, second → TODAY, rest THIS_WEEK.
  if (stepIdx === 1) return 'IMMEDIATE';
  if (stepIdx === 2) return 'TODAY';
  return prior;
}

/**
 * Permissive match for `[Regulation Name, Section X]` brackets. We require:
 *   * The bracket starts with a capital letter (so footnotes like
 *     "[note, …]" never match).
 *   * The regulation half ends BEFORE a comma.
 * Validity (is this a real citation vs. a footnote?) is checked in
 * post-processing — see `looksLikeCitation`.
 */
const CITATION_RE = /\[([A-Z][^,\]]{1,80}),\s*([^\]]{1,120})\]/g;

/**
 * A regulation reference must look like one of:
 *   * An acronym (≥ 2 consecutive uppercase letters), e.g. ISA / MLPPA / CBN
 *   * A title-cased name that ends with a 4-digit year (e.g. "SEC Digital
 *     Asset Rules 2024", "FATF Recommendation 15")
 *
 * That rules out single-word capitalised footnotes like "[Note, see above]"
 * while still catching everything Claude tends to emit.
 */
function looksLikeCitation(regulation: string): boolean {
  if (/[A-Z]{2,}/.test(regulation)) return true;
  if (/\b\d{4}\b|\bRecommendation\b|\bRule\b/i.test(regulation)) return true;
  return false;
}

/** Extract `[ISA 2025, Section 357]`-style citations from anywhere in the raw text. */
export function extractCitations(raw: string): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  let m: RegExpExecArray | null;
  while ((m = CITATION_RE.exec(raw)) !== null) {
    const regulation = m[1]!.trim();
    const section = m[2]!.trim();
    if (!looksLikeCitation(regulation)) continue;
    const key = `${regulation}|${section}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ regulation, section, relevance: null });
  }
  return out;
}
