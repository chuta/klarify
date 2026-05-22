// Coupon validation and redemption — Sprint 6A marketing codes.

import type { Plan } from '@klarify/core';
import type { Coupon } from '@prisma/client';
import { prisma } from '../db.js';
import { PLAN_PRICING_NGN } from './billing.js';

export type PaidPlan = Exclude<Plan, 'free'>;

export interface CouponApplyResult {
  couponId: string;
  code: string;
  description: string | null;
  originalAmount: number;
  discountedAmount: number;
  discountAmount: number;
  discountLabel: string;
}

export interface CouponValidationError {
  valid: false;
  error: string;
  code: string;
}

export type CouponValidationResult = CouponApplyResult | CouponValidationError;

const MIN_CHARGE_NGN = 100;

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function applyDiscount(originalAmount: number, coupon: Pick<Coupon, 'discountType' | 'discountValue'>): number {
  const value = Number(coupon.discountValue);
  let discounted = originalAmount;

  if (coupon.discountType === 'percent') {
    discounted = Math.round(originalAmount * (1 - value / 100));
  } else {
    discounted = Math.round(originalAmount - value);
  }

  return Math.max(MIN_CHARGE_NGN, Math.min(originalAmount, discounted));
}

export function formatDiscountLabel(coupon: Pick<Coupon, 'discountType' | 'discountValue'>): string {
  const value = Number(coupon.discountValue);
  if (coupon.discountType === 'percent') {
    return `${value}% off`;
  }
  return `₦${value.toLocaleString()} off`;
}

function planAllowed(coupon: Coupon, plan: PaidPlan): boolean {
  if (coupon.applicablePlans.includes('all')) return true;
  return coupon.applicablePlans.includes(plan);
}

function cycleAllowed(coupon: Coupon, billingCycle: 'monthly' | 'annual'): boolean {
  return coupon.billingCycles.includes(billingCycle);
}

function isWithinValidityWindow(coupon: Coupon, now = new Date()): boolean {
  if (!coupon.isActive) return false;
  if (coupon.validFrom > now) return false;
  if (coupon.validUntil && coupon.validUntil < now) return false;
  return true;
}

async function orgRedemptionCount(couponId: string, orgId: string): Promise<number> {
  return prisma.couponRedemption.count({
    where: { couponId, orgId },
  });
}

export async function findCouponByCode(code: string): Promise<Coupon | null> {
  const normalized = normalizeCouponCode(code);
  return prisma.coupon.findFirst({
    where: { code: { equals: normalized, mode: 'insensitive' } },
  });
}

export async function validateCouponForCheckout(params: {
  code: string;
  orgId: string;
  plan: PaidPlan;
  billingCycle: 'monthly' | 'annual';
}): Promise<CouponValidationResult> {
  const coupon = await findCouponByCode(params.code);
  if (!coupon) {
    return { valid: false, error: 'Coupon code not found.', code: 'COUPON_NOT_FOUND' };
  }

  if (!isWithinValidityWindow(coupon)) {
    return { valid: false, error: 'This coupon is not active or has expired.', code: 'COUPON_INACTIVE' };
  }

  if (!planAllowed(coupon, params.plan)) {
    return { valid: false, error: 'This coupon does not apply to the selected plan.', code: 'COUPON_PLAN_MISMATCH' };
  }

  if (!cycleAllowed(coupon, params.billingCycle)) {
    return {
      valid: false,
      error: 'This coupon does not apply to the selected billing cycle.',
      code: 'COUPON_CYCLE_MISMATCH',
    };
  }

  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) {
    return { valid: false, error: 'This coupon has reached its redemption limit.', code: 'COUPON_EXHAUSTED' };
  }

  const orgUses = await orgRedemptionCount(coupon.id, params.orgId);
  if (orgUses >= coupon.maxPerOrg) {
    return {
      valid: false,
      error: 'Your organisation has already used this coupon.',
      code: 'COUPON_ALREADY_REDEEMED',
    };
  }

  const originalAmount = PLAN_PRICING_NGN[params.plan][params.billingCycle];
  const discountedAmount = applyDiscount(originalAmount, coupon);
  const discountAmount = originalAmount - discountedAmount;

  return {
    couponId: coupon.id,
    code: normalizeCouponCode(coupon.code),
    description: coupon.description,
    originalAmount,
    discountedAmount,
    discountAmount,
    discountLabel: formatDiscountLabel(coupon),
  };
}

export async function recordCouponRedemption(params: {
  couponId: string;
  orgId: string;
  userId: string;
  subscriptionId: string;
  amountBefore: number;
  amountAfter: number;
}): Promise<void> {
  const existing = await prisma.couponRedemption.findUnique({
    where: { subscriptionId: params.subscriptionId },
  });
  if (existing) return;

  await prisma.$transaction(async (tx) => {
    const dup = await tx.couponRedemption.findUnique({
      where: {
        couponId_orgId: {
          couponId: params.couponId,
          orgId: params.orgId,
        },
      },
    });
    if (dup) return;

    await tx.couponRedemption.create({
      data: {
        couponId: params.couponId,
        orgId: params.orgId,
        userId: params.userId,
        subscriptionId: params.subscriptionId,
        amountBefore: params.amountBefore,
        amountAfter: params.amountAfter,
      },
    });

    await tx.coupon.update({
      where: { id: params.couponId },
      data: { redemptionCount: { increment: 1 } },
    });
  });
}
