// =============================================================================
// lifecycleDripService.ts — onboarding_launch_v1 nurture sequence (Day 2–9)
//
// Called by jobs/lifecycleDrips.ts daily cron. Sends React Email templates via
// @klarify/email with preference checks, skip rules, and email_drip_log writes.
// =============================================================================

import {
  buildDripIdempotencyKey,
  ONBOARDING_LAUNCH_DRIP,
  type DripSkipCondition,
  type DripStepDefinition,
} from '@klarify/email';
import { prisma } from '../db.js';
import {
  sendLifecycleDripEmail,
  buildUnsubscribeUrl,
  type LifecycleDripStepId,
} from './emailService.js';

const PAID_PLANS = new Set(['navigator', 'compass', 'flagship']);

/** Steps handled by the daily cron (event-driven steps excluded). */
export const CRON_DRIP_STEP_IDS = new Set<string>([
  'readiness_explained',
  'post_letter_case_study',
  'plan_comparison',
  'launch_offer_expiry',
]);

export interface UserDripContext {
  userId: string;
  email: string;
  name: string;
  createdAt: Date;
  onboardingComplete: boolean;
  hasClassification: boolean;
  hasPaidPlan: boolean;
  hasLaunchCouponRedemption: boolean;
  score: number | null;
  currentPlan: string;
}

export interface LaunchOfferConfig {
  couponCode: string;
  discountPercent: number;
  expiryDateLabel: string;
}

export function daysSinceSignup(signupAt: Date, now: Date = new Date()): number {
  const start = new Date(signupAt);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  return Math.floor((end.getTime() - start.getTime()) / (86_400_000));
}

export function getLaunchOfferConfig(signupAt: Date): LaunchOfferConfig {
  const couponCode = process.env.LAUNCH_COUPON_CODE?.trim() || 'LAUNCH20';
  const discountPercent = Number(process.env.LAUNCH_COUPON_DISCOUNT_PERCENT ?? 20);
  const overrideLabel = process.env.LAUNCH_OFFER_EXPIRY_LABEL?.trim();

  if (overrideLabel) {
    return { couponCode, discountPercent, expiryDateLabel: overrideLabel };
  }

  const validDays = Number(process.env.LAUNCH_COUPON_VALID_DAYS ?? 10);
  const expiry = new Date(signupAt);
  expiry.setUTCDate(expiry.getUTCDate() + validDays);

  return {
    couponCode,
    discountPercent,
    expiryDateLabel: expiry.toLocaleDateString('en-NG', {
      weekday: 'long',
      day:     'numeric',
      month:   'long',
      year:    'numeric',
    }),
  };
}

export function shouldSkipStep(
  step: DripStepDefinition,
  ctx: UserDripContext,
): boolean {
  if (!step.skipIf?.length) return false;
  for (const condition of step.skipIf) {
    if (evaluateSkipCondition(condition, ctx)) return true;
  }
  return false;
}

function evaluateSkipCondition(
  condition: DripSkipCondition,
  ctx: UserDripContext,
): boolean {
  switch (condition) {
    case 'onboarding_incomplete':
      return !ctx.onboardingComplete;
    case 'has_classification':
      return ctx.hasClassification;
    case 'has_paid_plan':
      return ctx.hasPaidPlan;
    case 'coupon_redeemed':
      return ctx.hasLaunchCouponRedemption;
    default:
      return false;
  }
}

function isLifecycleDripsEnabled(): boolean {
  const flag = process.env.LAUNCH_DRIP_ENABLED?.trim().toLowerCase();
  if (flag === 'false' || flag === '0') return false;
  return true;
}

async function buildUserContext(user: {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  createdAt: Date;
  profile: { stage: string | null; lastClassifiedAt: Date | null } | null;
  ownedOrgs: Array<{
    plan: string;
    subscriptions: Array<{ plan: string; status: string }>;
    productClassifications: Array<{ id: string }>;
    readinessScores: Array<{ totalScore: number }>;
  }>;
  couponRedemptions: Array<{ id: string; coupon: { code: string } }>;
}): Promise<UserDripContext | null> {
  // Nurture drips target org owners (founders), not invited team members.
  if (user.ownedOrgs.length === 0) return null;

  const org = user.ownedOrgs[0]!;
  const launchCouponCode = process.env.LAUNCH_COUPON_CODE?.trim() || 'LAUNCH20';

  const hasPaidOnOrg =
    PAID_PLANS.has(org.plan) ||
    org.subscriptions.some(
      (s) => s.status === 'active' && PAID_PLANS.has(s.plan),
    );

  const hasPaidPlan = hasPaidOnOrg || PAID_PLANS.has(user.plan);

  const hasClassification =
    user.profile?.lastClassifiedAt != null ||
    org.productClassifications.length > 0;

  const onboardingComplete =
    user.profile?.stage != null && org.readinessScores.length > 0;

  const hasLaunchCouponRedemption = user.couponRedemptions.some(
    (r) => r.coupon.code.toLowerCase() === launchCouponCode.toLowerCase(),
  );

  return {
    userId:                      user.id,
    email:                       user.email,
    name:                        user.name ?? user.email,
    createdAt:                   user.createdAt,
    onboardingComplete,
    hasClassification,
    hasPaidPlan,
    hasLaunchCouponRedemption,
    score:                       org.readinessScores[0]?.totalScore ?? null,
    currentPlan:                 hasPaidPlan ? org.plan : user.plan,
  };
}

