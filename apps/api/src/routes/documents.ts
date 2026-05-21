// =============================================================================
// Document Analyser routes (Sprint 3 — S3-A1, S3-B1, S3-C1).
//
//   POST /api/documents/upload           multipart file upload (S3-A1)
//   GET  /api/documents/:id/status       poll status (S3-A1)
//   GET  /api/documents/:id              full document record (S3-B1)
//   POST /api/documents/:id/notify-analysis  resend email manually (S3-C1)
//
// Future endpoints registered in their own files for clarity:
//   POST /api/documents/analyse          — S3-B1 (paste-text fast path)
//   POST /api/documents/:id/export-draft — S3-B3 (.docx export)
// =============================================================================
import { Buffer } from 'node:buffer';
import { Hono } from 'hono';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { requireAuth, type AuthVars } from '../middleware/auth.js';
import {
  rateLimitDocumentAnalyses,
  type DocumentAnalysisRateLimitVars,
} from '../middleware/rateLimitDocumentAnalyses.js';
import {
  notifyDocumentAnalysisComplete,
  type StoredDocumentAnalysis,
} from '../services/documentAnalysisNotify.js';
import {
  uploadDocument,
  createPastedDocument,
  DocumentUploadError,
  MAX_FILE_BYTES,
} from '../services/documentUpload.js';
import { enqueueAnalysis } from '../services/analysisQueue.js';
import {
  exportDraftAsDocx,
  ExportDraftError,
} from '../services/exportDraft.js';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export const documentRoutes = new Hono<{ Variables: AuthVars & Partial<DocumentAnalysisRateLimitVars> }>();

/**
 * POST /api/documents/:id/notify-analysis
 *
 * Sends the document-analysis completion email (CRITICAL/HIGH or MEDIUM/LOW)
 * for an uploaded document that has finished AI analysis. Idempotent via
 * Resend idempotency key `doc-analysis:{documentId}`.
 *
 * Intended to be called by the analysis queue when status becomes `complete`.
 * Can also be invoked manually after analysis for testing.
 */
/**
 * POST /api/documents/upload — multipart upload (S3-A1).
 *
 * Body (multipart/form-data):
 *   file (required)            the document to analyse (PDF or image)
 *
 * Response (202 Accepted):
 *   {
 *     success: true,
 *     data: {
 *       documentId,
 *       status: 'pending',
 *       pollUrl: '/api/documents/{id}/status'
 *     }
 *   }
 *
 * The analysis itself runs asynchronously — the client polls pollUrl
 * every 2s until status becomes 'complete' or 'error'.
 */
documentRoutes.post('/upload', requireAuth, rateLimitDocumentAnalyses, async (c) => {
  const userId = c.get('userId');

  // Resolve the user's org. Multi-org users get their most-recent
  // membership — same convention as the chat endpoint.
  const orgId = await resolveOrgId(userId);
  if (!orgId) {
    return c.json(
      {
        success: false as const,
        error: 'No organisation found for this user. Complete onboarding first.',
        code: 'NO_ORG',
      },
      409,
    );
  }

  // Parse the multipart body. Hono uses the Web FormData API under the hood
  // which materialises the file in memory — fine for our 10 MB cap.
  let form: Record<string, string | File>;
  try {
    form = (await c.req.parseBody()) as Record<string, string | File>;
  } catch (err) {
    console.error('[documents/upload] parseBody failed', err);
    return c.json(
      {
        success: false as const,
        error: 'Could not read the uploaded file. Please try again.',
        code: 'INVALID_MULTIPART',
      },
      400,
    );
  }

  const file = form['file'];
  if (!file || typeof file === 'string') {
    return c.json(
      {
        success: false as const,
        error: 'No file was attached. Include the document as the "file" field.',
        code: 'MISSING_FILE',
      },
      400,
    );
  }

  // Convert Web File → Buffer for the upload service.
  let bytes: Buffer;
  try {
    bytes = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    console.error('[documents/upload] arrayBuffer failed', err);
    return c.json(
      {
        success: false as const,
        error: 'Could not read the file contents.',
        code: 'READ_FAILED',
      },
      400,
    );
  }

  // Pre-flight size check before we reach the upload service. This catches
  // the common case where a client streamed >10MB and the multipart parser
  // bailed; the service itself is the authoritative check.
  if (bytes.length > MAX_FILE_BYTES) {
    return c.json(
      {
        success: false as const,
        error: `File is too large. Maximum size is ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)} MB.`,
        code: 'FILE_TOO_LARGE',
      },
      413,
    );
  }

  try {
    const result = await uploadDocument({
      userId,
      orgId,
      originalFilename: file.name ?? 'document',
      contentType: file.type ?? 'application/octet-stream',
      bytes,
    });

    // Kick off the analysis pipeline (extraction → analysis → notify).
    // Fire-and-forget — the queue updates `status` so the client sees
    // progress via the polling endpoint.
    enqueueAnalysis(result.documentId).catch((err) => {
      console.error('[documents/upload] enqueueAnalysis failed', err);
    });

    // Quota tick — only AFTER the row is durably created. A 4xx upload
    // rejection (size/type) above has already short-circuited and never
    // reaches this line, so the free-plan gate never burns a token on
    // a request that wasn't actually analysed.
    const consume = c.get('consumeDocumentAnalysisToken');
    if (consume) await consume();

    return c.json(
      {
        success: true as const,
        data: {
          documentId: result.documentId,
          status: result.status,
          filename: result.displayFilename,
          pollUrl: `/api/documents/${result.documentId}/status`,
        },
      },
      202,
    );
  } catch (err) {
    if (err instanceof DocumentUploadError) {
      return c.json(
        {
          success: false as const,
          error: err.message,
          code: err.code,
        },
        err.httpStatus as 400 | 413 | 415,
      );
    }
    console.error('[documents/upload] unexpected error', err);
    return c.json(
      {
        success: false as const,
        error: 'Klarify could not save your document. Please try again.',
        code: 'UPLOAD_FAILED',
      },
      500,
    );
  }
});

