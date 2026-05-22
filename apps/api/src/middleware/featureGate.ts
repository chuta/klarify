// Feature gate middleware — CLAUDE.md §10, Sprint 5 Phase A.
//
// requireFeature(feature) checks the user's plan against PLAN_LIMITS.
// Returns 402 if the feature is not available on their current plan.
//
// Plan resolution uses the org's stored plan field (updated by activateSubscription).
// The plan is cached in Redis for 60 seconds to avoid a DB round-trip on every request.
//
// PLAN_LIMITS is the canonical source — CLAUDE.md §18: do NOT modify without sign-off.

import { createMiddleware } from 'hono/factory';
import { PLAN_LIMITS, type Plan } from '@klarify/core';
import { prisma } from '../db.js';
import { getRedis } from '../redis.js';
import type { AuthVars } from './auth.js';

export type FeatureKey = keyof typeof PLAN_LIMITS['free'];

// 60-second TTL for the plan cache.
const PLAN_CACHE_TTL = 60;

/**
 * Resolve the user's effective plan from their highest-tier org membership.
 * Caches in Redis for 60s. Mirrors resolvePlan() in rateLimitAI.ts but is
 * separate because feature gating uses the org plan (billing), not the user
 * plan (rate limit), as the source of truth.
 */
export async function resolveOrgPlan(userId: string): Promise<Plan> {
  const redis = getRedis();
  const cacheKey = `plan:${userId}`;

  // Try Redis cache first.
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return cached as Plan;
    } catch {
      // Redis unavailable — fall through to DB.
    }
  }

  const rows = await prisma.orgMember.findMany({
    where: { userId },
    include: { org: { select: { plan: true } } },
  });

  const planRank: Record<Plan, number> = {
    free: 0,
    navigator: 1,
    compass: 2,
    flagship: 3,
  };

  let best: Plan = 'free';
  for (const r of rows) {
    const p = (r.org.plan ?? 'free') as Plan;
    if ((planRank[p] ?? -1) > planRank[best]) best = p;
  }

  // Cache the resolved plan.
  if (redis) {
    try {
      await redis.set(cacheKey, best, 'EX', PLAN_CACHE_TTL);
    } catch {
      // Non-fatal.
    }
  }

  return best;
}

/**
 * Determine the minimum plan that has the given feature enabled.
 */
function minimumPlanForFeature(feature: FeatureKey): Plan {
  const order: Plan[] = ['free', 'navigator', 'compass', 'flagship'];
  for (const plan of order) {
    const limit = PLAN_LIMITS[plan][feature];
    if (limit === true || (typeof limit === 'number' && limit > 0)) {
      return plan;
    }
  }
  return 'flagship';
}

/**
 * Middleware factory: require a feature flag to be truthy for the user's plan.
 *
 * Usage:
 *   router.get('/api/arip', requireAuth, requireFeature('arip_tracker'), handler)
 *
 * Returns 402 with upgrade information if the feature is unavailable.
 */
export function requireFeature(feature: FeatureKey) {
  return createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
    const userId = c.get('userId');
    const plan = await resolveOrgPlan(userId);
    const limit = PLAN_LIMITS[plan][feature];

    const allowed =
      limit === true ||
      limit === 'priority' ||
      limit === 'pdf' ||
      limit === 'full' ||
      (typeof limit === 'number' && limit > 0);

    if (!allowed) {
      const requiredPlan = minimumPlanForFeature(feature);
      return c.json(
        {
          success: false as const,
          error: `This feature requires the ${requiredPlan} plan or higher.`,
          code: 'PLAN_LIMIT_REACHED',
          details: {
            feature,
            currentPlan: plan,
            requiredPlan,
            upgradeUrl: '/dashboard/billing',
          },
        },
        402,
      );
    }

    await next();
    return undefined;
  });
}
