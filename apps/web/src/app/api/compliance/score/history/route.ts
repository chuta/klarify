import { NextResponse } from 'next/server';
import { resolveOrgId, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

export async function GET(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  const { searchParams } = new URL(request.url);
  const rawDays = searchParams.get('days');
  const days = rawDays === '60' ? 60 : rawDays === '90' ? 90 : 30;

  try {
    const orgId = await resolveOrgId(userId);
    if (orgId === null) {
      return NextResponse.json({
        success: true,
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
      corporate_structure: r.corporateStructure,
      capital_licensing: r.capitalLicensing,
      kyc_infrastructure: r.kycInfrastructure,
      aml_cft_programme: r.amlCftProgramme,
      transaction_monitoring: r.transactionMonitoring,
      regulatory_reporting: r.regulatoryReporting,
      regulatory_relationships: r.regulatoryRelationships,
      product_classification: r.productClassification,
    }));

    const current = points.at(-1) ?? null;
    const baseline = points[0] ?? null;
    const delta =
      current !== null && baseline !== null ? current.total - baseline.total : 0;

    return NextResponse.json({
      success: true,
      data: { days, points, current, baseline, delta },
    });
  } catch (err) {
    console.error('[compliance/score/history] error', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch score history.', code: 'SCORE_HISTORY_ERROR' },
      { status: 500 },
    );
  }
}
