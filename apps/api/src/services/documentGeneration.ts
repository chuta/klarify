// =============================================================================
// Compliance Document Generator (Sprint 4 — S4-B1b, US-008).
//
// Pipeline:
//   1. Look up the DocumentTemplate definition (CLAUDE.md §14 / packages/ai).
//   2. Load org + user profile so prefilledFrom paths resolve to real values.
//   3. Validate the submitted formData with a dynamically-built Zod schema.
//   4. Retrieve Nigerian-jurisdiction RAG context for the document type.
//   5. Call Claude (advisory model, low temperature) to produce structured
//      markdown.
//   6. Parse the markdown into sections; render to .docx using the existing
//      docx pipeline (reuses the markdown→docx logic from exportDraft).
//   7. Upload .docx to S3 (private + SSE).
//   8. Persist a `generated_documents` row.
//   9. Return { documentId, downloadUrl, regulatoryBasisCitations }.
//
// Regeneration replays the pipeline with `version = previous + 1`, marks
// the previous version `is_current = false`, and keeps the previous row
// for the audit trail.
//
// CLAUDE.md compliance:
//   * §16 Rule 1: every generated document body ends with the standard
//     disclaimer (prompt-enforced + asserted in tests).
//   * §16 Rule 3: org_id scoped queries via `withRls`. S3 key includes
//     orgId so cross-org retrievals are mechanically impossible.
//   * §16 Rule 5: prompt mandates inline regulatory citations.
// =============================================================================
import type { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { z } from 'zod';
import {
  parseDraftBody,
  type DraftParagraph,
  type InlineSegment,
} from '@klarify/core';
import {
  getAnthropicClient,
  getKlarifyModel,
} from '@klarify/ai';
import {
  retrieveRelevantChunks,
  assembleContext,
  type JurisdictionCode,
} from '@klarify/ai/rag';
import {
  DOCUMENT_TEMPLATES,
  getTemplate,
  type DocumentField,
  type DocumentTemplate,
  type TemplateId,
} from '@klarify/ai/prompts/documents';
import { classifyAnthropicError } from '@klarify/ai/chat';
import { prisma } from '../db.js';
import { putObject, getSignedDownloadUrl } from './s3.js';

// =============================================================================
// Errors
// =============================================================================

export class DocumentGenerationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'TEMPLATE_NOT_FOUND'
      | 'NO_ORG'
      | 'VALIDATION_FAILED'
      | 'UPSTREAM_FAILURE'
      | 'NOT_FOUND'
      | 'RENDER_FAILED',
    public readonly httpStatus: number,
    public readonly details: unknown = null,
  ) {
    super(message);
    this.name = 'DocumentGenerationError';
  }
}

// =============================================================================
// Public types
// =============================================================================

export interface GenerationResult {
  documentId: string;
  templateId: TemplateId;
  version: number;
  title: string;
  s3Key: string;
  downloadUrl: string;
  regulatoryBasis: string;
  expiresAt: string;
}

export interface GeneratedSection {
  title: string;
  content: string;
  regulatoryBasis: string | null;
}

export interface GeneratedContent {
  templateId: TemplateId;
  documentName: string;
  regulatoryBasis: string;
  markdown: string;
  sections: GeneratedSection[];
}

interface PrefillContext {
  org: { name: string; plan: string };
  user: { name: string; email: string };
  profile: {
    productTypes: string[];
    targetMarkets: string[];
    stage: string | null;
    teamSize: number | null;
  };
  today: string;
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Look up a template by id. 404s if unknown.
 * Used by routes that need to fail-fast before doing any work.
 */
export function requireTemplate(templateId: string): DocumentTemplate {
  const tpl = getTemplate(templateId);
  if (!tpl) {
    throw new DocumentGenerationError(
      `Unknown document template: ${templateId}`,
      'TEMPLATE_NOT_FOUND',
      404,
    );
  }
  return tpl;
}

/**
 * Build a Zod schema from the template's requiredFields. Exposed so the
 * route layer can validate request bodies BEFORE doing any expensive
 * work (RAG retrieval, Claude call, S3 upload).
 */
export function buildFormSchema(template: DocumentTemplate): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};
  for (const f of template.requiredFields) {
    shape[f.key] = fieldSchema(f);
  }
  return z.object(shape);
}

