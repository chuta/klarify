// Billing service — Korapay Checkout Standard integration.
// CLAUDE.md §3: Korapay is the payment provider (NOT Flutterwave/Stripe).
// CLAUDE.md §10: PLAN_LIMITS and PLAN_PRICING are the canonical tier definitions.
//
// V1 billing model (Korapay does not have a recurring API):
//   1. Backend creates a reference + inserts pending subscription row.
//   2. Frontend opens Korapay modal with that reference.
//   3. On charge.success webhook → activateSubscription() is called.
//   4. On period_end → plan is auto-downgraded to free; renewal email is sent.
//
// NGN prices are fixed here. We do NOT do live FX conversion in V1.
// See PLAN_PRICING_NGN for the Naira amounts shown to users.

import { randomBytes } from 'node:crypto';
import { prisma } from '../db.js';
import type { Plan } from '@klarify/core';
import {
  validateCouponForCheckout,
  type PaidPlan,
} from './couponService.js';

// ---------------------------------------------------------------------------
// NGN price table — mirrors PLAN_PRICING (CLAUDE.md §10) converted to Naira.
// ---------------------------------------------------------------------------
export const PLAN_PRICING_NGN: Record<
  Exclude<Plan, 'free'>,
  { monthly: number; annual: number }
> = {
  navigator: { monthly: 47_000,    annual: 445_000 },
  compass:   { monthly: 159_000,   annual: 1_520_000 },
  flagship:  { monthly: 479_000,   annual: 4_600_000 },
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckoutRef {
  reference: string;
  amount: number;
  originalAmount: number;
  discountAmount: number;
  currency: 'NGN';
  plan: Exclude<Plan, 'free'>;
  billingCycle: 'monthly' | 'annual';
  couponCode?: string;
  couponLabel?: string;
}

export interface SubscriptionStatus {
  plan: Plan;
  status: string;
  billingCycle: string | null;
  currentPeriodEnd: Date | null;
  seatsUsed: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Short (8-char hex) portion of the orgId for human-readable references. */
function shortOrgId(orgId: string): string {
  return orgId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

/** Cryptographically random 8-char uppercase reference suffix. */
function nanoRef(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

/** Add N months to a Date (calendar-month aware). */
function addMonths(d: Date, n: number): Date {
  const result = new Date(d);
  result.setUTCMonth(result.getUTCMonth() + n);
  return result;
}

// ---------------------------------------------------------------------------
// createCheckoutRef
// ---------------------------------------------------------------------------

/**
 * Initialise a billing checkout:
 *   1. Calculate amount from PLAN_PRICING_NGN.
 *   2. Insert a *pending* subscription row (or update an existing pending one).
 *   3. Return the checkout payload the frontend passes to Korapay.initialize().
 *
 * The active subscription is NOT affected — only a new pending row is created.
 * activateSubscription() will flip it to active on charge.success.
 */
export async function createCheckoutRef(
  orgId: string,
  plan: Exclude<Plan, 'free'>,
  billingCycle: 'monthly' | 'annual',
  couponCode?: string,
): Promise<CheckoutRef> {
  const prices = PLAN_PRICING_NGN[plan];
  const originalAmount = prices[billingCycle];
  let amount = originalAmount;
  let couponId: string | undefined;
  let couponLabel: string | undefined;
  let normalizedCode: string | undefined;

  if (couponCode && couponCode.trim().length > 0) {
    const validation = await validateCouponForCheckout({
      code: couponCode,
      orgId,
      plan: plan as PaidPlan,
      billingCycle,
    });
    if (!('couponId' in validation)) {
      throw new Error(validation.error);
    }
    amount = validation.discountedAmount;
    couponId = validation.couponId;
    couponLabel = validation.discountLabel;
    normalizedCode = validation.code;
  }

  const reference = `KLR-${shortOrgId(orgId)}-${nanoRef()}`;
  const discountAmount = originalAmount - amount;

  await prisma.subscription.create({
    data: {
      orgId,
      plan,
      billingCycle,
      korapayTransactionRef: reference,
      status: 'pending',
      currentPeriodEnd: null,
      couponId: couponId ?? null,
      originalAmount,
      discountAmount: discountAmount > 0 ? discountAmount : null,
    },
  });

  return {
    reference,
    amount,
    originalAmount,
    discountAmount,
    currency: 'NGN',
    plan,
    billingCycle,
    couponCode: normalizedCode,
    couponLabel,
  };
}

// ---------------------------------------------------------------------------
// activateSubscription
// ---------------------------------------------------------------------------

/**
 * Called by the charge.success webhook handler.
 * Finds the pending subscription by reference, sets it active, and updates
 * the org's plan. Idempotent — safe to call multiple times for the same ref.
 */
export async function activateSubscription(
  korapayRef: string,
): Promise<{ orgId: string; plan: Plan } | null> {
  const pending = await prisma.subscription.findFirst({
    where: { korapayTransactionRef: korapayRef },
  });

  if (!pending) {
    console.warn(`[billing] activateSubscription: ref not found — ${korapayRef}`);
    return null;
  }

  // Idempotency: already activated.
  if (pending.status === 'active') {
    return { orgId: pending.orgId, plan: pending.plan as Plan };
  }

  const billingCycle = (pending.billingCycle ?? 'monthly') as 'monthly' | 'annual';
  const months = billingCycle === 'annual' ? 12 : 1;
  const periodEnd = addMonths(new Date(), months);

  // Activate the pending row.
  await prisma.subscription.update({
    where: { id: pending.id },
    data: {
      status: 'active',
      currentPeriodEnd: periodEnd,
    },
  });

  // Cancel any other active subscription for this org (plan change).
  await prisma.subscription.updateMany({
    where: {
      orgId: pending.orgId,
      status: 'active',
      id: { not: pending.id },
    },
    data: { status: 'cancelled' },
  });

  // Update the org's plan field (used by the rate-limiter + feature gates).
  await prisma.organisation.update({
    where: { id: pending.orgId },
    data: { plan: pending.plan },
  });

  // Record coupon redemption if a code was applied at checkout.
  if (pending.couponId && pending.originalAmount !== null) {
    const owner = await prisma.orgMember.findFirst({
      where: { orgId: pending.orgId, role: 'owner' },
      orderBy: { createdAt: 'asc' },
      select: { userId: true },
    });
    if (owner) {
      const { recordCouponRedemption } = await import('./couponService.js');
      await recordCouponRedemption({
        couponId: pending.couponId,
        orgId: pending.orgId,
        userId: owner.userId,
        subscriptionId: pending.id,
        amountBefore: pending.originalAmount,
        amountAfter: pending.originalAmount - (pending.discountAmount ?? 0),
      }).catch((err: unknown) => {
        console.error('[billing] coupon redemption record failed', err);
      });
    }
  }

  return { orgId: pending.orgId, plan: pending.plan as Plan };
}

// ---------------------------------------------------------------------------
// cancelSubscription
// ---------------------------------------------------------------------------

/**
 * Cancel the active subscription for an org.
 * Access continues until current_period_end (Korapay has no refund API in V1).
 */
export async function cancelSubscription(orgId: string): Promise<void> {
  await prisma.subscription.updateMany({
    where: { orgId, status: 'active' },
    data: { status: 'cancelled' },
  });
  // Org plan is intentionally NOT changed here — user keeps access until period_end.
  // A daily cron (S5-D2) downgrades the org to 'free' after period_end passes.
}

// ---------------------------------------------------------------------------
// getSubscriptionStatus
// ---------------------------------------------------------------------------

export async function getSubscriptionStatus(
  orgId: string,
): Promise<SubscriptionStatus> {
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { plan: true, seatsUsed: true },
  });

  if (!org) {
    return {
      plan: 'free',
      status: 'active',
      billingCycle: null,
      currentPeriodEnd: null,
      seatsUsed: 0,
    };
  }

  // Prefer the active paid subscription row for billing metadata; fall back to
  // the most recent subscription of any status.
  const sub =
    (await prisma.subscription.findFirst({
      where: { orgId, status: 'active', plan: { not: 'free' } },
      orderBy: { createdAt: 'desc' },
    })) ??
    (await prisma.subscription.findFirst({
      where: { orgId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    })) ??
    (await prisma.subscription.findFirst({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    }));

  // organisations.plan is the source of truth for feature gates (updated on
  // activateSubscription and coupon redemption). Subscription rows carry
  // billing-cycle metadata.
  return {
    plan: (org.plan ?? 'free') as Plan,
    status: sub?.status ?? 'active',
    billingCycle: sub?.billingCycle ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    seatsUsed: org.seatsUsed,
  };
}

// ---------------------------------------------------------------------------
// ensureFreeTier
// ---------------------------------------------------------------------------

/**
 * Called from the onboarding route after an org is created.
 * Creates the free-plan subscription row if one doesn't already exist.
 */
export async function ensureFreeTier(orgId: string): Promise<void> {
  const existing = await prisma.subscription.findFirst({
    where: { orgId, status: 'active' },
  });
  if (existing) return;

  await prisma.subscription.create({
    data: {
      orgId,
      plan: 'free',
      billingCycle: null,
      status: 'active',
      currentPeriodEnd: null,
    },
  });
}