/**
 * GET /api/documents/:id/status — lightweight poll endpoint (S3-A1).
 *
 * Returns just the columns the processing-stepper UI needs. Cheap to call
 * every 2s while a document is being analysed.
 */
documentRoutes.get('/:id/status', requireAuth, async (c) => {
  const userId = c.get('userId');
  const documentId = c.req.param('id');

  const doc = await prisma.uploadedDocument.findFirst({
    where: { id: documentId, userId },
    select: {
      id: true,
      status: true,
      filename: true,
      urgencyLevel: true,
      errorMessage: true,
      uploadedAt: true,
      ocrCompletedAt: true,
      analysedAt: true,
    },
  });

  if (!doc) {
    return c.json(
      {
        success: false as const,
        error: 'Document not found.',
        code: 'DOCUMENT_NOT_FOUND',
      },
      404,
    );
  }

  return c.json({
    success: true as const,
    data: {
      id: doc.id,
      status: doc.status,
      filename: doc.filename,
      urgencyLevel: doc.urgencyLevel,
      errorMessage: doc.errorMessage,
      uploadedAt: doc.uploadedAt.toISOString(),
      ocrCompletedAt: doc.ocrCompletedAt?.toISOString() ?? null,
      analysedAt: doc.analysedAt?.toISOString() ?? null,
    },
  });
});

/**
 * POST /api/documents/analyse — paste-text fast path (S3-B1).
 *
 * Skips upload + OCR entirely. Persists an `uploaded_documents` row in the
 * `analysing` state with `ocr_method='paste'`, then enqueues the analyser.
 *
 * Body: { text: string (min 100, max 200_000) }
 */
documentRoutes.post(
  '/analyse',
  requireAuth,
  rateLimitDocumentAnalyses,
  zValidator(
    'json',
    z.object({
      text: z.string().min(100, 'Please paste at least 100 characters.'),
    }),
  ),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');
    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return c.json(
        {
          success: false as const,
          error: 'No organisation found for this user. Complete onboarding first.',
          code: 'NO_ORG',
        },
        409,
      );
    }
    try {
      const { documentId } = await createPastedDocument({
        userId,
        orgId,
        text: body.text,
      });
      enqueueAnalysis(documentId).catch((err) => {
        console.error('[documents/analyse] enqueueAnalysis failed', err);
      });

      // Quota tick — paste-text is a fresh analysis, charge once.
      const consume = c.get('consumeDocumentAnalysisToken');
      if (consume) await consume();

      return c.json(
        {
          success: true as const,
          data: {
            documentId,
            status: 'analysing' as const,
            pollUrl: `/api/documents/${documentId}/status`,
          },
        },
        202,
      );
    } catch (err) {
      if (err instanceof DocumentUploadError) {
        return c.json(
          {
            success: false as const,
            error: err.message,
            code: err.code,
          },
          err.httpStatus as 400 | 413,
        );
      }
      console.error('[documents/analyse] unexpected error', err);
      return c.json(
        {
          success: false as const,
          error: 'Klarify could not start analysis. Please try again.',
          code: 'ANALYSE_FAILED',
        },
        500,
      );
    }
  },
);

/**
 * GET /api/documents/:id — full document record (S3-B1).
 *
 * Returns analysis_result, action_plan, draft_response — everything the
 * results-page UI needs in one round-trip. RLS scoped to the caller.
 */
documentRoutes.get('/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const documentId = c.req.param('id');
  const doc = await prisma.uploadedDocument.findFirst({
    where: { id: documentId, userId },
    select: {
      id: true,
      filename: true,
      fileType: true,
      fileSize: true,
      status: true,
      urgencyLevel: true,
      errorMessage: true,
      ocrMethod: true,
      analysisResult: true,
      actionItems: true,
      draftResponse: true,
      uploadedAt: true,
      ocrCompletedAt: true,
      analysedAt: true,
    },
  });
  if (!doc) {
    return c.json(
      {
        success: false as const,
        error: 'Document not found.',
        code: 'DOCUMENT_NOT_FOUND',
      },
      404,
    );
  }
  return c.json({
    success: true as const,
    data: {
      ...doc,
      uploadedAt: doc.uploadedAt.toISOString(),
      ocrCompletedAt: doc.ocrCompletedAt?.toISOString() ?? null,
      analysedAt: doc.analysedAt?.toISOString() ?? null,
    },
  });
});

