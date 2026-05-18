import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import {
  onboardingCompleteSchema,
  createEmptyIndicatorState,
  applyExistingInfrastructure,
  indicatorsToDimensionScores,
  calculateReadinessScore,
  PHASE_1_TEMPLATES,
} from '@klarify/core';
import { sendOnboardingCompleteEmail } from '@klarify/email';
import { prisma, withRls } from '@/lib/db';
import { authenticateRouteHandler, unauthenticated } from '@/lib/route-auth';

function primaryRegulatorLabel(productTypes: string[]): string {
  const has = (code: string): boolean => productTypes.includes(code);
  if (has('DAX') || has('DAOP') || has('DAC') || has('DAI')) return 'SEC Nigeria';
  if (has('PAYMENT') || has('STABLECOIN')) return 'Central Bank of Nigeria';
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
    let orgId: string;
    const existingMembership = await prisma.orgMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: { orgId: true },
    });

    if (existingMembership !== null) {
      orgId = existingMembership.orgId;
    } else {
      const email = auth.email;
      const domain = email.includes('@') ? (email.split('@')[1] ?? email) : email;
      const newOrg = await prisma.organisation.create({
        data: { name: `${domain} (default)`, ownerId: userId, plan: 'free' },
      });
      await prisma.orgMember.create({
        data: { orgId: newOrg.id, userId, role: 'owner' },
      });
      orgId = newOrg.id;
    }

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

      const existingTaskCount = await tx.roadmapTask.count({ where: { orgId } });
      if (existingTaskCount === 0) {
        await tx.roadmapTask.createMany({
          data: PHASE_1_TEMPLATES.map((tpl) => ({
            orgId,
            phase: tpl.phase,
            title: tpl.title,
            description: tpl.description,
            regulatoryBasis: tpl.regulatory_basis,
            templateId: tpl.template_id ?? null,
            indicatorKey: tpl.indicator_key ?? null,
            status: 'not_started',
            isLocked: false,
          })),
        });
      }

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
      void sendOnboardingCompleteEmail({
        to: me.email,
        name: me.name ?? me.email,
        score: result.totalScore,
        productTypes: body.product_types,
        primaryRegulator: primaryRegulatorLabel(body.product_types),
        nextTasks,
        idempotencyKey: `onboarding-complete:${userId}:${orgId}`,
      }).catch((err: unknown) => {
        console.error('[onboarding] readiness-score email failed', err);
      });
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
    console.error('[onboarding/complete] error', err);
    return NextResponse.json(
      { success: false, error: 'Onboarding failed. Please try again.', code: 'ONBOARDING_ERROR' },
      { status: 500 },
    );
  }
}
