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

export async function PUT(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  const body = (await request.json()) as { dimension: string; indicator: string; value: boolean };
  const { dimension, indicator, value } = body;

  const validDimensions = Object.keys(DIMENSION_WEIGHTS) as DimensionKey[];
  if (!validDimensions.includes(dimension as DimensionKey)) {
    return NextResponse.json(
      { success: false, error: 'Invalid dimension.', code: 'INVALID_DIMENSION' },
      { status: 400 },
    );
  }
  const validIndicators = DIMENSION_INDICATORS[dimension as DimensionKey] as readonly string[];
  if (!validIndicators.includes(indicator)) {
    return NextResponse.json(
      { success: false, error: `Indicator "${indicator}" is not valid for dimension "${dimension}".`, code: 'INVALID_INDICATOR' },
      { status: 400 },
    );
  }

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return NextResponse.json(
        { success: false, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      );
    }

    const result = await withRls({ userId, orgId }, async (tx) => {
      const latest = await tx.readinessScore.findFirst({
        where: { orgId },
        orderBy: { calculatedAt: 'desc' },
      });
      const currentState = parseSnapshotToIndicatorState(latest?.snapshot ?? null);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (currentState[dimension as DimensionKey] as any)[indicator] = value;
      const dimensionScores = indicatorsToDimensionScores(currentState);
      const totalScore = calculateReadinessScore(dimensionScores);
      const newRecord = await tx.readinessScore.create({
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
      return { totalScore, dimensionScores, calculatedAt: newRecord.calculatedAt };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[compliance/indicators] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to update indicator.', code: 'INDICATOR_UPDATE_ERROR' },
      { status: 500 },
    );
  }
}
