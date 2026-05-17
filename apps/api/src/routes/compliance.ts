// Compliance endpoints — CLAUDE.md §9 (ComplianceOS routes).
// §16 Rule 6: score MUST update in real time on every indicator change.
import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { Prisma } from '@prisma/client';
import {
  type DimensionKey,
  DIMENSION_WEIGHTS,
  type IndicatorState,
  createEmptyIndicatorState,
  applyExistingInfrastructure,
  indicatorsToDimensionScores,
  calculateReadinessScore,
  DIMENSION_INDICATORS,
} from '@klarify/core';
import { prisma, withRls } from '../db.js';
import { requireAuth, type AuthVars } from '../middleware/auth.js';

export const complianceRoutes = new Hono<{ Variables: AuthVars }>();

// ========================================================================== //
// Helper — resolve the user's orgId (first membership).                       //
// ========================================================================== //
async function resolveOrgId(userId: string): Promise<string | null> {
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { orgId: true },
  });
  return membership?.orgId ?? null;
}

// ========================================================================== //
// Helper — safe cast of JSON snapshot to IndicatorState.                      //
// ========================================================================== //
function parseSnapshotToIndicatorState(snapshot: unknown): IndicatorState {
  if (snapshot === null || typeof snapshot !== 'object') {
    return createEmptyIndicatorState();
  }
  const dimensionKeys = Object.keys(DIMENSION_WEIGHTS) as DimensionKey[];
  const base = createEmptyIndicatorState();
  for (const dim of dimensionKeys) {
    const raw = (snapshot as Record<string, unknown>)[dim];
    if (raw !== null && typeof raw === 'object') {
      const indicators = DIMENSION_INDICATORS[dim] as readonly string[];
      for (const ind of indicators) {
        const val = (raw as Record<string, unknown>)[ind];
        if (typeof val === 'boolean') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (base[dim] as any)[ind] = val;
        }
      }
    }
  }
  return base;
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
// PUT /indicators — update a single indicator, recalculate score in real time.//
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

    try {
      const orgId = await resolveOrgId(userId);
      if (orgId === null) {
        return c.json(
          { success: false as const, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
          404,
        );
      }

      // Validate that the indicator key belongs to the dimension.
      const validIndicators = DIMENSION_INDICATORS[dimension as DimensionKey] as readonly string[];
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

      const result = await withRls({ userId, orgId }, async (tx) => {
        // Load most recent snapshot.
        const latest = await tx.readinessScore.findFirst({
          where: { orgId },
          orderBy: { calculatedAt: 'desc' },
        });

        const currentState = parseSnapshotToIndicatorState(latest?.snapshot ?? null);

        // Update the single indicator.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (currentState[dimension as DimensionKey] as any)[indicator] = value;

        // Recalculate.
        const dimensionScores = indicatorsToDimensionScores(currentState);
        const totalScore = calculateReadinessScore(dimensionScores);

        // Persist new score record.
        const newRecord = await tx.readinessScore.create({
          data: {
            orgId,
            totalScore,
            corporateStructure: dimensionScores.corporate_structure,
            capitalLicensing: dimensionScores.capital_licensing,
            kycInfrastructure: dimensionScores.kyc_infrastructure,
            amlCftProgramme: dimensionScores.aml_cft_programme,
            transactionMonitoring: dimensionScores.transaction_monitoring,
            regulatoryReporting: dimensionScores.regulatory_reporting,
            regulatoryRelationships: dimensionScores.regulatory_relationships,
            productClassification: dimensionScores.product_classification,
            snapshot: currentState as unknown as Prisma.InputJsonValue,
          },
        });

        return { totalScore, dimensionScores, calculatedAt: newRecord.calculatedAt };
      });

      return c.json({
        success: true as const,
        data: result,
      });
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
// PATCH /roadmap/task/:id — mark a task complete, update indicator, recalc.   //
// CLAUDE.md §16 Rule 6: score MUST update in real time.                       //
// ========================================================================== //
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
      // Verify task belongs to this org.
      const task = await tx.roadmapTask.findFirst({
        where: { id: taskId, orgId },
      });
      if (task === null) {
        return null;
      }

      // Mark task complete.
      const updated = await tx.roadmapTask.update({
        where: { id: taskId },
        data: {
          status: 'complete',
          completedAt: new Date(),
        },
      });

      // If task has an indicator_key (e.g. "aml_cft_programme.bwra_documented"),
      // update that indicator and recalculate the readiness score.
      let scoreUpdate: {
        totalScore: number;
        dimensions: Record<string, number>;
      } | null = null;

      // Cast through unknown — indicatorKey is in the Prisma schema but the
      // generated client may be stale until `prisma generate` is re-run.
      const indicatorKeyValue = (updated as unknown as { indicatorKey?: string | null }).indicatorKey;
      if (indicatorKeyValue) {
        const parts = indicatorKeyValue.split('.');
        const dimension = parts[0] as DimensionKey;
        const indicator = parts[1];

        const validDimensions = Object.keys(DIMENSION_WEIGHTS) as DimensionKey[];
        if (
          indicator &&
          validDimensions.includes(dimension) &&
          (DIMENSION_INDICATORS[dimension] as readonly string[]).includes(indicator)
        ) {
          const latest = await tx.readinessScore.findFirst({
            where: { orgId },
            orderBy: { calculatedAt: 'desc' },
          });

          const currentState = parseSnapshotToIndicatorState(latest?.snapshot ?? null);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (currentState[dimension] as any)[indicator] = true;

          const dimensionScores = indicatorsToDimensionScores(currentState);
          const totalScore = calculateReadinessScore(dimensionScores);

          await tx.readinessScore.create({
            data: {
              orgId,
              totalScore,
              corporateStructure: dimensionScores.corporate_structure,
              capitalLicensing: dimensionScores.capital_licensing,
              kycInfrastructure: dimensionScores.kyc_infrastructure,
              amlCftProgramme: dimensionScores.aml_cft_programme,
              transactionMonitoring: dimensionScores.transaction_monitoring,
              regulatoryReporting: dimensionScores.regulatory_reporting,
              regulatoryRelationships: dimensionScores.regulatory_relationships,
              productClassification: dimensionScores.product_classification,
              snapshot: currentState as unknown as Prisma.InputJsonValue,
            },
          });

          scoreUpdate = {
            totalScore,
            dimensions: {
              corporate_structure: dimensionScores.corporate_structure,
              capital_licensing: dimensionScores.capital_licensing,
              kyc_infrastructure: dimensionScores.kyc_infrastructure,
              aml_cft_programme: dimensionScores.aml_cft_programme,
              transaction_monitoring: dimensionScores.transaction_monitoring,
              regulatory_reporting: dimensionScores.regulatory_reporting,
              regulatory_relationships: dimensionScores.regulatory_relationships,
              product_classification: dimensionScores.product_classification,
            },
          };
        }
      }

      return { task: updated, scoreUpdate };
    });

    if (result === null) {
      return c.json(
        { success: false as const, error: 'Task not found.', code: 'TASK_NOT_FOUND' },
        404,
      );
    }

    return c.json({ success: true as const, data: result });
  } catch (err) {
    console.error('[compliance/roadmap/task] error', err);
    return c.json(
      { success: false as const, error: 'Failed to update task.', code: 'TASK_UPDATE_ERROR' },
      500,
    );
  }
});

// ========================================================================== //
// GET /roadmap — all roadmap tasks for the org, grouped by phase.             //
// ========================================================================== //
complianceRoutes.get('/roadmap', requireAuth, async (c) => {
  const userId = c.get('userId');

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return c.json({ success: true as const, data: { tasks: [], orgId: null } });
    }

    const tasks = await withRls({ userId, orgId }, (tx) =>
      tx.roadmapTask.findMany({
        where: { orgId },
        orderBy: [{ phase: 'asc' }, { createdAt: 'asc' }],
      }),
    );

    // Group by phase.
    const grouped: Record<number, typeof tasks> = {};
    for (const task of tasks) {
      if (grouped[task.phase] === undefined) {
        grouped[task.phase] = [];
      }
      grouped[task.phase]!.push(task);
    }

    return c.json({
      success: true as const,
      data: { tasks, grouped, orgId },
    });
  } catch (err) {
    console.error('[compliance/roadmap] error', err);
    return c.json(
      {
        success: false as const,
        error: 'Failed to fetch roadmap.',
        code: 'ROADMAP_FETCH_ERROR',
      },
      500,
    );
  }
});
