import type { Plan } from '@klarify/core';
import { prisma } from '@/lib/db';

/** NGN price table — mirrors apps/api/src/services/billing.ts PLAN_PRICING_NGN. */
export const PLAN_PRICING_NGN: Record<
  Exclude<Plan, 'free'>,
  { monthly: number; annual: number }
> = {
  navigator: { monthly: 47_000, annual: 445_000 },
  compass: { monthly: 159_000, annual: 1_520_000 },
  flagship: { monthly: 479_000, annual: 4_600_000 },
} as const;

export interface SubscriptionStatusData {
  plan: Plan;
  status: string;
  billingCycle: string | null;
  currentPeriodEnd: string | null;
  seatsUsed: number;
  pricing: Record<string, { monthly: number; annual: number }>;
}

const VALID_PLANS: readonly Plan[] = ['free', 'navigator', 'compass', 'flagship'];

export function defaultSubscriptionStatus(
  plan: Plan = 'free',
): SubscriptionStatusData {
  return {
    plan,
    status: 'active',
    billingCycle: null,
    currentPeriodEnd: null,
    seatsUsed: plan === 'free' ? 0 : 1,
    pricing: { ...PLAN_PRICING_NGN },
  };
}

/** Merge API/SSR payloads so client renders never lose pricing or a valid plan. */
export function normalizeSubscriptionStatus(
  data: Partial<SubscriptionStatusData> | undefined | null,
  fallback?: SubscriptionStatusData,
): SubscriptionStatusData {
  const base = fallback ?? defaultSubscriptionStatus();
  if (!data) return base;

  const plan = VALID_PLANS.includes(data.plan as Plan)
    ? (data.plan as Plan)
    : base.plan;

  const pricing =
    data.pricing && typeof data.pricing === 'object'
      ? { ...PLAN_PRICING_NGN, ...data.pricing }
      : base.pricing;

  return {
    plan,
    status: typeof data.status === 'string' ? data.status : base.status,
    billingCycle: data.billingCycle ?? base.billingCycle,
    currentPeriodEnd:
      data.currentPeriodEnd === undefined ? base.currentPeriodEnd : data.currentPeriodEnd,
    seatsUsed:
      typeof data.seatsUsed === 'number' ? data.seatsUsed : base.seatsUsed,
    pricing,
  };
}

/** organisations.plan + subscription row metadata (same logic as Fly billing service). */
export async function getSubscriptionStatusForOrg(
  orgId: string,
): Promise<SubscriptionStatusData> {
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { plan: true, seatsUsed: true },
  });

  if (!org) {
    return defaultSubscriptionStatus();
  }

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

  const plan = (org.plan ?? 'free') as Plan;

  return normalizeSubscriptionStatus({
    plan,
    status: sub?.status ?? 'active',
    billingCycle: sub?.billingCycle ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    seatsUsed: org.seatsUsed,
  });
}
