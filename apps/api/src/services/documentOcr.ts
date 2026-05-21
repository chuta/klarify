// =============================================================================
// OCR / text-extraction service (CLAUDE.md S3-A1).
//
// Pipeline:
//   1. Load the file from S3 into a Buffer (never to disk — security + cost).
//   2. If PDF: try `pdf-parse` first. Native PDF text extraction is ~50x
//      cheaper than Textract and ~10x faster. If it returns < 100 chars
//      we treat it as a scanned PDF and fall back to Textract.
//   3. If image (JPG/PNG/WEBP) or fallback: AWS Textract `DetectDocumentText`.
//
// Persists `extracted_text`, `ocr_method`, `ocr_completed_at` and advances
// the document status from 'extracting' to 'analysing'. The analysis queue
// picks up the row after this returns.
// =============================================================================
import { Buffer } from 'node:buffer';
import { Prisma } from '@prisma/client';
import {
  TextractClient,
  DetectDocumentTextCommand,
  type Block,
} from '@aws-sdk/client-textract';
import pdfParse from 'pdf-parse';
import { prisma } from '../db.js';
import { getObjectBuffer } from './s3.js';

/** Minimum char count from pdf-parse before we fall back to Textract. */
const PDF_PARSE_MIN_CHARS = 100;

/** Hard ceiling on text we'll persist. Claude context budget is ~100k tokens. */
const MAX_TEXT_CHARS = 400_000;

let textractClient: TextractClient | null = null;

function getTextractClient(): TextractClient {
  if (!textractClient) {
    const region =
      process.env.AWS_TEXTRACT_REGION ?? process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS Textract credentials missing — set AWS_TEXTRACT_REGION (or AWS_REGION), AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.',
      );
    }
    textractClient = new TextractClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return textractClient;
}

export type OcrMethod = 'pdf-parse' | 'textract' | 'paste';

export interface OcrResult {
  text: string;
  method: OcrMethod;
}

export class OcrError extends Error {
  constructor(
    message: string,
    public readonly code: 'OCR_FAILED' | 'EMPTY_TEXT' | 'UNSUPPORTED',
  ) {
    super(message);
    this.name = 'OcrError';
  }
}

/**
 * Extract text from an uploaded document. Updates the row in-place:
 *   * status: 'extracting' → 'analysing' (on success) or 'error' (on failure)
 *   * extracted_text, ocr_method, ocr_completed_at on success
 *   * error_message on failure
 *
 * If `ocr_method` is already `'paste'`, this is a no-op: the text was
 * supplied directly at upload time and is already in `extracted_text`.
 *
 * Returns the extracted text. Throws OcrError on hard failures so the
 * caller (analysis queue) can record `status='error'`.
 */
export async function extractText(documentId: string): Promise<OcrResult> {
  // Load the document. We use the service connection here (no RLS
  // scoping) because the queue is system-side; the request-side path
  // through the API still enforces RLS.
  const doc = await prisma.uploadedDocument.findUnique({
    where: { id: documentId },
  });
  if (!doc) throw new OcrError(`Document ${documentId} not found.`, 'OCR_FAILED');

  // Paste-text fast path: text already extracted, nothing to do.
  if (doc.ocrMethod === 'paste' && doc.extractedText) {
    return { text: doc.extractedText, method: 'paste' };
  }

  // Advance status before the long-running OCR call so the polling UI
  // shows "Extracting text…" promptly.
  await prisma.uploadedDocument.update({
    where: { id: documentId },
    data: { status: 'extracting' },
  });

  let result: OcrResult;
  try {
    const buffer = await getObjectBuffer(doc.s3Key);
    const mime = (doc.fileType ?? '').toLowerCase();
    result = await extractFromBuffer(buffer, mime);
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Could not extract text from this document.';
    await prisma.uploadedDocument.update({
      where: { id: documentId },
      data: { status: 'error', errorMessage: friendlyOcrError(message) },
    });
    throw err instanceof OcrError
      ? err
      : new OcrError(message, 'OCR_FAILED');
  }

  // Truncate defensively — if a PDF unexpectedly contains a 5 MB book of
  // appendices, we still produce a useful analysis on the first 400k chars.
  const trimmed =
    result.text.length > MAX_TEXT_CHARS
      ? result.text.slice(0, MAX_TEXT_CHARS)
      : result.text;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.uploadedDocument.update({
      where: { id: documentId },
      data: {
        extractedText: trimmed,
        ocrMethod: result.method,
        ocrCompletedAt: new Date(),
        status: 'analysing',
      },
    });
  });

  return { text: trimmed, method: result.method };
}