function fieldSchema(f: DocumentField): z.ZodTypeAny {
  let s: z.ZodTypeAny;
  switch (f.type) {
    case 'text':
    case 'textarea':
    case 'date':
    case 'select': {
      // Build the base string schema with min(1) applied FIRST so required
      // validation surfaces a clear message before any refinement runs.
      const base: z.ZodString = f.required
        ? z.string().min(1, `${f.label} is required.`)
        : z.string();
      if (f.type === 'select' && f.options && f.options.length > 0) {
        s = base.refine(
          (v) => (f.options as readonly string[]).includes(v),
          { message: `Must be one of: ${(f.options).join(', ')}` },
        );
      } else {
        s = base;
      }
      break;
    }
    case 'multiselect': {
      // Two separate variables so TypeScript can keep the precise inner-element
      // type. Reassigning `let arr` would force the wider `ZodArray<ZodTypeAny>`.
      const arr: z.ZodArray<z.ZodTypeAny> =
        f.options && f.options.length > 0
          ? z.array(
              z.string().refine(
                (v) => (f.options as readonly string[]).includes(v),
                {
                  message: `Must be one of: ${(f.options).join(', ')}`,
                },
              ),
            )
          : z.array(z.string());
      s = f.required ? arr.min(1, `${f.label} requires at least one value.`) : arr;
      break;
    }
    case 'boolean':
      s = z.boolean();
      break;
    default:
      // exhaustiveness guard
      s = z.unknown();
  }
  if (!f.required) {
    s = s.optional();
  }
  return s;
}

/**
 * Generate a new document for the given template. Throws on validation,
 * upstream, or storage failure. The caller is responsible for invoking
 * the rate-limit consume callback on success.
 */
