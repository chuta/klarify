// =============================================================================
// Document analysis queue (CLAUDE.md S3-A1, S3-B1, S3-C1).
//
// Pipeline:
//   1. extractText(documentId)             → status: extracting → analysing
//   2. analyseDocument(documentId)         → status: analysing  → complete (or error)
//   3. notifyDocumentAnalysisComplete(...) → Resend email per urgency
//
// Implementation note: this is a simple in-process queue. We schedule the
// pipeline on `setImmediate` so the HTTP handler returns 202 promptly while
// the work runs on the next tick. Concurrency is unbounded for now — for
// MVP traffic that's fine; we'll swap to BullMQ + Redis if upload volume
// grows past the single-instance ceiling (CLAUDE.md §17 "Sprint 3" note:
// upgrade to BullMQ in V1.1 if needed).
//
// Status transitions are written by the underlying services (extractText
// in documentOcr.ts, analyseDocument in documentAnalysis.ts) so the
// polling endpoint stays consistent even if the queue itself fails
// halfway.
// =============================================================================
import { prisma } from '../db.js';
import { extractText, OcrError } from './documentOcr.js';
import {
  analyseDocument,
  DocumentAnalysisError,
} from './documentAnalysis.js';
import {
  notifyDocumentAnalysisComplete,
  type StoredDocumentAnalysis,
} from './documentAnalysisNotify.js';

/**
 * Schedule the full analysis pipeline for a document. Returns immediately —
 * the caller does not wait. Errors are captured into `status='error'` and
 * `error_message` on the document row so the polling UI can surface them.
 */
export async function enqueueAnalysis(documentId: string): Promise<void> {
  // setImmediate so the HTTP response can flush before we hit the CPU /
  // network. Without this an upload would block on the slow Textract path
  // before the client gets the 202.
  setImmediate(() => {
    void runPipeline(documentId).catch((err) => {
      console.error('[analysisQueue] uncaught pipeline error', documentId, err);
    });
  });
}

async function runPipeline(documentId: string): Promise<void> {
  // Stage 1 — OCR
  try {
    await extractText(documentId);
  } catch (err) {
    // extractText already wrote status='error' + error_message — just log.
    if (err instanceof OcrError) {
      console.warn(
        '[analysisQueue] OCR failed for %s: %s',
        documentId,
        err.message,
      );
    } else {
      console.error('[analysisQueue] OCR threw for %s', documentId, err);
    }
    return;
  }

  // Stage 2 — Analysis
  try {
    await analyseDocument(documentId);
  } catch (err) {
    if (err instanceof DocumentAnalysisError) {
      console.warn(
        '[analysisQueue] analysis failed for %s: %s',
        documentId,
        err.message,
      );
    } else {
      console.error('[analysisQueue] analysis threw for %s', documentId, err);
    }
    return;
  }

  // Stage 3 — Notify (Resend)
  try {
    const doc = await prisma.uploadedDocument.findUnique({
      where: { id: documentId },
      include: { user: { select: { email: true, name: true } } },
    });
    if (!doc) return;
    if (doc.status !== 'complete') return;
    await notifyDocumentAnalysisComplete({
      documentId: doc.id,
      recipientEmail: doc.user.email,
      recipientName: doc.user.name ?? doc.user.email,
      filename: doc.filename,
      urgencyLevel: doc.urgencyLevel,
      analysisResult: doc.analysisResult as StoredDocumentAnalysis | null,
    });
  } catch (err) {
    // Notification failure is non-fatal — the analysis succeeded and is
    // visible in the dashboard. Log so ops can investigate Resend issues.
    console.error('[analysisQueue] notify failed for %s', documentId, err);
  }
}