/**
 * POST /api/documents/:id/export-draft — render the draft response as .docx (S3-B3).
 *
 * Streams nothing back through the API itself. We render the docx, upload
 * it to S3 under {orgId}/{userId}/drafts/, then return a 1-hour signed URL.
 * The client redirects the browser at that URL — S3 streams the bytes
 * directly, bypassing our API server.
 *
 * Optional body: { body: string }
 *
 *   When the user has edited the AI draft in the TinyMCE editor, the client
 *   sends the current (markdown) draft body here. The exporter uses this
 *   instead of the stored AI draft. We DO NOT persist the override to the
 *   database — multiple exports of different edits should each render
 *   independently, and we don't want one user's edits to overwrite the
 *   original AI draft visible elsewhere. Persisting edits is a separate
 *   product feature with its own audit story.
 *
 * The body is optional + size-capped (32 KB) — large enough for any
 * regulator letter, small enough to avoid abuse.
 */
const exportDraftBodySchema = z
  .object({
    body: z.string().max(32_000).optional(),
  })
  .optional();

documentRoutes.post('/:id/export-draft', requireAuth, async (c) => {
  const userId = c.get('userId');
  const documentId = c.req.param('id');

  // Body is optional — parse defensively. A missing/empty body just means
  // "export the stored AI draft as-is" (the legacy behaviour).
  let overrideBody: string | undefined;
  try {
    const contentType = c.req.header('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const raw = await c.req.json().catch(() => undefined);
      const parsed = exportDraftBodySchema.safeParse(raw);
      if (parsed.success && parsed.data?.body && parsed.data.body.trim().length > 0) {
        overrideBody = parsed.data.body;
      }
    }
  } catch (err) {
    console.error('[documents/export-draft] body parse failed', err);
  }

  try {
    const result = await exportDraftAsDocx(documentId, userId, {
      overrideBody,
    });
    return c.json({
      success: true as const,
      data: {
        downloadUrl: result.downloadUrl,
        expiresAt: result.expiresAt,
      },
    });
  } catch (err) {
    if (err instanceof ExportDraftError) {
      return c.json(
        {
          success: false as const,
          error: err.message,
          code: err.code,
        },
        err.httpStatus as 404 | 409,
      );
    }
    console.error('[documents/export-draft] unexpected error', err);
    return c.json(
      {
        success: false as const,
        error: 'Klarify could not export the draft. Please try again.',
        code: 'EXPORT_FAILED',
      },
      500,
    );
  }
});

/**
 * Resolve the user's "active" organisation — most-recently-joined wins.
 * Sets the RLS GUC so subsequent queries in the same connection see the
 * right rows. Returns null if the user has no org yet.
 */
async function resolveOrgId(userId: string): Promise<string | null> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true)`,
      userId,
    );
    const membership = await tx.orgMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { orgId: true },
    });
    return membership?.orgId ?? null;
  });
}

documentRoutes.post('/:id/notify-analysis', requireAuth, async (c) => {
  const userId = c.get('userId');
  const documentId = c.req.param('id');

  try {
    const doc = await prisma.uploadedDocument.findFirst({
      where: { id: documentId, userId },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    if (!doc) {
      return c.json(
        {
          success: false as const,
          error: 'Document not found.',
          code: 'DOCUMENT_NOT_FOUND',
        },
        404,
      );
    }

    if (!doc.analysedAt && !doc.analysisResult) {
      return c.json(
        {
          success: false as const,
          error: 'Analysis is not complete yet. Try again when status is complete.',
          code: 'ANALYSIS_INCOMPLETE',
        },
        422,
      );
    }

    const { sent, result } = await notifyDocumentAnalysisComplete({
      documentId: doc.id,
      recipientEmail: doc.user.email,
      recipientName: doc.user.name ?? doc.user.email,
      filename: doc.filename,
      urgencyLevel: doc.urgencyLevel,
      analysisResult: doc.analysisResult as StoredDocumentAnalysis | null,
    });

    if (!sent) {
      return c.json({
        success: true as const,
        data: {
          emailed: false,
          reason: 'No notification template for this urgency level.',
          urgencyLevel: doc.urgencyLevel,
        },
      });
    }

    if (!result?.success) {
      return c.json(
        {
          success: false as const,
          error: result?.error ?? 'Failed to send analysis notification email.',
          code: 'EMAIL_SEND_FAILED',
        },
        503,
      );
    }

    return c.json({
      success: true as const,
      data: {
        emailed: true,
        resendId: result.id,
        urgencyLevel: doc.urgencyLevel,
      },
    });
  } catch (err) {
    console.error('[documents/notify-analysis] error', err);
    return c.json(
      {
        success: false as const,
        error: 'Could not send analysis notification.',
        code: 'NOTIFY_ERROR',
      },
      500,
    );
  }
});
