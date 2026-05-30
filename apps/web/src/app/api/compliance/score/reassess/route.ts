import { NextResponse } from 'next/server';
import { readinessReassessmentSchema } from '@klarify/core';
import { reassessReadinessScore } from '@/lib/scoreRecalculation';
import { resolveOrgId } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body.', code: 'INVALID_BODY' },
      { status: 422 },
    );
  }

  const parsed = readinessReassessmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsed.error.errors[0]?.message ?? 'Invalid request.',
        code: 'VALIDATION_ERROR',
      },
      { status: 422 },
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

    const record = await reassessReadinessScore(orgId, userId, parsed.data);
    if (record === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'Complete onboarding before re-assessing your score.',
          code: 'PROFILE_NOT_FOUND',
        },
        { status: 404 },
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
    console.error('[compliance/score/reassess] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to re-assess score.', code: 'SCORE_REASSESS_ERROR' },
      { status: 500 },
    );
  }
}
