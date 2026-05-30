// Compliance endpoints — CLAUDE.md §9 (ComplianceOS routes).
// §16 Rule 6: score MUST update in real time on every indicator change.
// Sprint 4 — Smart Compliance Roadmap (US-007) extensions.
// Sprint 4-C — Score history endpoint (US-006 enhancement).
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  type DimensionKey,
  DIMENSION_WEIGHTS,
  DIMENSION_INDICATORS,
  readinessReassessmentSchema,
} from '@klarify/core';
import { prisma, withRls } from '../db.js';
import { requireAuth, type AuthVars } from '../middleware/auth.js';
import {
  flipIndicatorAndRecalc,
  loadFullRoadmap,
  materialiseRoadmapIfEmpty,
  reconcileLockState,
} from '../services/roadmapService.js';
import { recalculateScore, reassessReadinessScore } from '../services/scoreRecalculation.js';

export const complianceRoutes = new Hono<{ Variables: AuthVars }>();

// ========================================================================== //
// Helper — resolve the user's orgId (first membership) + profile.             //
// ========================================================================== //
async function resolveOrgId(userId: string): Promise<string | null> {
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { orgId: true },
  });
  return membership?.orgId ?? null;
}

async function resolveProductTypes(userId: string): Promise<string[]> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { productTypes: true },
  });
  return profile?.productTypes ?? [];
}

// ========================================================================== //
// GET /score                                                                   //
// ========================================================================== //
complianceRoutes.get('/score', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return c.json({
        success: true as const,
        data: {
          totalScore: 0,
          dimensions: Object.fromEntries(
            (Object.keys(DIMENSION_WEIGHTS) as DimensionKey[]).map((k) => [k, 0]),
          ),
        },
      });
    }

    const scoreRecord = await withRls({ userId, orgId }, (tx) =>
      tx.readinessScore.findFirst({
        where: { orgId },
        orderBy: { calculatedAt: 'desc' },
      }),
    );

    if (scoreRecord === null) {
      return c.json({
        success: true as const,
        data: {
          totalScore: 0,
          dimensions: Object.fromEntries(
            (Object.keys(DIMENSION_WEIGHTS) as DimensionKey[]).map((k) => [k, 0]),
          ),
          orgId,
        },
      });
    }

    return c.json({
      success: true as const,
      data: {
        totalScore: scoreRecord.totalScore,
        dimensions: {
          corporate_structure: scoreRecord.corporateStructure,
          capital_licensing: scoreRecord.capitalLicensing,
          kyc_infrastructure: scoreRecord.kycInfrastructure,
          aml_cft_programme: scoreRecord.amlCftProgramme,
          transaction_monitoring: scoreRecord.transactionMonitoring,
          regulatory_reporting: scoreRecord.regulatoryReporting,
          regulatory_relationships: scoreRecord.regulatoryRelationships,
          product_classification: scoreRecord.productClassification,
        },
        calculatedAt: scoreRecord.calculatedAt,
        orgId,
      },
    });
  } catch (err) {
    console.error('[compliance/score] error', err);
    return c.json(
      { success: false as const, error: 'Failed to fetch score.', code: 'SCORE_FETCH_ERROR' },
      500,
    );
  }
});

// ========================================================================== //
// POST /score/recalculate — rebuild score from profile + snapshot + tasks.   //
// ========================================================================== //
complianceRoutes.post('/score/recalculate', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return c.json(
        { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        404,
      );
    }

    const record = await recalculateScore(orgId, userId);
    if (record === null) {
      return c.json(
        { success: false as const, error: 'Could not recalculate score.', code: 'SCORE_RECALC_ERROR' },
        500,
      );
    }

    return c.json({
      success: true as const,
      data: {
        totalScore: record.totalScore,
        dimensions: {
          corporate_structure: record.corporateStructure,
          capital_licensing: record.capitalLicensing,
          kyc_infrastructure: record.kycInfrastructure,
          aml_cft_programme: record.amlCftProgramme,
          transaction_monitoring: record.transactionMonitoring,
          regulatory_reporting: record.regulatoryReporting,
          regulatory_relationships: record.regulatoryRelationships,
          product_classification: record.productClassification,
        },
        calculatedAt: record.calculatedAt,
        orgId,
      },
    });
  } catch (err) {
    console.error('[compliance/score/recalculate] error', err);
    return c.json(
      { success: false as const, error: 'Failed to recalculate score.', code: 'SCORE_RECALC_ERROR' },
      500,
    );
  }
});

