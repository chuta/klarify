// =============================================================================
// AI query rate-limit middleware (CLAUDE.md §15 — "Rate limiting on all AI
// endpoints: 10/min (free), 60/min (navigator), unlimited (compass/flagship)").
//
// Sprint 2 implements MONTHLY quotas (the dominant constraint per §10):
//   free:      10 queries / month
//   navigator: 50 queries / month
//   compass:   unlimited
//   flagship:  unlimited
//
// Per-minute throttling will land alongside Stripe-billed plan upgrades in
// Sprint 5 — for MVP we only need the monthly window because that's what
// fee-bearing customers actually hit.
//
// Storage: Redis key `ai_queries:{userId}:{YYYY}:{MM}` with TTL set to expire
// on the first of next month UTC. INCR is atomic; we only count + check once
// per request and never have to worry about race conditions.
//
// Behaviour on Redis outage:
//   * dev (NODE_ENV !== 'production'):  log + fail-open so local Sprint work
//                                       isn't blocked when Redis is down
//   * prod:                             403 with a clear message — we'd rather
//                                       reject than silently let the Claude
//                                       bill run unbounded
// =============================================================================
import { createMiddleware } from 'hono/factory';
import { Prisma } from '@prisma/client';
import { PLAN_LIMITS, type Plan } from '@klarify/core';
import { prisma } from '../db.js';
import {
  getRedis,
  aiQueryCounterKey,
  secondsUntilEndOfMonth,
} from '../redis.js';
import type { AuthVars } from './auth.js';

export interface RateLimitVars extends AuthVars {
  /** Resolved plan for the authenticated user (highest-tier across orgs). */
  plan: Plan;
  /** Current count for this calendar month — used by the chat handler to */
  /** include `X-AI-Queries-Used` headers / metadata in the response. */
  aiQueriesUsed: number;
  /** Limit for the resolved plan (Infinity for compass/flagship). */
  aiQueriesLimit: number;
}

const RESET_DATE_FORMAT = (now: Date): string => {
  // ISO date of the first day of next calendar month (UTC).
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return next.toISOString().slice(0, 10); // YYYY-MM-DD
};

/**
 * Resolve the user's effective plan from their highest-tier org membership.
 * A user with both a free personal org and a compass-tier workspace gets the
 * compass quota — matches what they (or their employer) actually paid for.
 */
async function resolvePlan(userId: string): Promise<Plan> {
  const rows = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true)`,
      userId,
    );
    return tx.orgMember.findMany({
      where: { userId },
      include: { org: { select: { plan: true } } },
    });
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
  return best;
}

/**
 * Middleware: enforce the monthly AI query quota.
 *
 * Mounts AFTER requireAuth (needs `userId`). Increments the counter on EVERY
 * request that reaches the AI handler — so request that fails downstream
 * (Claude 503, etc.) still consumes a token. We accept that trade-off: the
 * alternative (decrement on failure) is racy and complex, and Claude failures
 * are rare. Plus the user usually retries anyway.
 */
export const rateLimitAI = createMiddleware<{ Variables: RateLimitVars }>(
  async (c, next) => {
    const userId = c.get('userId');
    const plan = await resolvePlan(userId);
    const limit = PLAN_LIMITS[plan].ai_queries_monthly;

    c.set('plan', plan);
    c.set('aiQueriesLimit', limit);

    // Unlimited tiers — short-circuit without touching Redis.
    if (!Number.isFinite(limit)) {
      c.set('aiQueriesUsed', 0);
      await next();
      return undefined;
    }

    const redis = getRedis();
    const now = new Date();
    const key = aiQueryCounterKey(userId, now);

    if (!redis) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[rateLimitAI] Redis unavailable — refusing AI request');
        return c.json(
          {
            success: false as const,
            error: 'Service temporarily unavailable. Please try again shortly.',
            code: 'RATE_LIMITER_UNAVAILABLE',
          },
          503,
        );
      }
      console.warn('[rateLimitAI] Redis unavailable — fail-open in dev');
      c.set('aiQueriesUsed', 0);
      await next();
      return undefined;
    }

    let used: number;
    try {
      // Atomic INCR — single round-trip. We only set TTL on first INCR
      // (when the value is exactly 1) to avoid resetting the expiry on every
      // call (which would keep the window open forever).
      const pipeline = redis.pipeline();
      pipeline.incr(key);
      pipeline.ttl(key);
      const replies = await pipeline.exec();

      if (!replies || replies.length !== 2) {
        throw new Error('Unexpected Redis pipeline reply shape');
      }
      const incrReply = replies[0]!;
      const ttlReply = replies[1]!;
      if (incrReply[0]) throw incrReply[0];
      if (ttlReply[0]) throw ttlReply[0];

      used = Number(incrReply[1]);
      const ttlSeconds = Number(ttlReply[1]);

      // -1 = no TTL set yet (fresh key). Set it to end of month.
      if (ttlSeconds === -1) {
        await redis.expire(key, secondsUntilEndOfMonth(now));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (process.env.NODE_ENV === 'production') {
        console.error('[rateLimitAI] Redis error in prod:', msg);
        return c.json(
          {
            success: false as const,
            error: 'Service temporarily unavailable. Please try again shortly.',
            code: 'RATE_LIMITER_UNAVAILABLE',
          },
          503,
        );
      }
      console.warn('[rateLimitAI] Redis error — fail-open in dev:', msg);
      c.set('aiQueriesUsed', 0);
      await next();
      return undefined;
    }

    // Block on or after the limit. The INCR has already happened, so e.g.
    // for a free user `used === 11` means they just made their 11th request
    // and we refuse it. Pre-decrement would be racy across processes.
    if (used > limit) {
      // Don't undo the INCR — once they're over, every subsequent attempt
      // continues to bump the counter so analytics can see the abuse.
      return c.json(
        {
          success: false as const,
          error:
            plan === 'free'
              ? 'You have used your 10 free AI queries this month. Upgrade to continue.'
              : 'Monthly AI query limit reached. Upgrade to unlock unlimited queries.',
          code: 'QUERY_LIMIT_REACHED',
          details: {
            plan,
            limit,
            used,
            resetDate: RESET_DATE_FORMAT(now),
            upgradeUrl: '/billing/upgrade',
          },
        },
        402,
      );
    }

    c.set('aiQueriesUsed', used);
    await next();
    return undefined;
  },
);
