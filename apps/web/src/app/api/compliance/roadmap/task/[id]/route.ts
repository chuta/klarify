import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import {
  DIMENSION_WEIGHTS,
  DIMENSION_INDICATORS,
  type DimensionKey,
  type IndicatorState,
  createEmptyIndicatorState,
  indicatorsToDimensionScores,
  calculateReadinessScore,
} from '@klarify/core';
import { prisma, resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

function parseSnapshotToIndicatorState(snapshot: unknown): IndicatorState {
  const base = createEmptyIndicatorState();
  if (snapshot === null || typeof snapshot !== 'object') return base;
  for (const dim of Object.keys(DIMENSION_WEIGHTS) as DimensionKey[]) {
    const raw = (snapshot as Record<string, unknown>)[dim];
    if (raw !== null && typeof raw === 'object') {
      for (const ind of DIMENSION_INDICATORS[dim] as readonly string[]) {
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;
  const { id: taskId } = params;

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return NextResponse.json(
        { success: false, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      );
    }

    const result = await withRls({ userId, orgId }, async (tx) => {
      const task = await tx.roadmapTask.findFirst({ where: { id: taskId, orgId } });
      if (task === null) return null;

      const updated = await tx.roadmapTask.update({
        where: { id: taskId },
        data: { status: 'complete', completedAt: new Date() },
      });

      let scoreUpdate: { totalScore: number; dimensions: Record<string, number> } | null = null;
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
              orgId, totalScore,
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
      return NextResponse.json(
        { success: false, error: 'Task not found.', code: 'TASK_NOT_FOUND' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[compliance/roadmap/task] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update task.', code: 'TASK_UPDATE_ERROR' },
      { status: 500 },
    );
  }
}
