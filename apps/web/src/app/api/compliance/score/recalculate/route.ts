import { NextResponse } from 'next/server';
import { recalculateScore } from '@/lib/scoreRecalculation';
import { resolveOrgId } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return NextResponse.json(
        { success: false, error: 'Organisation not found.', code: 'ORG_NOT_FOUND' },
        { status: 404 },
      );
    }

    const record = await recalculateScore(orgId, userId);
    if (record === null) {
      return NextResponse.json(
        { success: false, error: 'Could not recalculate score.', code: 'SCORE_RECALC_ERROR' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
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
    return NextResponse.json(
      { success: false, error: 'Failed to recalculate score.', code: 'SCORE_RECALC_ERROR' },
      { status: 500 },
    );
  }
}