// ========================================================================== //
// POST /score/reassess — full infrastructure re-assessment wizard submit.  //
// ========================================================================== //
complianceRoutes.post(
  '/score/reassess',
  requireAuth,
  zValidator('json', readinessReassessmentSchema),
  async (c) => {
    const userId = c.get('userId');
    const input = c.req.valid('json');

    try {
      const orgId = await resolveOrgId(userId);
      if (orgId === null) {
        return c.json(
          { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
          404,
        );
      }

      const record = await reassessReadinessScore(orgId, userId, input);
      if (record === null) {
        return c.json(
          {
            success: false as const,
            error: 'Complete onboarding before re-assessing your score.',
            code: 'PROFILE_NOT_FOUND',
          },
          404,
        );
      }

      return c.json({
        success: true as const,
        data: {
          totalScore: record.totalScore,
          dimensions: {
            corporate_structure: record.corporateStructure,
            capital_licensing: record.capitalLicensing,
            kyc_infrastructure: record.kycInfrastructure,
            aml_cft_programme: record.amlCftProgramme,
            transaction_monitoring: record.transactionMonitoring,
            regulatory_reporting: record.regulatoryReporting,
            regulatory_relationships: record.regulatoryRelationships,
            product_classification: record.productClassification,
          },
          calculatedAt: record.calculatedAt,
          orgId,
        },
      });
    } catch (err) {
      console.error('[compliance/score/reassess] error', err);
      return c.json(
        { success: false as const, error: 'Failed to re-assess score.', code: 'SCORE_REASSESS_ERROR' },
        500,
      );
    }
  },
);

// ========================================================================== //
// PUT /indicators — update a single indicator + recalc + re-check lock state. //
// CLAUDE.md §16 Rule 6.                                                        //
// ========================================================================== //
const updateIndicatorSchema = z.object({
  dimension: z.enum([
    'corporate_structure',
    'capital_licensing',
    'kyc_infrastructure',
    'aml_cft_programme',
    'transaction_monitoring',
    'regulatory_reporting',
    'regulatory_relationships',
    'product_classification',
  ] as const),
  indicator: z.string().min(1),
  value: z.boolean(),
});

complianceRoutes.put(
  '/indicators',
  requireAuth,
  zValidator('json', updateIndicatorSchema),
  async (c) => {
    const userId = c.get('userId');
    const { dimension, indicator, value } = c.req.valid('json');

    const validIndicators = DIMENSION_INDICATORS[dimension] as readonly string[];
    if (!validIndicators.includes(indicator)) {
      return c.json(
        {
          success: false as const,
          error: `Indicator "${indicator}" is not valid for dimension "${dimension}".`,
          code: 'INVALID_INDICATOR',
        },
        400,
      );
    }

    try {
      const orgId = await resolveOrgId(userId);
      if (orgId === null) {
        return c.json(
          { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
          404,
        );
      }

      const result = await withRls({ userId, orgId }, async (tx) => {
        const { scoreUpdate, nextState } = await flipIndicatorAndRecalc(
          tx, orgId, dimension, indicator, value,
        );
        // Indicator flips (e.g. registered_solicitor_engaged) can unlock tasks.
        const lockChanges = await reconcileLockState(tx, orgId, nextState);
        return { scoreUpdate, lockChanges };
      });

      // Full resync fire-and-forget: catches any task-linked indicators not
      // yet applied and produces an additional history point (§16 Rule 6).
      void recalculateScore(orgId, userId).catch((e: unknown) =>
        console.error('[compliance/indicators] recalc error', e),
      );

      return c.json({ success: true as const, data: result });
    } catch (err) {
      console.error('[compliance/indicators] error', err);
      return c.json(
        {
          success: false as const,
          error: 'Failed to update indicator.',
          code: 'INDICATOR_UPDATE_ERROR',
        },
        500,
      );
    }
  },
);

// ========================================================================== //
// GET /roadmap — full task list grouped by phase, with progress + lock state. //
// Lazy-materialises the roadmap on first read (Sprint 4 wipe-and-reseed).     //
// ========================================================================== //
complianceRoutes.get('/roadmap', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return c.json({ success: true as const, data: { tasks: [], grouped: {}, phaseProgress: [], orgId: null } });
    }

    const productTypes = await resolveProductTypes(userId);

    const data = await withRls({ userId, orgId }, async (tx) => {
      await materialiseRoadmapIfEmpty(tx, { orgId, productTypes });
      // Reconcile lock state once on read — fixes anything that fell behind.
      await reconcileLockState(tx, orgId);
      return loadFullRoadmap(tx, orgId);
    });

    return c.json({ success: true as const, data });
  } catch (err) {
    console.error('[compliance/roadmap] error', err);
    return c.json(
      { success: false as const, error: 'Failed to fetch roadmap.', code: 'ROADMAP_FETCH_ERROR' },
      500,
    );
  }
});

