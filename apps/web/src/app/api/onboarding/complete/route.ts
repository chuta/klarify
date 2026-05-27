import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import {
  onboardingCompleteSchema,
  createEmptyIndicatorState,
  applyExistingInfrastructure,
  indicatorsToDimensionScores,
  calculateReadinessScore,
  PHASE_1_TEMPLATES,
  productTypesRequireSec,
} from '@klarify/core';
import { materialiseRoadmapIfEmpty } from '@/lib/roadmapService';
import { sendOnboardingCompleteEmail } from '@klarify/email';
import { prisma, withRls } from '@/lib/db';
import { resolveOrgForOnboarding, TeamError } from '@/lib/teamService';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

function primaryRegulatorLabel(productTypes: string[]): string {
  if (productTypesRequireSec(productTypes)) return 'SEC Nigeria';
  if (productTypes.includes('PAYMENT') || productTypes.includes('STABLECOIN')) {
    return 'Central Bank of Nigeria';
  }
  return 'To be determined — classify your product to find out';
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authenticateRouteHandler(request);
  if (!auth) return unauthenticated();
  const { userId } = auth;

  const rawBody: unknown = await request.json();
  const parsed = onboardingCompleteSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.', code: 'VALIDATION_ERROR' },
      { status: 422 },
    );
  }
  const body = parsed.data;

  try {
    const resolved = await resolveOrgForOnboarding({
      userId,
      email: auth.email,
      orgName: body.org_name,
    });
    const orgId = resolved.orgId;

    const result = await withRls({ userId, orgId }, async (tx) => {
      await tx.userProfile.upsert({
        where: { userId },
        create: {
          userId,
          productTypes: body.product_types,
          targetMarkets: body.target_markets,
          stage: body.stage,
          teamSize: body.team_size,
          hasComplianceOfficer: body.has_compliance_officer,
          existingInfrastructure: body.existing_infrastructure,
        },
        update: {
          productTypes: body.product_types,
          targetMarkets: body.target_markets,
          stage: body.stage,
          teamSize: body.team_size,
          hasComplianceOfficer: body.has_compliance_officer,
          existingInfrastructure: body.existing_infrastructure,
        },
      });

      const emptyState = createEmptyIndicatorState();
      const indicatorState = applyExistingInfrastructure(emptyState, body.existing_infrastructure);
      const dimensionScores = indicatorsToDimensionScores(indicatorState);
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
          snapshot: indicatorState as unknown as Prisma.JsonObject,
        },
      });

      // Sprint 4 — generate the full 4-phase roadmap from the master
      // template library (roadmap_task_templates). Phase 1 unlocked,
      // Phase 2-4 locked until prerequisites are met.
      await materialiseRoadmapIfEmpty(tx, {
        orgId,
        productTypes: body.product_types,
      });

      return { totalScore, dimensionScores };
    });

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (me?.email) {
      const nextTasks = PHASE_1_TEMPLATES.slice(0, 3).map((tpl) => ({
        title: tpl.title,
        phase: tpl.phase,
      }));
      const emailResult = await sendOnboardingCompleteEmail({
        to: me.email,
        name: me.name ?? me.email,
        score: result.totalScore,
        productTypes: body.product_types,
        primaryRegulator: primaryRegulatorLabel(body.product_types),
        nextTasks,
        idempotencyKey: `onboarding-complete/${userId}/${orgId}`,
      });
      if (!emailResult.success) {
        console.error('[onboarding/complete] readiness-score email failed', {
          userId,
          orgId,
          to: me.email,
          error: emailResult.error,
        });
      } else {
        console.info('[onboarding/complete] readiness-score email sent', {
          userId,
          orgId,
          resendId: emailResult.id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        score: result.totalScore,
        dimensions: result.dimensionScores,
        orgId,
        redirect: '/dashboard',
      },
    });
  } catch (err) {
    if (err instanceof TeamError && err.code === 'VALIDATION_ERROR') {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: 422 },
      );
    }
    console.error('[onboarding/complete] error', err);
    return NextResponse.json(
      { success: false, error: 'Onboarding failed. Please try again.', code: 'ONBOARDING_ERROR' },
      { status: 500 },
    );
  }
}