/**
 * Pure function: given a file buffer + mime, return text + method used.
 *
 * Exposed for unit tests so we can verify routing logic without S3.
 */
export async function extractFromBuffer(
  buffer: Buffer,
  mime: string,
): Promise<OcrResult> {
  const isPdf = mime === 'application/pdf';
  const isImage =
    mime === 'image/jpeg' ||
    mime === 'image/jpg' ||
    mime === 'image/png' ||
    mime === 'image/webp';

  if (!isPdf && !isImage) {
    throw new OcrError(`Unsupported file type for OCR: ${mime}`, 'UNSUPPORTED');
  }

  if (isPdf) {
    const pdfText = await tryPdfParse(buffer);
    if (pdfText && pdfText.length >= PDF_PARSE_MIN_CHARS) {
      return { text: pdfText, method: 'pdf-parse' };
    }
    // Scanned PDF — fall through to Textract.
  }

  const textractText = await runTextract(buffer);
  if (!textractText || textractText.trim().length === 0) {
    throw new OcrError(
      'Could not extract any readable text. Try a clearer scan or paste the document text instead.',
      'EMPTY_TEXT',
    );
  }
  return { text: textractText, method: 'textract' };
}

/**
 * Run `pdf-parse` on a PDF buffer. Returns the cleaned text, or `null`
 * if parsing failed (we'll fall back to Textract).
 *
 * Cleaning:
 *   * Collapse runs of blank lines (PDFs over-paginate)
 *   * Strip soft-hyphens and form-feeds
 *   * Preserve paragraph structure (single newlines stay)
 */
async function tryPdfParse(buffer: Buffer): Promise<string | null> {
  try {
    const result = await pdfParse(buffer);
    return cleanExtractedText(result.text);
  } catch {
    return null;
  }
}

/**
 * Run AWS Textract `DetectDocumentText` synchronously on an in-memory
 * document (≤ 10 MB and ≤ 1 page for the sync API; the queue catches
 * over-limit errors and records them as `status='error'`).
 *
 * Concatenates LINE blocks in document order; preserves line breaks.
 */
async function runTextract(buffer: Buffer): Promise<string> {
  const client = getTextractClient();
  const command = new DetectDocumentTextCommand({
    Document: { Bytes: buffer },
  });
  const response = await client.send(command);
  const lines = (response.Blocks ?? [])
    .filter((b: Block) => b.BlockType === 'LINE' && typeof b.Text === 'string')
    .map((b: Block) => b.Text as string);
  return cleanExtractedText(lines.join('\n'));
}

function cleanExtractedText(raw: string): string {
  return raw
    // Soft hyphens at line breaks — common in PDF layouts.
    .replace(/\u00ad\n?/g, '')
    // Form-feed paginators.
    .replace(/\f/g, '\n')
    // Tab → space.
    .replace(/\t/g, ' ')
    // Collapse 3+ blank lines into a paragraph break.
    .replace(/\n{3,}/g, '\n\n')
    // Trim trailing whitespace per line.
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim();
}

/**
 * Translate raw AWS / pdf-parse errors into copy a user can act on.
 * Stored in `uploaded_documents.error_message` and rendered by the UI.
 */
function friendlyOcrError(rawMessage: string): string {
  const m = rawMessage.toLowerCase();
  if (m.includes('unsupporteddocument') || m.includes('invalidparameter')) {
    return 'Klarify could not read this file. Please make sure it is a clear PDF or photo and try again.';
  }
  if (m.includes('documenttoolarge')) {
    return 'The document is larger than the OCR service can handle. Please split it into smaller files.';
  }
  if (m.includes('throttlingexception') || m.includes('toomanyrequests')) {
    return 'Klarify is processing a lot of documents right now. Please try again in a minute.';
  }
  return 'Klarify could not extract text from this document. Try a clearer scan or paste the document text instead.';
}
