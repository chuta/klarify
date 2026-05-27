// US-008B — White Paper Analyzer AI service (Opus 4 + RAG).
import {
  getAnthropicClient,
  KLARIFY_BASE_SYSTEM_PROMPT,
  KLARIFY_WHITE_PAPER_ANALYSER_PROMPT,
  getKlarifyModel,
} from '@klarify/ai';
import { retrieveRelevantChunks, assembleContext } from '@klarify/ai/rag';
import type { JurisdictionCode } from '@klarify/ai/rag';
import { classifyAnthropicError } from '@klarify/ai/chat';
import {
  coerceWhitePaperAnalysisResult,
  enforceExitPlanCriticalGap,
  type WhitePaperAnalysisResult,
} from '@klarify/core';
import { prisma } from '../db.js';
import { extractJsonObject } from '../utils/extractJson.js';

export class WhitePaperAnalysisError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NOT_FOUND'
      | 'NO_TEXT'
      | 'UPSTREAM_FAILURE'
      | 'PARSE_FAILED'
      | 'INSUFFICIENT_TEXT',
  ) {
    super(message);
    this.name = 'WhitePaperAnalysisError';
  }
}

export async function analyseWhitePaper(analysisId: string): Promise<WhitePaperAnalysisResult> {
  const row = await prisma.whitePaperAnalysis.findUnique({
    where: { id: analysisId },
    include: { org: true },
  });
  if (!row) {
    throw new WhitePaperAnalysisError(`Analysis ${analysisId} not found.`, 'NOT_FOUND');
  }

  const text = row.extractedText?.trim() ?? '';
  if (text.length < 1000) {
    await markError(analysisId, 'Insufficient text for white paper analysis.');
    throw new WhitePaperAnalysisError('Insufficient extracted text.', 'INSUFFICIENT_TEXT');
  }

  await prisma.whitePaperAnalysis.update({
    where: { id: analysisId },
    data: { status: 'analysing' },
  });

  const sourceJurisdiction = row.sourceJurisdiction as JurisdictionCode | 'OTHER';
  const ragJurisdictions: JurisdictionCode[] = ['NG', 'FATF'];
  if (sourceJurisdiction !== 'OTHER' && sourceJurisdiction !== 'NG') {
    ragJurisdictions.push(sourceJurisdiction as JurisdictionCode);
  }

  const query =
    text.slice(0, 2000) +
    ' SEC Nigeria ARIP white paper disclosure requirements token classification exit plan investor protection AML custody';

  const chunks = await retrieveRelevantChunks(query, {
    topK: 12,
    jurisdictions: ragJurisdictions,
    minSimilarity: 0.5,
  });

  const ragContext = assembleContext(chunks, {
    productTypes: [],
    targetMarkets: ['NG'],
    stage: null,
    readinessScore: null,
  });

  const metadataBlock = [
    `Source jurisdiction: ${row.sourceJurisdiction}`,
    `Licence category sought in Nigeria: ${row.licenceCategorySought}`,
    row.existingSourceLicence
      ? `Existing licence in source market: ${row.existingSourceLicence}`
      : null,
    `Company: ${row.org.name}`,
  ]
    .filter(Boolean)
    .join('\n');

  const userMessage = `Analyse the following white paper against SEC Nigeria ARIP requirements.

SOURCE JURISDICTION: ${row.sourceJurisdiction}
LICENCE CATEGORY SOUGHT (Nigeria): ${row.licenceCategorySought}
${row.existingSourceLicence ? `EXISTING SOURCE LICENCE: ${row.existingSourceLicence}` : ''}

--- WHITE PAPER TEXT START ---
${text.slice(0, 120_000)}
--- WHITE PAPER TEXT END ---

Return the JSON gap report and draft outline as specified.`;

  const model = getKlarifyModel('architect');
  const client = getAnthropicClient();

  let rawResponse: string;
  let stopReason: string | null = null;
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 16_000,
      temperature: 0,
      system: `${KLARIFY_BASE_SYSTEM_PROMPT}\n\n${KLARIFY_WHITE_PAPER_ANALYSER_PROMPT}\n\n${ragContext.text}\n\nAnalysis metadata:\n${metadataBlock}`,
      messages: [{ role: 'user', content: userMessage }],
    });
    stopReason = response.stop_reason;
    const textBlock = response.content.find((b) => b.type === 'text');
    rawResponse = textBlock && textBlock.type === 'text' ? textBlock.text : '';
  } catch (err) {
    const classified = classifyAnthropicError(err);
    await markError(analysisId, classified.message);
    throw new WhitePaperAnalysisError(classified.message, 'UPSTREAM_FAILURE');
  }

  if (!rawResponse.trim()) {
    await markError(analysisId, 'Klarify received an empty analysis response. Please try again.');
    throw new WhitePaperAnalysisError('Empty model response.', 'PARSE_FAILED');
  }

  if (stopReason === 'max_tokens') {
    console.warn('[whitePaperAnalysis] response truncated at max_tokens for %s', analysisId);
  }

  let result: WhitePaperAnalysisResult;
  try {
    const parsed = extractJsonObject(rawResponse);
    const coerced = coerceWhitePaperAnalysisResult({
      ...(typeof parsed === 'object' && parsed !== null ? parsed : {}),
      source_jurisdiction: row.sourceJurisdiction,
      licence_category_sought: row.licenceCategorySought,
      existing_source_licence: row.existingSourceLicence,
    });
    result = enforceExitPlanCriticalGap(coerced);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(
      '[whitePaperAnalysis] parse failed for %s (stop=%s): %s\npreview: %s',
      analysisId,
      stopReason,
      detail,
      rawResponse.slice(0, 500),
    );
    const userFacingError =
      stopReason === 'max_tokens'
        ? 'The analysis was too large to complete in one pass. Try again with a shorter document, or paste the core sections only.'
        : 'Klarify could not interpret the white paper analysis. Please try again.';
    await markError(analysisId, userFacingError);
    throw new WhitePaperAnalysisError('Parse failed.', 'PARSE_FAILED');
  }

  const adequateCount = result.sections_adequate_count;

  await prisma.whitePaperAnalysis.update({
    where: { id: analysisId },
    data: {
      result: result as object,
      completenessPct: result.completeness_pct,
      sectionsAdequate: adequateCount,
      status: 'complete',
      analysedAt: new Date(),
    },
  });

  return result;
}

async function markError(analysisId: string, message: string): Promise<void> {
  await prisma.whitePaperAnalysis.update({
    where: { id: analysisId },
    data: { status: 'error', errorMessage: message },
  });
}