// ========================================================================== //
// POST /roadmap/task — create a custom user task.                              //
// ========================================================================== //
const createTaskSchema = z.object({
  phase: z.number().int().min(1).max(4),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  ownerUserId: z.string().uuid().optional(),
});

complianceRoutes.post('/roadmap/task', requireAuth, zValidator('json', createTaskSchema), async (c) => {
  const userId = c.get('userId');
  const body = c.req.valid('json');

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return c.json(
        { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        404,
      );
    }

    const created = await withRls({ userId, orgId }, async (tx) =>
      tx.roadmapTask.create({
        data: {
          orgId,
          phase: body.phase,
          title: body.title,
          description: body.description ?? null,
          regulatoryBasis: null,
          templateId: null,
          indicatorKey: null,
          templateRefId: null,
          isLocked: false,
          isBlocker: false,
          isCustom: true,
          status: 'not_started',
          dueDate: body.dueDate ? new Date(body.dueDate) : null,
          ownerUserId: body.ownerUserId ?? null,
        },
      }),
    );

    return c.json({ success: true as const, data: { task: created } }, 201);
  } catch (err) {
    console.error('[compliance/roadmap POST] error', err);
    return c.json(
      { success: false as const, error: 'Failed to create task.', code: 'TASK_CREATE_ERROR' },
      500,
    );
  }
});

// ========================================================================== //
// PUT /roadmap/task/:id — update status/owner/dueDate/notes.                  //
// On completion: propagate indicator + recalc score + re-check lock state.    //
// ========================================================================== //
const updateTaskSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'complete', 'blocked']).optional(),
  ownerUserId: z.string().uuid().nullable().optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