export async function generateDocument(args: {
  templateId: string;
  orgId: string;
  userId: string;
  formData: Record<string, unknown>;
}): Promise<{ result: GenerationResult; content: GeneratedContent }> {
  const template = requireTemplate(args.templateId);

  // ---- Validate ----------------------------------------------------------
  const schema = buildFormSchema(template);
  const validated = schema.safeParse(args.formData);
  if (!validated.success) {
    throw new DocumentGenerationError(
      'Some required fields are missing or invalid.',
      'VALIDATION_FAILED',
      422,
      validated.error.flatten(),
    );
  }
  const formData = validated.data as Record<string, unknown>;

  // ---- Load org + user for prefill / letterhead --------------------------
  const prefill = await loadPrefillContext(args.orgId, args.userId);

  // ---- Resolve effective form values: explicit input wins; otherwise fall
  // back to prefilledFrom path -------------------------------------------
  const effective: Record<string, unknown> = { ...formData };
  for (const f of template.requiredFields) {
    if (effective[f.key] === undefined || effective[f.key] === '' || effective[f.key] === null) {
      if (f.prefilledFrom) {
        const v = resolvePrefill(f.prefilledFrom, prefill);
        if (v !== undefined && v !== null && v !== '') {
          effective[f.key] = v;
        }
      }
    }
  }

  // ---- RAG context -------------------------------------------------------
  const jurisdictions: JurisdictionCode[] = ['NG'];
  const ragQuery = buildRagQuery(template, effective);
  const ragContext = await safeAssembleRag(ragQuery, jurisdictions);

  // ---- Claude ------------------------------------------------------------
  const systemBlocks: string[] = [template.systemPrompt];
  if (ragContext) {
    systemBlocks.push(
      `--- RELEVANT REGULATORY CONTEXT ---\n${ragContext}\n--- END CONTEXT ---`,
    );
  }
  systemBlocks.push(
    `--- COMPANY CONTEXT ---\nCompany: ${prefill.org.name}\nCompliance Officer: ${prefill.user.name}\nCompliance Officer Email: ${prefill.user.email}\nTarget markets: ${prefill.profile.targetMarkets.join(', ') || 'Nigeria'}\nProduct types: ${prefill.profile.productTypes.join(', ') || 'unspecified'}\n--- END CONTEXT ---`,
  );

  const userBlock = renderUserMessage(template, effective);

  const model = getKlarifyModel('advisory');
  const anthropic = getAnthropicClient();

  let raw: string;
  try {
    const completion = await anthropic.messages.create({
      model,
      max_tokens: 4000,
      temperature: 0.2,
      system: systemBlocks.join('\n\n'),
      messages: [{ role: 'user', content: userBlock }],
    });
    raw = completion.content
      .filter((b) => b.type === 'text')
      .map((b) => (b).text)
      .join('');
  } catch (err) {
    const classified = classifyAnthropicError(err);
    console.error(
      '[documentGeneration] anthropic error category=%s upstreamStatus=%s msg=%s',
      classified.category,
      classified.upstreamStatus,
      err instanceof Error ? err.message : err,
    );
    throw new DocumentGenerationError(
      classified.message,
      'UPSTREAM_FAILURE',
      503,
      { category: classified.category },
    );
  }

  if (!raw || raw.trim().length < 100) {
    throw new DocumentGenerationError(
      'Klarify generated an empty document. Please try again.',
      'UPSTREAM_FAILURE',
      503,
    );
  }

  const markdown = raw.trim();

  // ---- Parse markdown into sections (for content jsonb persistence) ------
  const sections = parseSections(markdown, template.regulatoryBasis);

  // ---- Render .docx ------------------------------------------------------
  let docxBuffer: Buffer;
  try {
    docxBuffer = await renderTemplateDocx({
      template,
      companyName: prefill.org.name,
      markdown,
    });
  } catch (err) {
    console.error('[documentGeneration] docx render failed', err);
    throw new DocumentGenerationError(
      'Klarify could not render the document. Please try again.',
      'RENDER_FAILED',
      500,
    );
  }

  // ---- Determine next version (within the org's existing rows) ------------
  // We do not delete previous versions — every generation is its own row,
  // versions monotonically advance per (org, template_type).
  const previous = await prisma.generatedDocument.findFirst({
    where: {
      orgId: args.orgId,
      templateType: template.templateId,
      deletedAt: null,
    },
    orderBy: { version: 'desc' },
    select: { version: true },
  });
  const nextVersion = (previous?.version ?? 0) + 1;

  // ---- Upload to S3 -------------------------------------------------------
  const docId = randomUUID();
  const s3Key = `${args.orgId}/${args.userId}/documents/${docId}/${template.templateId}_v${nextVersion}.docx`;
  await putObject({
    key: s3Key,
    body: docxBuffer,
    contentType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    downloadFilename: `${sanitiseFilenamePart(template.documentName)}_v${nextVersion}.docx`,
  });

  // ---- Persist with version bookkeeping ----------------------------------
  // Within a transaction so concurrent regenerations can't both end up
  // is_current=true. RLS GUC is set by the route caller via withRls;
  // re-set here for safety on workers / fire-and-forget paths.
  const persistedId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true)`,
      args.userId,
    );
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_org_id', $1, true)`,
      args.orgId,
    );

    // Demote previous current versions for this (org, template).
    await tx.generatedDocument.updateMany({
      where: {
        orgId: args.orgId,
        templateType: template.templateId,
        isCurrent: true,
        deletedAt: null,
      },
      data: { isCurrent: false },
    });

    const row = await tx.generatedDocument.create({
      data: {
        id: docId,
        orgId: args.orgId,
        userId: args.userId,
        templateType: template.templateId,
        title: template.documentName,
        content: { sections, markdown } as unknown as Prisma.JsonObject,
        formData: effective as unknown as Prisma.JsonObject,
        version: nextVersion,
        s3Key,
        regulatoryBasis: template.regulatoryBasis,
        isCurrent: true,
      },
      select: { id: true },
    });
    return row.id;
  });

  // ---- Mint signed URL ----------------------------------------------------
  const ttlSeconds = 3600;
  const downloadUrl = await getSignedDownloadUrl(s3Key, ttlSeconds);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  const result: GenerationResult = {
    documentId: persistedId,
    templateId: template.templateId,
    version: nextVersion,
    title: template.documentName,
    s3Key,
    downloadUrl,
    regulatoryBasis: template.regulatoryBasis,
    expiresAt,
  };

  const content: GeneratedContent = {
    templateId: template.templateId,
    documentName: template.documentName,
    regulatoryBasis: template.regulatoryBasis,
    markdown,
    sections,
  };

  return { result, content };
}

/**
 * Regenerate an existing document — replays the pipeline with version++.
 * If `formData` is omitted, uses the previously stored formData (lets the
 * user "regenerate as-is" without retyping anything).
 */
export async function regenerateDocument(args: {
  documentId: string;
  orgId: string;
  userId: string;
  formData?: Record<string, unknown>;
}): Promise<{ result: GenerationResult; content: GeneratedContent }> {
  const existing = await prisma.generatedDocument.findFirst({
    where: { id: args.documentId, orgId: args.orgId, deletedAt: null },
    select: {
      templateType: true,
      formData: true,
    },
  });
  if (!existing) {
    throw new DocumentGenerationError(
      'Document not found.',
      'NOT_FOUND',
      404,
    );
  }

  const formData =
    args.formData ??
    (existing.formData as Record<string, unknown> | null) ??
    {};

  return generateDocument({
    templateId: existing.templateType,
    orgId: args.orgId,
    userId: args.userId,
    formData,
  });
}

