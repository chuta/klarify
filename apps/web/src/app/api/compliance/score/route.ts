import { NextResponse } from 'next/server';
import { DIMENSION_WEIGHTS, type DimensionKey } from '@klarify/core';
import { resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

const ZERO_DIMENSIONS = Object.fromEntries(
  (Object.keys(DIMENSION_WEIGHTS) as DimensionKey[]).map((k) => [k, 0]),
);

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return NextResponse.json({ success: true, data: { totalScore: 0, dimensions: ZERO_DIMENSIONS } });
    }

    const scoreRecord = await withRls({ userId, orgId }, (tx) =>
      tx.readinessScore.findFirst({
        where: { orgId },
        orderBy: { calculatedAt: 'desc' },
      }),
    );

    if (scoreRecord === null) {
      return NextResponse.json({ success: true, data: { totalScore: 0, dimensions: ZERO_DIMENSIONS, orgId } });
    }

    return NextResponse.json({
      success: true,
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
    return NextResponse.json(
      { success: false, error: 'Failed to fetch score.', code: 'SCORE_FETCH_ERROR' },
      { status: 500 },
    );
  }
}