complianceRoutes.put(
  '/roadmap/task/:id',
  requireAuth,
  zValidator('json', updateTaskSchema),
  async (c) => {
    const userId = c.get('userId');
    const taskId = c.req.param('id');
    const body = c.req.valid('json');

    try {
      const orgId = await resolveOrgId(userId);
      if (orgId === null) {
        return c.json(
          { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
          404,
        );
      }

      const result = await withRls({ userId, orgId }, async (tx) => {
        const task = await tx.roadmapTask.findFirst({
          where: { id: taskId, orgId, deletedAt: null },
        });
        if (task === null) return { task: null, scoreUpdate: null };
        if (task.isLocked && body.status === 'complete') {
          return { task: 'locked' as const, scoreUpdate: null };
        }

        const becameComplete =
          body.status === 'complete' && task.status !== 'complete';

        const updated = await tx.roadmapTask.update({
          where: { id: taskId },
          data: {
            status: body.status ?? task.status,
            completedAt: becameComplete
              ? new Date()
              : body.status !== undefined && body.status !== 'complete'
                ? null
                : task.completedAt,
            ownerUserId:
              body.ownerUserId === undefined ? task.ownerUserId : body.ownerUserId,
            dueDate:
              body.dueDate === undefined
                ? task.dueDate
                : body.dueDate === null
                  ? null
                  : new Date(body.dueDate),
            notes: body.notes === undefined ? task.notes : body.notes,
          },
        });

        let scoreUpdate: Awaited<ReturnType<typeof flipIndicatorAndRecalc>>['scoreUpdate'] | null = null;
        if (becameComplete && updated.indicatorKey) {
          const parts = updated.indicatorKey.split('.');
          const dim = parts[0] as DimensionKey;
          const ind = parts[1];
          const validDims = Object.keys(DIMENSION_WEIGHTS) as DimensionKey[];
          if (
            ind &&
            validDims.includes(dim) &&
            (DIMENSION_INDICATORS[dim] as readonly string[]).includes(ind)
          ) {
            const flip = await flipIndicatorAndRecalc(tx, orgId, dim, ind, true);
            scoreUpdate = flip.scoreUpdate;
          }
        }

        if (becameComplete) {
          // Phase 1 completing all tasks → unlock Phase 2, etc.
          await reconcileLockState(tx, orgId);
        }

        return { task: updated, scoreUpdate };
      });

      if (result.task === null) {
        return c.json(
          { success: false as const, error: 'Task not found.', code: 'TASK_NOT_FOUND' },
          404,
        );
      }
      if (result.task === 'locked') {
        return c.json(
          {
            success: false as const,
            error: 'This task is locked. Complete the prerequisite phase first.',
            code: 'TASK_LOCKED',
          },
          409,
        );
      }

      // Fire-and-forget full resync — catches tasks without indicatorKey and
      // adds a fresh history point regardless (§16 Rule 6).
      void recalculateScore(orgId, userId).catch((e: unknown) =>
        console.error('[compliance/roadmap/task PUT] recalc error', e),
      );

      return c.json({
        success: true as const,
        data: { task: result.task, scoreUpdate: result.scoreUpdate },
      });
    } catch (err) {
      console.error('[compliance/roadmap/task PUT] error', err);
      return c.json(
        { success: false as const, error: 'Failed to update task.', code: 'TASK_UPDATE_ERROR' },
        500,
      );
    }
  },
);

// ========================================================================== //
// GET /score/history — readiness score over time (US-006 enhancement).       //
// Query param: ?days=30 (default) | 60 | 90                                  //
// ========================================================================== //
complianceRoutes.get('/score/history', requireAuth, async (c) => {
  const userId = c.get('userId');
  const rawDays = c.req.query('days');
  const days = rawDays === '60' ? 60 : rawDays === '90' ? 90 : 30;

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return c.json({
        success: true as const,
        data: { days, points: [], current: null, baseline: null, delta: 0 },
      });
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const rows = await withRls({ userId, orgId }, (tx) =>
      tx.readinessScore.findMany({
        where: { orgId, calculatedAt: { gte: since } },
        orderBy: { calculatedAt: 'asc' },
        select: {
          totalScore: true,
          corporateStructure: true,
          capitalLicensing: true,
          kycInfrastructure: true,
          amlCftProgramme: true,
          transactionMonitoring: true,
          regulatoryReporting: true,
          regulatoryRelationships: true,
          productClassification: true,
          calculatedAt: true,
        },
      }),
    );

    const points = rows.map((r) => ({
      date: r.calculatedAt.toISOString(),
      total: r.totalScore,
      corporate_structure:      r.corporateStructure,
      capital_licensing:        r.capitalLicensing,
      kyc_infrastructure:       r.kycInfrastructure,
      aml_cft_programme:        r.amlCftProgramme,
      transaction_monitoring:   r.transactionMonitoring,
      regulatory_reporting:     r.regulatoryReporting,
      regulatory_relationships: r.regulatoryRelationships,
      product_classification:   r.productClassification,
    }));

    const current = points.at(-1) ?? null;
    const baseline = points[0] ?? null;
    const delta = current !== null && baseline !== null
      ? current.total - baseline.total
      : 0;

    return c.json({
      success: true as const,
      data: { days, points, current, baseline, delta },
    });
  } catch (err) {
    console.error('[compliance/score/history] error', err);
    return c.json(
      {
        success: false as const,
        error: 'Failed to fetch score history.',
        code: 'SCORE_HISTORY_ERROR',
      },
      500,
    );
  }
});

