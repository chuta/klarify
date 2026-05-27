// US-008B — White Paper Analyzer routes (Compass+).
import { Buffer } from 'node:buffer';
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { Prisma } from '@prisma/client';
import {
  WhitePaperPasteRequestSchema,
  WHITE_PAPER_LICENCE_CATEGORIES,
  WHITE_PAPER_SOURCE_JURISDICTIONS,
} from '@klarify/core';
import { prisma, withRls } from '../../db.js';
import { requireAuth, type AuthVars } from '../../middleware/auth.js';
import { requireFeature } from '../../middleware/featureGate.js';
import {
  uploadWhitePaper,
  createPastedWhitePaper,
  WhitePaperUploadError,
  type WhitePaperMetadata,
} from '../../services/whitePaperUpload.js';
import { enqueueWhitePaperAnalysis } from '../../services/whitePaperAnalysisQueue.js';
import {
  exportWhitePaperGapReportDocx,
  exportWhitePaperOutlineDocx,
} from '../../services/whitePaperExport.js';

export const whitePaperRoutes = new Hono<{ Variables: AuthVars }>();

async function resolveOrgId(userId: string): Promise<string | null> {
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { orgId: true },
  });
  return membership?.orgId ?? null;
}

function parseUploadMetadata(form: FormData): WhitePaperMetadata | null {
  const source = form.get('sourceJurisdiction');
  const licence = form.get('licenceCategorySought');
  const existing = form.get('existingSourceLicence');
  if (
    typeof source !== 'string' ||
    !WHITE_PAPER_SOURCE_JURISDICTIONS.includes(
      source as (typeof WHITE_PAPER_SOURCE_JURISDICTIONS)[number],
    )
  ) {
    return null;
  }
  if (
    typeof licence !== 'string' ||
    !WHITE_PAPER_LICENCE_CATEGORIES.includes(
      licence as (typeof WHITE_PAPER_LICENCE_CATEGORIES)[number],
    )
  ) {
    return null;
  }
  return {
    sourceJurisdiction: source as WhitePaperMetadata['sourceJurisdiction'],
    licenceCategorySought: licence as WhitePaperMetadata['licenceCategorySought'],
    existingSourceLicence:
      typeof existing === 'string' && existing.trim() ? existing.trim().slice(0, 500) : null,
  };
}

whitePaperRoutes.get(
  '/recent',
  requireAuth,
  requireFeature('white_paper_analyzer'),
  async (c) => {
    const userId = c.get('userId');
    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return c.json(
        { success: false as const, error: 'No organisation found.', code: 'NO_ORG' },
        409,
      );
    }
    const rows = await withRls({ userId, orgId }, (tx) =>
      tx.whitePaperAnalysis.findMany({
        where: { orgId, deletedAt: null },
        orderBy: { uploadedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          originalFilename: true,
          status: true,
          completenessPct: true,
          sectionsAdequate: true,
          uploadedAt: true,
          sourceJurisdiction: true,
          licenceCategorySought: true,
        },
      }),
    );
    return c.json({ success: true as const, data: rows });
  },
);

