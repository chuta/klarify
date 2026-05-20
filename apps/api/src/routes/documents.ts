// Document routes — analysis notification via Resend (Sprint 3 S3-C1).
import { Hono } from 'hono';
import { prisma } from '../db.js';
import { requireAuth, type AuthVars } from '../middleware/auth.js';
import {
  notifyDocumentAnalysisComplete,
  type StoredDocumentAnalysis,
} from '../services/documentAnalysisNotify.js';

export const documentRoutes = new Hono<{ Variables: AuthVars }>();

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