// Legacy PATCH (used by Sprint 1 UI). Kept for backward-compat: marks complete.
complianceRoutes.patch('/roadmap/task/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const taskId = c.req.param('id');

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return c.json(
        { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        404,
      );
    }

    const result = await withRls({ userId, orgId }, async (tx) => {
      const task = await tx.roadmapTask.findFirst({
        where: { id: taskId, orgId, deletedAt: null },
      });
      if (task === null) return null;
      if (task.isLocked) return 'locked' as const;

      const updated = await tx.roadmapTask.update({
        where: { id: taskId },
        data: { status: 'complete', completedAt: new Date() },
      });

      let scoreUpdate: Awaited<ReturnType<typeof flipIndicatorAndRecalc>>['scoreUpdate'] | null = null;
      if (updated.indicatorKey) {
        const [dim, ind] = updated.indicatorKey.split('.');
        const validDims = Object.keys(DIMENSION_WEIGHTS) as DimensionKey[];
        if (
          dim && ind &&
          validDims.includes(dim as DimensionKey) &&
          (DIMENSION_INDICATORS[dim as DimensionKey] as readonly string[]).includes(ind)
        ) {
          const flip = await flipIndicatorAndRecalc(tx, orgId, dim as DimensionKey, ind, true);
          scoreUpdate = flip.scoreUpdate;
        }
      }
      await reconcileLockState(tx, orgId);
      return { task: updated, scoreUpdate };
    });

    if (result === null) {
      return c.json(
        { success: false as const, error: 'Task not found.', code: 'TASK_NOT_FOUND' },
        404,
      );
    }
    if (result === 'locked') {
      return c.json(
        {
          success: false as const,
          error: 'This task is locked. Complete the prerequisite phase first.',
          code: 'TASK_LOCKED',
        },
        409,
      );
    }
    return c.json({ success: true as const, data: result });
  } catch (err) {
    console.error('[compliance/roadmap/task PATCH] error', err);
    return c.json(
      { success: false as const, error: 'Failed to update task.', code: 'TASK_UPDATE_ERROR' },
      500,
    );
  }
});

// ========================================================================== //
// DELETE /roadmap/task/:id — soft delete custom tasks only.                    //
// ========================================================================== //
complianceRoutes.delete('/roadmap/task/:id', requireAuth, async (c) => {
  const userId = c.get('userId');
  const taskId = c.req.param('id');

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return c.json(
        { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        404,
      );
    }

    const result = await withRls({ userId, orgId }, async (tx) => {
      const task = await tx.roadmapTask.findFirst({
        where: { id: taskId, orgId, deletedAt: null },
      });
      if (task === null) return 'not_found' as const;
      if (!task.isCustom) return 'seed_protected' as const;
      await tx.roadmapTask.update({
        where: { id: taskId },
        data: { deletedAt: new Date() },
      });
      return 'deleted' as const;
    });

    if (result === 'not_found') {
      return c.json(
        { success: false as const, error: 'Task not found.', code: 'TASK_NOT_FOUND' },
        404,
      );
    }
    if (result === 'seed_protected') {
      return c.json(
        {
          success: false as const,
          error: 'Seed tasks cannot be deleted — they are part of the regulatory checklist.',
          code: 'SEED_TASK_PROTECTED',
        },
        403,
      );
    }
    return c.json({ success: true as const, data: { deleted: true } });
  } catch (err) {
    console.error('[compliance/roadmap/task DELETE] error', err);
    return c.json(
      { success: false as const, error: 'Failed to delete task.', code: 'TASK_DELETE_ERROR' },
      500,
    );
  }
});
