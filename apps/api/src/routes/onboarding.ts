// POST /api/onboarding/complete — 5-step onboarding wizard completion.
// CLAUDE.md §9; §16 Rule 6 (score updates in real time after onboarding).
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
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
import { prisma, withRls } from '../db.js';
import { requireAuth, type AuthVars } from '../middleware/auth.js';
import { ensureFreeTier } from '../services/billing.js';

/**
 * Map a product-type code (e.g. "DAX") onto its primary Nigerian regulator
 * for use in the post-onboarding email. This mirrors the classification
 * logic in @klarify/ai/classify but is intentionally simpler — we only need
 * a label here, not a full regulatory verdict.
 */
function primaryRegulatorLabel(productTypes: string[]): string {
  const has = (code: string): boolean => productTypes.includes(code);
  if (has('DAX') || has('DAOP') || has('DAC') || has('DAI')) {
    return 'SEC Nigeria';
  }
  if (has('PAYMENT') || has('STABLECOIN')) {
    return 'Central Bank of Nigeria';
  }
  return 'To be determined — classify your product to find out';
}

export const onboardingRoutes = new Hono<{ Variables: AuthVars }>();

/**
 * POST /api/onboarding/complete
 *
 * 1. Validate body against onboardingCompleteSchema.
 * 2. Resolve (or create) the user's default org.
 * 3. In a withRls transaction:
 *    a. Upsert user_profiles.
 *    b. Build IndicatorState from existing_infrastructure.
 *    c. Compute + upsert readiness_scores.
 *    d. Seed Phase 1 roadmap tasks if none exist yet.
 * 4. Return calculated score + redirect hint.
 */
onboardingRoutes.post(
  '/complete',
  requireAuth,
  zValidator('json', onboardingCompleteSchema),
  async (c) => {
    const userId = c.get('userId');
    const body = c.req.valid('json');

    try {
      // ------------------------------------------------------------------ //
      // 1. Resolve (or create) the user's default organisation.             //
      // ------------------------------------------------------------------ //
      let orgId: string;

      const existingMembership = await prisma.orgMember.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { orgId: true, role: true },
      });

      if (existingMembership !== null) {
        orgId = existingMembership.orgId;
        if (existingMembership.role === 'owner' && body.org_name?.trim()) {
          await prisma.organisation.update({
            where: { id: orgId },
            data: { name: body.org_name.trim() },
          });
        }
      } else {
        if (!body.org_name?.trim()) {
          return c.json(
            {
              success: false as const,
              error: 'Organisation name is required to claim ownership.',
              code: 'VALIDATION_ERROR',
            },
            422,
          );
        }

        const email = c.get('email');
        const newOrg = await prisma.organisation.create({
          data: {
            name: body.org_name.trim(),
            ownerId: userId,
            plan: 'free',
            seatsUsed: 1,
          },
        });
        await prisma.orgMember.create({
          data: {
            orgId: newOrg.id,
            userId,
            role: 'owner',
          },
        });
        orgId = newOrg.id;

        // Create free-tier subscription row for the new org.
        // Fire-and-forget — onboarding succeeds even if this fails.
        void ensureFreeTier(orgId).catch((err) => {
          console.error('[onboarding] ensureFreeTier failed', err);
        });
      }

      // ------------------------------------------------------------------ //
      // 2. RLS-scoped transaction.                                           //
      // ------------------------------------------------------------------ //
      const result = await withRls({ userId, orgId }, async (tx) => {
        // a. Upsert user_profiles.
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

        // b. Build IndicatorState from existing_infrastructure.
        const emptyState = createEmptyIndicatorState();
        const indicatorState = applyExistingInfrastructure(
          emptyState,
          body.existing_infrastructure,
        );

        // c. Compute DimensionScores + total readiness score.
        const dimensionScores = indicatorsToDimensionScores(indicatorState);
        const totalScore = calculateReadinessScore(dimensionScores);

        // Upsert readiness_scores — create a new snapshot record.
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

        // d. Seed Phase 1 roadmap tasks if the org has none yet.
        const existingTaskCount = await tx.roadmapTask.count({
          where: { orgId },
        });

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

      // Await delivery so the handler stays alive until Resend accepts the
      // message. Onboarding still succeeds if email fails.
      const me = await prisma.user.findUnique({
        where:  { id: userId },
        select: { email: true, name: true },
      });
      if (me?.email) {
        const nextTasks = PHASE_1_TEMPLATES.slice(0, 3).map((tpl) => ({
          title: tpl.title,
          phase: tpl.phase,
        }));
        const emailResult = await sendOnboardingCompleteEmail({
          to:               me.email,
          name:             me.name ?? me.email,
          score:            result.totalScore,
          productTypes:     body.product_types,
          primaryRegulator: primaryRegulatorLabel(body.product_types),
          nextTasks,
          idempotencyKey:   `onboarding-complete/${userId}/${orgId}`,
        });
        if (!emailResult.success) {
          console.error('[onboarding] readiness-score email failed', {
            userId,
            orgId,
            to: me.email,
            error: emailResult.error,
          });
        } else {
          console.info('[onboarding] readiness-score email sent', {
            userId,
            orgId,
            resendId: emailResult.id,
          });
        }
      }

      return c.json({
        success: true as const,
        data: {
          score: result.totalScore,
          dimensions: result.dimensionScores,
          orgId,
          redirect: '/dashboard',
        },
      });
    } catch (err) {
      console.error('[onboarding] error', err);
      return c.json(
        {
          success: false as const,
          error: 'Onboarding failed. Please try again.',
          code: 'ONBOARDING_ERROR',
        },
        500,
      );
    }
  },
);
