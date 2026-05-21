// =============================================================================
// Document Generator routes (Sprint 4 — S4-B1d, US-008).
//
// Mounted under /api/documents — coexists with the Sprint 3 analyser routes
// in `routes/documents.ts`. Endpoints:
//
//   GET  /api/documents/templates              → list of all 9 templates' metadata
//   GET  /api/documents/generated              → current version per template_type for org
//   GET  /api/documents/generated/:id          → single doc + parsed sections + download
//   GET  /api/documents/generated/:id/versions → all versions for the (org, template)
//   POST /api/documents/generate               → create a new document
//   POST /api/documents/generated/:id/regenerate → bump version, replay pipeline
//   DELETE /api/documents/generated/:id        → soft delete
//
// All endpoints require auth + org membership. Generation + regeneration
// additionally pass through `rateLimitDocumentTemplates`.
// =============================================================================
import { Hono } from 'hono';
import type { Prisma } from '@prisma/client';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { listTemplates } from '@klarify/ai/prompts/documents';
import { prisma } from '../../db.js';
import { requireAuth, type AuthVars } from '../../middleware/auth.js';
import {
  rateLimitDocumentTemplates,
  type DocumentTemplateRateLimitVars,
} from '../../middleware/rateLimitDocumentTemplates.js';
import {
  DocumentGenerationError,
  generateDocument,
  getDocument,
  listDocuments,
  listVersions,
  regenerateDocument,
  softDeleteDocument,
  getDocumentDownloadUrl,
} from '../../services/documentGeneration.js';

export const documentGeneratorRoutes = new Hono<{
  Variables: AuthVars & Partial<DocumentTemplateRateLimitVars>;
}>();

// -----------------------------------------------------------------------------
// GET /templates — public template metadata for the library UI.
// -----------------------------------------------------------------------------
documentGeneratorRoutes.get('/templates', requireAuth, (c) => {
  const templates = listTemplates().map((t) => ({
    templateId: t.templateId,
    documentName: t.documentName,
    regulatoryBasis: t.regulatoryBasis,
    category: t.category,
    requiredFields: t.requiredFields.map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      helpText: f.helpText,
      options: f.options ?? null,
      prefilledFrom: f.prefilledFrom ?? null,
    })),
  }));
  return c.json({ success: true as const, data: { templates } });
});

// -----------------------------------------------------------------------------
// GET /generated — current generated docs (one row per template_type).
// -----------------------------------------------------------------------------
documentGeneratorRoutes.get('/generated', requireAuth, async (c) => {
  const userId = c.get('userId');
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
    const rows = await listDocuments(orgId);
    return c.json({ success: true as const, data: { documents: rows } });
  } catch (err) {
    return handleGenerationError(c, err, 'list-generated');
  }
});

// -----------------------------------------------------------------------------
// GET /generated/:id — single doc.
// -----------------------------------------------------------------------------
documentGeneratorRoutes.get('/generated/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const orgId = await resolveOrgId(userId);
  if (!orgId) {
    return c.json(
      { success: false as const, error: 'No organisation found.', code: 'NO_ORG' },
      409,
    );
  }
  try {
    const doc = await getDocument({
      documentId: c.req.param('id'),
      orgId,
    });
    return c.json({ success: true as const, data: doc });
  } catch (err) {
    return handleGenerationError(c, err, 'get-generated');
  }
});

// -----------------------------------------------------------------------------
// GET /generated/:id/versions — full version history for the template group.
// -----------------------------------------------------------------------------
documentGeneratorRoutes.get('/generated/:id/versions', requireAuth, async (c) => {
  const userId = c.get('userId');
  const orgId = await resolveOrgId(userId);
  if (!orgId) {
    return c.json(
      { success: false as const, error: 'No organisation found.', code: 'NO_ORG' },
      409,
    );
  }
  try {
    const versions = await listVersions({
      documentId: c.req.param('id'),
      orgId,
    });

    // Mint a fresh signed URL for each version. We don't store URLs (they
    // expire) — they're computed on read.
    const enriched = await Promise.all(
      versions.map(async (v) => ({
        id: v.id,
        version: v.version,
        isCurrent: v.isCurrent,
        createdAt: v.createdAt,
        downloadUrl: v.s3Key
          ? await getDocumentDownloadUrl({ documentId: v.id, orgId }).then(
              (r) => r.downloadUrl,
              () => null,
            )
          : null,
      })),
    );
    return c.json({ success: true as const, data: { versions: enriched } });
  } catch (err) {
    return handleGenerationError(c, err, 'list-versions');
  }
});

