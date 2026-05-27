// US-008B — OCR for white paper analyses (reuses documentOcr extractFromBuffer).
import { prisma } from '../db.js';
import { getObjectBuffer } from './s3.js';
import { extractFromBuffer, type OcrResult, OcrError } from './documentOcr.js';

const MAX_TEXT_CHARS = 400_000;
const MIN_TEXT_CHARS = 1000;

export class WhitePaperOcrError extends Error {
  constructor(
    message: string,
    public readonly code: 'OCR_FAILED' | 'INSUFFICIENT_TEXT' | 'NOT_FOUND',
  ) {
    super(message);
    this.name = 'WhitePaperOcrError';
  }
}

export async function extractWhitePaperText(analysisId: string): Promise<OcrResult> {
  const row = await prisma.whitePaperAnalysis.findUnique({
    where: { id: analysisId },
  });
  if (!row) {
    throw new WhitePaperOcrError(`Analysis ${analysisId} not found.`, 'NOT_FOUND');
  }

  if (row.ocrMethod === 'paste' && row.extractedText) {
    return { text: row.extractedText, method: 'paste' };
  }

  await prisma.whitePaperAnalysis.update({
    where: { id: analysisId },
    data: { status: 'extracting' },
  });

  let result: OcrResult;
  try {
    if (!row.s3Key) {
      throw new WhitePaperOcrError('No file stored for this analysis.', 'OCR_FAILED');
    }
    const buffer = await getObjectBuffer(row.s3Key);
    const mime = (row.fileType ?? '').toLowerCase();
    result = await extractFromBuffer(buffer, mime);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Could not extract text from this white paper.';
    await prisma.whitePaperAnalysis.update({
      where: { id: analysisId },
      data: {
        status: 'error',
        errorMessage: message,
      },
    });
    throw err instanceof OcrError
      ? new WhitePaperOcrError(message, 'OCR_FAILED')
      : new WhitePaperOcrError(message, 'OCR_FAILED');
  }

  const trimmed =
    result.text.length > MAX_TEXT_CHARS ? result.text.slice(0, MAX_TEXT_CHARS) : result.text;

  if (trimmed.trim().length < MIN_TEXT_CHARS) {
    const msg =
      "This document doesn't contain enough text for analysis. Try a clearer PDF or paste the full white paper.";
    await prisma.whitePaperAnalysis.update({
      where: { id: analysisId },
      data: { status: 'error', errorMessage: msg },
    });
    throw new WhitePaperOcrError(msg, 'INSUFFICIENT_TEXT');
  }

  await prisma.whitePaperAnalysis.update({
    where: { id: analysisId },
    data: {
      extractedText: trimmed,
      ocrMethod: result.method,
      ocrCompletedAt: new Date(),
      status: 'analysing',
    },
  });

  return { text: trimmed, method: result.method };
}