async function dispatchStep(
  stepId: string,
  ctx: UserDripContext,
): Promise<{ sent: boolean; resendId?: string }> {
  const unsubscribeUrl = buildUnsubscribeUrl(ctx.userId, 'email_lifecycle');
  const idempotencyKey = buildDripIdempotencyKey(
    ONBOARDING_LAUNCH_DRIP.id,
    stepId,
    ctx.userId,
  );

  switch (stepId as LifecycleDripStepId) {
    case 'readiness_explained':
      return sendLifecycleDripEmail({
        stepId: 'readiness_explained',
        userId: ctx.userId,
        to:     ctx.email,
        idempotencyKey,
        props: {
          name:            ctx.name,
          score:           ctx.score ?? undefined,
          unsubscribeUrl,
        },
      });

    case 'post_letter_case_study':
      return sendLifecycleDripEmail({
        stepId: 'post_letter_case_study',
        userId: ctx.userId,
        to:     ctx.email,
        idempotencyKey,
        props: {
          name:            ctx.name,
          unsubscribeUrl,
        },
      });

    case 'plan_comparison':
      return sendLifecycleDripEmail({
        stepId: 'plan_comparison',
        userId: ctx.userId,
        to:     ctx.email,
        idempotencyKey,
        props: {
          name:            ctx.name,
          currentPlan:     ctx.currentPlan,
          unsubscribeUrl,
        },
      });

    case 'launch_offer_expiry': {
      const offer = getLaunchOfferConfig(ctx.createdAt);
      return sendLifecycleDripEmail({
        stepId: 'launch_offer_expiry',
        userId: ctx.userId,
        to:     ctx.email,
        idempotencyKey,
        props: {
          name:              ctx.name,
          couponCode:        offer.couponCode,
          expiryDateLabel:   offer.expiryDateLabel,
          discountPercent:   offer.discountPercent,
          recommendedPlan: 'compass',
          unsubscribeUrl,
        },
      });
    }

    default:
      return { sent: false };
  }
}

async function recordDripSent(
  userId: string,
  stepId: string,
  resendId?: string,
): Promise<void> {
  await prisma.emailDripLog.create({
    data: {
      userId,
      sequenceId: ONBOARDING_LAUNCH_DRIP.id,
      stepId,
      resendId:   resendId ?? null,
    },
  });
}

export interface LifecycleDripRunResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
}

/**
 * Process all eligible users for today's lifecycle drip steps.
 * Intended to run once daily at 09:00 Lagos time.
 */
export async function runLifecycleDrips(
  now: Date = new Date(),
): Promise<LifecycleDripRunResult> {
  if (!isLifecycleDripsEnabled()) {
    console.warn('[cron/lifecycleDrips] disabled via LAUNCH_DRIP_ENABLED');
    return { processed: 0, sent: 0, skipped: 0, failed: 0 };
  }

  const result: LifecycleDripRunResult = {
    processed: 0,
    sent:      0,
    skipped:   0,
    failed:    0,
  };

  const cronSteps = ONBOARDING_LAUNCH_DRIP.steps.filter((s) =>
    CRON_DRIP_STEP_IDS.has(s.id),
  );

  const users = await prisma.user.findMany({
    where: {
      ownedOrgs: { some: {} },
    },
    include: {
      profile: true,
      ownedOrgs: {
        include: {
          subscriptions: {
            where: { status: 'active' },
            select: { plan: true, status: true },
          },
          productClassifications: { take: 1, select: { id: true } },
          readinessScores: {
            orderBy: { calculatedAt: 'desc' },
            take:    1,
            select:  { totalScore: true },
          },
        },
      },
      couponRedemptions: {
        take: 5,
        select: {
          id: true,
          coupon: { select: { code: true } },
        },
      },
      emailDripLogs: {
        where: { sequenceId: ONBOARDING_LAUNCH_DRIP.id },
        select: { stepId: true },
      },
    },
  });

  for (const user of users) {
    const ctx = await buildUserContext(user);
    if (!ctx) continue;

    const days = daysSinceSignup(ctx.createdAt, now);
    const sentStepIds = new Set(user.emailDripLogs.map((l) => l.stepId));

    for (const step of cronSteps) {
      if (step.dayOffset !== days) continue;
      if (sentStepIds.has(step.id)) {
        result.skipped += 1;
        continue;
      }

      result.processed += 1;

      if (shouldSkipStep(step, ctx)) {
        result.skipped += 1;
        continue;
      }

      try {
        const outcome = await dispatchStep(step.id, ctx);
        if (outcome.sent) {
          await recordDripSent(ctx.userId, step.id, outcome.resendId);
          result.sent += 1;
        } else {
          result.skipped += 1;
        }
      } catch (err) {
        result.failed += 1;
        console.error('[cron/lifecycleDrips] send failed', {
          userId: ctx.userId,
          stepId: step.id,
          err,
        });
      }
    }
  }

  return result;
}