/**
 * Mint a fresh signed download URL for an existing document. Used by the
 * UI when the original 1-hour signed URL has expired.
 */
export async function getDocumentDownloadUrl(args: {
  documentId: string;
  orgId: string;
}): Promise<{ downloadUrl: string; expiresAt: string }> {
  const doc = await prisma.generatedDocument.findFirst({
    where: { id: args.documentId, orgId: args.orgId, deletedAt: null },
    select: { s3Key: true },
  });
  if (!doc || !doc.s3Key) {
    throw new DocumentGenerationError(
      'Document not found or has no stored file.',
      'NOT_FOUND',
      404,
    );
  }
  const ttlSeconds = 3600;
  const downloadUrl = await getSignedDownloadUrl(doc.s3Key, ttlSeconds);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  return { downloadUrl, expiresAt };
}

/** List current-version documents for the org, one row per template_type. */
export async function listDocuments(orgId: string): Promise<Array<{
  id: string;
  templateType: TemplateId;
  documentName: string;
  regulatoryBasis: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}>> {
  const rows = await prisma.generatedDocument.findMany({
    where: { orgId, isCurrent: true, deletedAt: null },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      templateType: true,
      title: true,
      regulatoryBasis: true,
      version: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    templateType: r.templateType as TemplateId,
    documentName: r.title,
    regulatoryBasis: r.regulatoryBasis,
    version: r.version,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

/** List ALL versions of the (org, template_type) group for the given documentId. */
export async function listVersions(args: {
  documentId: string;
  orgId: string;
}): Promise<Array<{
  id: string;
  version: number;
  isCurrent: boolean;
  createdAt: string;
  s3Key: string | null;
}>> {
  const ref = await prisma.generatedDocument.findFirst({
    where: { id: args.documentId, orgId: args.orgId, deletedAt: null },
    select: { templateType: true },
  });
  if (!ref) {
    throw new DocumentGenerationError(
      'Document not found.',
      'NOT_FOUND',
      404,
    );
  }
  const rows = await prisma.generatedDocument.findMany({
    where: {
      orgId: args.orgId,
      templateType: ref.templateType,
      deletedAt: null,
    },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      isCurrent: true,
      createdAt: true,
      s3Key: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    version: r.version,
    isCurrent: r.isCurrent,
    createdAt: r.createdAt.toISOString(),
    s3Key: r.s3Key,
  }));
}

/** Get a single document with its parsed sections and current download URL. */
export async function getDocument(args: {
  documentId: string;
  orgId: string;
}): Promise<{
  id: string;
  templateType: TemplateId;
  documentName: string;
  regulatoryBasis: string | null;
  version: number;
  isCurrent: boolean;
  content: { sections: GeneratedSection[]; markdown: string };
  formData: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  downloadUrl: string | null;
}> {
  const row = await prisma.generatedDocument.findFirst({
    where: { id: args.documentId, orgId: args.orgId, deletedAt: null },
    select: {
      id: true,
      templateType: true,
      title: true,
      regulatoryBasis: true,
      version: true,
      isCurrent: true,
      content: true,
      formData: true,
      s3Key: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!row) {
    throw new DocumentGenerationError(
      'Document not found.',
      'NOT_FOUND',
      404,
    );
  }
  let downloadUrl: string | null = null;
  if (row.s3Key) {
    try {
      downloadUrl = await getSignedDownloadUrl(row.s3Key, 3600);
    } catch (err) {
      console.error('[documentGeneration] signed URL failed', err);
    }
  }
  const content = (row.content ?? {}) as { sections?: GeneratedSection[]; markdown?: string };
  return {
    id: row.id,
    templateType: row.templateType as TemplateId,
    documentName: row.title,
    regulatoryBasis: row.regulatoryBasis,
    version: row.version,
    isCurrent: row.isCurrent,
    content: {
      sections: content.sections ?? [],
      markdown: content.markdown ?? '',
    },
    formData: (row.formData as Record<string, unknown>) ?? {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    downloadUrl,
  };
}

/** Soft-delete a document. RLS-scoped. */
export async function softDeleteDocument(args: {
  documentId: string;
  orgId: string;
}): Promise<void> {
  const updated = await prisma.generatedDocument.updateMany({
    where: { id: args.documentId, orgId: args.orgId, deletedAt: null },
    data: { deletedAt: new Date(), isCurrent: false },
  });
  if (updated.count === 0) {
    throw new DocumentGenerationError(
      'Document not found.',
      'NOT_FOUND',
      404,
    );
  }
}

// =============================================================================
// Helpers (internal)
// =============================================================================

async function loadPrefillContext(orgId: string, userId: string): Promise<PrefillContext> {
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { name: true, plan: true },
  });
  if (!org) {
    throw new DocumentGenerationError(
      'Organisation not found.',
      'NO_ORG',
      409,
    );
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      productTypes: true,
      targetMarkets: true,
      stage: true,
      teamSize: true,
    },
  });
  return {
    org: { name: org.name, plan: org.plan },
    user: { name: user?.name ?? '', email: user?.email ?? '' },
    profile: {
      productTypes: profile?.productTypes ?? [],
      targetMarkets: profile?.targetMarkets ?? [],
      stage: profile?.stage ?? null,
      teamSize: profile?.teamSize ?? null,
    },
    today: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Resolve a `prefilledFrom` dot-path to a value drawn from the prefill
 * context. Exposed so the prefill-paths-exist test can iterate every
 * template field and assert the path resolves to something defined.
 */
export function resolvePrefill(path: string, ctx: PrefillContext): unknown {
  const segments = path.split('.');
  let cur: unknown = ctx;
  for (const seg of segments) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/** List of valid root keys on the PrefillContext — used by the lint test. */
export const PREFILL_ROOTS = ['org', 'user', 'profile', 'today'] as const;

/**
 * Validate at module-load time that a prefill path can structurally
 * resolve. We use a synthetic shape because the runtime context is
 * not available at template-definition time.
 */
export function validatePrefillPath(path: string): boolean {
  const synth: PrefillContext = {
    org: { name: '', plan: '' },
    user: { name: '', email: '' },
    profile: {
      productTypes: [],
      targetMarkets: [],
      stage: null,
      teamSize: null,
    },
    today: '',
  };
  // The path "today" is a special-case scalar.
  if (path === 'today') return true;
  const segments = path.split('.');
  if (segments.length < 2) return false;
  let cur: unknown = synth;
  for (const seg of segments) {
    if (cur === null || typeof cur !== 'object') return false;
    if (!Object.prototype.hasOwnProperty.call(cur, seg)) return false;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return true;
}

function buildRagQuery(template: DocumentTemplate, formData: Record<string, unknown>): string {
  const fragments: string[] = [
    template.documentName,
    template.regulatoryBasis,
  ];
  // Pull short scalar values from the form for retrieval — keeps the
  // RAG query close to the user's product context.
  for (const f of template.requiredFields) {
    const v = formData[f.key];
    if (typeof v === 'string' && v.length > 0 && v.length < 200) {
      fragments.push(v);
    } else if (Array.isArray(v)) {
      fragments.push(v.filter((x) => typeof x === 'string').join(' '));
    }
  }
  return fragments.join(' — ').slice(0, 1200);
}

async function safeAssembleRag(
  query: string,
  jurisdictions: JurisdictionCode[],
): Promise<string | null> {
  try {
    const chunks = await retrieveRelevantChunks(query, {
      topK: 10,
      jurisdictions,
      minSimilarity: 0.5,
    });
    if (chunks.length === 0) return null;
    const context = assembleContext(chunks, {
      productTypes: [],
      targetMarkets: jurisdictions,
      stage: null,
      readinessScore: null,
    });
    return context.text;
  } catch (err) {
    // RAG fallback — generation still proceeds without context. Log only.
    console.warn(
      '[documentGeneration] RAG retrieval failed; continuing without context:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

function renderUserMessage(
  template: DocumentTemplate,
  formData: Record<string, unknown>,
): string {
  const lines: string[] = [];
  lines.push(`Generate the following document: ${template.documentName}.`);
  lines.push('');
  lines.push('Form values supplied by the user:');
  for (const f of template.requiredFields) {
    const v = formData[f.key];
    const display = formatFieldValue(v);
    lines.push(`* ${f.label} (${f.key}): ${display}`);
  }
  lines.push('');
  lines.push(template.outputInstructions);
  return lines.join('\n');
}

function formatFieldValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'not provided';
  if (Array.isArray(value)) {
    return value.length === 0 ? 'not provided' : value.join(', ');
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  // Anything else (object, function, symbol) is treated as not-provided so
  // we never serialise "[object Object]" into the AI prompt.
  return 'not provided';
}

/**
 * Parse the AI markdown into top-level sections. A "top-level section"
 * is anything introduced by a `## ` heading. Sub-headings (`### `) are
 * preserved inside the body of their parent section.
 */
export function parseSections(markdown: string, regulatoryBasis: string): GeneratedSection[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const sections: GeneratedSection[] = [];
  let currentTitle: string | null = null;
  let currentBody: string[] = [];

  const flush = (): void => {
    if (currentTitle !== null) {
      sections.push({
        title: currentTitle,
        content: currentBody.join('\n').trim(),
        regulatoryBasis,
      });
    }
  };

  for (const line of lines) {
    const m = line.match(/^##\s+(?!#)(.+)$/);
    if (m) {
      flush();
      currentTitle = m[1]!.trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  flush();

  // If no `##` headings at all, treat the whole document as one section.
  if (sections.length === 0 && markdown.trim().length > 0) {
    sections.push({
      title: 'Document',
      content: markdown.trim(),
      regulatoryBasis,
    });
  }
  return sections;
}

// =============================================================================
// .docx rendering — reuses the markdown→docx primitives proven by
// exportDraft.ts (Sprint 3). We do NOT import that file directly because
// its render function is shaped for letter format with letterhead + sign-off,
// whereas template documents have multi-section structure with a footer.
// =============================================================================

interface RenderArgs {
  template: DocumentTemplate;
  companyName: string;
  markdown: string;
}

export async function renderTemplateDocx(args: RenderArgs): Promise<Buffer> {
  const children: Paragraph[] = [];

  // ---- Letterhead -------------------------------------------------------
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [boldRun(args.companyName)],
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${args.template.documentName} — v${1} — Generated ${new Date().toLocaleDateString(
            'en-NG',
            { year: 'numeric', month: 'long', day: 'numeric' },
          )}`,
          italics: true,
          size: 20,
          color: '555555',
        }),
      ],
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Regulatory basis: ${args.template.regulatoryBasis}`,
          italics: true,
          size: 20,
          color: '0B6E6E',
        }),
      ],
      spacing: { after: 320 },
    }),
  );

  // ---- Body -------------------------------------------------------------
  for (const para of parseDraftBody(args.markdown)) {
    children.push(paragraphFromDraftParagraph(para));
  }

  // ---- Footer ----------------------------------------------------------
  children.push(
    new Paragraph({ children: [textRun('')], spacing: { after: 200 } }),
    regulatoryBasisFooter(args.template.regulatoryBasis),
    disclaimerFooter(),
  );

  const document = new Document({
    sections: [{ properties: {}, children }],
  });
  return Packer.toBuffer(document);
}

function paragraphFromDraftParagraph(para: DraftParagraph): Paragraph {
  const runs =
    para.segments.length === 0
      ? [textRun('')]
      : para.segments.map((seg) => segmentToRun(seg, para.isHeading));
  return new Paragraph({
    children: runs,
    spacing: { after: para.isHeading ? 240 : 160 },
    ...(para.isHeading ? { heading: HeadingLevel.HEADING_2 } : {}),
  });
}

function segmentToRun(seg: InlineSegment, paragraphIsHeading: boolean): TextRun {
  return new TextRun({
    text: seg.text,
    bold: seg.bold === true || paragraphIsHeading,
  });
}

function regulatoryBasisFooter(basis: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: `Regulatory basis: ${basis}`,
        italics: true,
        size: 18,
        color: '0B6E6E',
      }),
    ],
    spacing: { after: 120 },
  });
}

function disclaimerFooter(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text:
          'This document was generated with Klarify AI assistance. It is regulatory ' +
          'information, not legal advice. Review and customise with a qualified ' +
          'practitioner before adopting for production use.',
        italics: true,
        size: 18,
        color: '777777',
      }),
    ],
  });
}

function boldRun(t: string): TextRun {
  return new TextRun({ text: t, bold: true });
}
function textRun(t: string): TextRun {
  return new TextRun({ text: t });
}

/**
 * Restrict a string for safe inclusion in an S3 Content-Disposition
 * download filename. Keeps alphanumerics, dash, underscore. Collapses
 * everything else to underscore.
 */
function sanitiseFilenamePart(name: string): string {
  return name.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/_+/g, '_');
}

// =============================================================================
// Re-export the template registry for callers that need to render the
// library UI metadata without importing @klarify/ai directly.
// =============================================================================
export { DOCUMENT_TEMPLATES };