whitePaperRoutes.post(
  '/upload',
  requireAuth,
  requireFeature('white_paper_analyzer'),
  async (c) => {
    const userId = c.get('userId');
    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return c.json(
        { success: false as const, error: 'No organisation found.', code: 'NO_ORG' },
        409,
      );
    }

    const form = await c.req.formData();
    const metadata = parseUploadMetadata(form);
    if (!metadata) {
      return c.json(
        {
          success: false as const,
          error: 'Source jurisdiction and licence category are required.',
          code: 'INVALID_METADATA',
        },
        422,
      );
    }

    const file = form.get('file');
    if (!(file instanceof File)) {
      return c.json(
        { success: false as const, error: 'Please attach a file.', code: 'NO_FILE' },
        400,
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    try {
      const result = await uploadWhitePaper({
        userId,
        orgId,
        originalFilename: file.name ?? 'whitepaper.pdf',
        contentType: file.type ?? 'application/octet-stream',
        bytes,
        metadata,
      });
      enqueueWhitePaperAnalysis(result.analysisId).catch((err) => {
        console.error('[whitepaper/upload] enqueue failed', err);
      });
      return c.json(
        {
          success: true as const,
          data: {
            analysisId: result.analysisId,
            status: result.status,
            pollUrl: `/api/documents/whitepaper/${result.analysisId}/status`,
          },
        },
        202,
      );
    } catch (err) {
      if (err instanceof WhitePaperUploadError) {
        return c.json(
          { success: false as const, error: err.message, code: err.code },
          err.httpStatus as 400 | 413 | 415 | 422,
        );
      }
      throw err;
    }
  },
);

whitePaperRoutes.post(
  '/analyse',
  requireAuth,
  requireFeature('white_paper_analyzer'),
  zValidator('json', WhitePaperPasteRequestSchema),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');
    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return c.json(
        { success: false as const, error: 'No organisation found.', code: 'NO_ORG' },
        409,
      );
    }
    try {
      const { analysisId } = await createPastedWhitePaper({
        userId,
        orgId,
        text: body.text,
        metadata: {
          sourceJurisdiction: body.sourceJurisdiction,
          licenceCategorySought: body.licenceCategorySought,
          existingSourceLicence: body.existingSourceLicence,
        },
      });
      enqueueWhitePaperAnalysis(analysisId).catch((err) => {
        console.error('[whitepaper/analyse] enqueue failed', err);
      });
      return c.json(
        {
          success: true as const,
          data: {
            analysisId,
            status: 'analysing' as const,
            pollUrl: `/api/documents/whitepaper/${analysisId}/status`,
          },
        },
        202,
      );
    } catch (err) {
      if (err instanceof WhitePaperUploadError) {
        return c.json(
          { success: false as const, error: err.message, code: err.code },
          err.httpStatus as 400 | 413 | 422,
        );
      }
      throw err;
    }
  },
);

whitePaperRoutes.get(
  '/:id/status',
  requireAuth,
  requireFeature('white_paper_analyzer'),
  async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return c.json(
        { success: false as const, error: 'No organisation found.', code: 'NO_ORG' },
        409,
      );
    }
    const row = await withRls({ userId, orgId }, (tx) =>
      tx.whitePaperAnalysis.findFirst({
        where: { id, orgId, deletedAt: null },
        select: {
          id: true,
          status: true,
          errorMessage: true,
          completenessPct: true,
          sectionsAdequate: true,
        },
      }),
    );
    if (!row) {
      return c.json(
        { success: false as const, error: 'Analysis not found.', code: 'NOT_FOUND' },
        404,
      );
    }
    return c.json({ success: true as const, data: row });
  },
);

whitePaperRoutes.get(
  '/:id',
  requireAuth,
  requireFeature('white_paper_analyzer'),
  async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return c.json(
        { success: false as const, error: 'No organisation found.', code: 'NO_ORG' },
        409,
      );
    }
    const row = await withRls({ userId, orgId }, (tx) =>
      tx.whitePaperAnalysis.findFirst({
        where: { id, orgId, deletedAt: null },
      }),
    );
    if (!row) {
      return c.json(
        { success: false as const, error: 'Analysis not found.', code: 'NOT_FOUND' },
        404,
      );
    }
    return c.json({ success: true as const, data: row });
  },
);

whitePaperRoutes.post(
  '/:id/export-gap-report',
  requireAuth,
  requireFeature('white_paper_analyzer'),
  async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    try {
      const exported = await exportWhitePaperGapReportDocx(id, userId);
      return c.json({ success: true as const, data: exported });
    } catch (err) {
      return c.json(
        {
          success: false as const,
          error: err instanceof Error ? err.message : 'Export failed.',
          code: 'EXPORT_FAILED',
        },
        400,
      );
    }
  },
);

whitePaperRoutes.post(
  '/:id/export-outline',
  requireAuth,
  requireFeature('white_paper_analyzer'),
  async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    try {
      const exported = await exportWhitePaperOutlineDocx(id, userId);
      return c.json({ success: true as const, data: exported });
    } catch (err) {
      return c.json(
        {
          success: false as const,
          error: err instanceof Error ? err.message : 'Export failed.',
          code: 'EXPORT_FAILED',
        },
        400,
      );
    }
  },
);

whitePaperRoutes.delete(
  '/:id',
  requireAuth,
  requireFeature('white_paper_analyzer'),
  async (c) => {
    const userId = c.get('userId');
    const id = c.req.param('id');
    const orgId = await resolveOrgId(userId);
    if (!orgId) {
      return c.json(
        { success: false as const, error: 'No organisation found.', code: 'NO_ORG' },
        409,
      );
    }
    await withRls({ userId, orgId }, (tx) =>
      tx.whitePaperAnalysis.updateMany({
        where: { id, orgId },
        data: { deletedAt: new Date() },
      }),
    );
    return c.body(null, 204);
  },
);
