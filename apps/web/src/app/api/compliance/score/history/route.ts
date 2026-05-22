import { NextResponse } from 'next/server';
import { resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  const { searchParams } = new URL(request.url);
  const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '30', 10), 1), 365);

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return NextResponse.json({ success: true, data: [] });
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const records = await withRls({ userId, orgId }, (tx) =>
      tx.readinessScore.findMany({
        where: {
          orgId,
          calculatedAt: { gte: since },
        },
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

    const history = records.map((r) => ({
      totalScore: r.totalScore,
      dimensions: {
        corporate_structure: r.corporateStructure,
        capital_licensing: r.capitalLicensing,
        kyc_infrastructure: r.kycInfrastructure,
        aml_cft_programme: r.amlCftProgramme,
        transaction_monitoring: r.transactionMonitoring,
        regulatory_reporting: r.regulatoryReporting,
        regulatory_relationships: r.regulatoryRelationships,
        product_classification: r.productClassification,
      },
      calculatedAt: r.calculatedAt,
    }));

    return NextResponse.json({ success: true, data: history });
  } catch (err) {
    console.error('[compliance/score/history] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch score history.', code: 'SCORE_HISTORY_ERROR' },
      { status: 500 },
    );
  }
}