// -----------------------------------------------------------------------------
// POST /generate — create new document.
// -----------------------------------------------------------------------------
const generateBodySchema = z.object({
  templateId: z.string().min(1),
  formData: z.record(z.unknown()),
});

documentGeneratorRoutes.post(
  '/generate',
  requireAuth,
  rateLimitDocumentTemplates,
  zValidator('json', generateBodySchema),
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
      const { result } = await generateDocument({
        templateId: body.templateId,
        orgId,
        userId,
        formData: body.formData,
      });

      const consume = c.get('consumeDocumentTemplateToken');
      if (consume) await consume();

      return c.json(
        {
          success: true as const,
          data: {
            documentId: result.documentId,
            templateId: result.templateId,
            version: result.version,
            title: result.title,
            regulatoryBasis: result.regulatoryBasis,
            downloadUrl: result.downloadUrl,
            expiresAt: result.expiresAt,
          },
        },
        200,
      );
    } catch (err) {
      return handleGenerationError(c, err, 'generate');
    }
  },
);

// -----------------------------------------------------------------------------
// POST /generated/:id/regenerate — bump version.
// -----------------------------------------------------------------------------
const regenerateBodySchema = z.object({
  formData: z.record(z.unknown()).optional(),
});

documentGeneratorRoutes.post(
  '/generated/:id/regenerate',
  requireAuth,
  rateLimitDocumentTemplates,
  zValidator('json', regenerateBodySchema),
  async (c) => {
    const userId = c.get('userId');
    const documentId = c.req.param('id');
    const body = c.req.valid('json');

    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return c.json(
        { success: false as const, error: 'No organisation found.', code: 'NO_ORG' },
        409,
      );
    }

    try {
      const { result } = await regenerateDocument({
        documentId,
        orgId,
        userId,
        formData: body.formData,
      });

      const consume = c.get('consumeDocumentTemplateToken');
      if (consume) await consume();

      return c.json({
        success: true as const,
        data: {
          documentId: result.documentId,
          templateId: result.templateId,
          version: result.version,
          title: result.title,
          regulatoryBasis: result.regulatoryBasis,
          downloadUrl: result.downloadUrl,
          expiresAt: result.expiresAt,
        },
      });
    } catch (err) {
      return handleGenerationError(c, err, 'regenerate');
    }
  },
);

// -----------------------------------------------------------------------------
// DELETE /generated/:id — soft delete.
// -----------------------------------------------------------------------------
documentGeneratorRoutes.delete('/generated/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const orgId = await resolveOrgId(userId);
  if (!orgId) {
    return c.json(
      { success: false as const, error: 'No organisation found.', code: 'NO_ORG' },
      409,
    );
  }
  try {
    await softDeleteDocument({
      documentId: c.req.param('id'),
      orgId,
    });
    return c.body(null, 204);
  } catch (err) {
    return handleGenerationError(c, err, 'delete');
  }
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

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

/** Translate a `DocumentGenerationError` into a consistent JSON envelope. */
function handleGenerationError(
  c: {
    json: (
      body: unknown,
      status: 400 | 404 | 409 | 422 | 500 | 503,
    ) => Response;
  },
  err: unknown,
  scope: string,
): Response {
  if (err instanceof DocumentGenerationError) {
    return c.json(
      {
        success: false as const,
        error: err.message,
        code: err.code,
        ...(err.details !== null ? { details: err.details } : {}),
      },
      err.httpStatus as 400 | 404 | 409 | 422 | 500 | 503,
    );
  }
  console.error(`[documents/generate:${scope}] unexpected error`, err);
  return c.json(
    {
      success: false as const,
      error: 'Klarify could not complete this request. Please try again.',
      code: 'UNEXPECTED_ERROR',
    },
    500,
  );
}
