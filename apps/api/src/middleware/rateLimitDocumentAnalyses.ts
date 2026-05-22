// =============================================================================
// Document-analysis plan-tier gate (Sprint 3 hotfix).
//
// Enforces `PLAN_LIMITS.document_analyses` from CLAUDE.md §10 on the two
// routes that consume the document analyser:
//
//   * POST /api/documents/upload      (multipart)
//   * POST /api/documents/analyse     (paste-text + future re-analysis)
//
// Why this lives in a separate file from `rateLimitAI.ts`:
//   * Different counter key + Redis namespace (`doc_analyses:*` vs `ai_queries:*`).
//   * Different increment semantics — AI chat charges on every attempt
//     (matches Anthropic billing reality); document analysis must NOT charge
//     for 400/413/415 rejections, so we increment AFTER success only.
//
// What we DO reuse from `rateLimitAI.ts`:
//   * `resolvePlan(userId)` — single source of truth for "what plan does this
//     user actually have?". Highest-tier org membership wins, matches AI chat.
//   * `getRedis()` + `secondsUntilEndOfMonth()` from `../redis.ts`.
//
// Response shape (CLAUDE.md §15 — API standards):
//   * Free plan blocked entirely      → 402, code: 'UPGRADE_REQUIRED'
//   * Paid plan over monthly limit    → 402, code: 'DOCUMENT_LIMIT_REACHED'
//   * Redis outage in prod            → 503, code: 'RATE_LIMITER_UNAVAILABLE'
//   * Redis outage in dev             → fail-open (so local dev isn't blocked)
// =============================================================================
import type { Redis } from 'ioredis';
import { createMiddleware } from 'hono/factory';
import { PLAN_LIMITS, type Plan } from '@klarify/core';
import {
  getRedis,
  documentAnalysisCounterKey,
  secondsUntilEndOfMonth,
} from '../redis.js';
import type { AuthVars } from './auth.js';
import { resolvePlan } from './rateLimitAI.js';

export interface DocumentAnalysisRateLimitVars extends AuthVars {
  /** Resolved plan for the authenticated user (highest-tier across orgs). */
  plan: Plan;
  /** Current document-analysis count for this calendar month. */
  documentAnalysesUsed: number;
  /** Plan limit (Infinity for compass/flagship, 0 for free, 5 for navigator). */
  documentAnalysesLimit: number;
  /**
   * Idempotent token-consume callback. The route handler MUST invoke this
   * once on the success path (after the document row is persisted) so that
   * a 4xx/5xx upstream failure does not burn the user's quota.
   *
   * Safe to call multiple times within a request — internally guarded so
   * we never double-charge the same request.
   */
  consumeDocumentAnalysisToken: () => Promise<void>;
}

// =============================================================================
// PURE HELPER — exported so unit tests can exercise every branch without
// touching Hono / prisma / a real Redis instance.
// =============================================================================

export type QuotaOutcome =
  | { outcome: 'free_blocked'; plan: Plan; limit: 0; used: 0; resetDate: string }
  | { outcome: 'limit_reached'; plan: Plan; limit: number; used: number; resetDate: string }
  | { outcome: 'unlimited'; plan: Plan; limit: number; used: 0; resetDate: string }
  | { outcome: 'allow'; plan: Plan; limit: number; used: number; resetDate: string }
  | { outcome: 'redis_unavailable_prod'; plan: Plan; limit: number; used: 0; resetDate: string }
  | { outcome: 'redis_unavailable_dev'; plan: Plan; limit: number; used: 0; resetDate: string };

/** ISO date (YYYY-MM-DD) of the first day of next calendar month (UTC). */
export function nextMonthResetDate(now: Date): string {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return next.toISOString().slice(0, 10);
}

/**
 * Decide whether a document-analysis request should be allowed based on the
 * user's plan and current monthly count. Does NOT mutate Redis — that's the
 * job of `consumeDocumentAnalysisToken`, which runs only on the success path.
 */
export async function evaluateDocumentAnalysisQuota(args: {
  plan: Plan;
  userId: string;
  redis: Redis | null;
  now: Date;
  isProduction: boolean;
}): Promise<QuotaOutcome> {
  const { plan, userId, redis, now, isProduction } = args;
  const limit = PLAN_LIMITS[plan].document_analyses;
  const resetDate = nextMonthResetDate(now);

  // Free tier — limit is zero, block before any I/O.
  if (limit === 0) {
    return { outcome: 'free_blocked', plan, limit: 0, used: 0, resetDate };
  }

  // Compass / Flagship — unlimited. Don't burn Redis writes on tiers that
  // can never hit a ceiling.
  if (!Number.isFinite(limit)) {
    return { outcome: 'unlimited', plan, limit, used: 0, resetDate };
  }

  if (!redis) {
    if (isProduction) {
      return {
        outcome: 'redis_unavailable_prod',
        plan,
        limit,
        used: 0,
        resetDate,
      };
    }
    return {
      outcome: 'redis_unavailable_dev',
      plan,
      limit,
      used: 0,
      resetDate,
    };
  }

  // Read-only check — do NOT increment here.
  let used = 0;
  try {
    const raw = await redis.get(documentAnalysisCounterKey(userId, now));
    used = raw ? Number.parseInt(raw, 10) : 0;
    if (!Number.isFinite(used) || used < 0) used = 0;
  } catch (err) {
    if (isProduction) {
      console.error(
        '[rateLimitDocumentAnalyses] Redis read failed in prod:',
        err instanceof Error ? err.message : err,
      );
      return {
        outcome: 'redis_unavailable_prod',
        plan,
        limit,
        used: 0,
        resetDate,
      };
    }
    console.warn(
      '[rateLimitDocumentAnalyses] Redis read failed — fail-open in dev:',
      err instanceof Error ? err.message : err,
    );
    return {
      outcome: 'redis_unavailable_dev',
      plan,
      limit,
      used: 0,
      resetDate,
    };
  }

  if (used >= limit) {
    return { outcome: 'limit_reached', plan, limit, used, resetDate };
  }
  return { outcome: 'allow', plan, limit, used, resetDate };
}

// =============================================================================
// HONO MIDDLEWARE
// =============================================================================

export const rateLimitDocumentAnalyses = createMiddleware<{
  Variables: DocumentAnalysisRateLimitVars;
}>(async (c, next) => {
  const userId = c.get('userId');
  const plan = await resolvePlan(userId);
  c.set('plan', plan);

  const redis = getRedis();
  const now = new Date();
  const isProduction = process.env.NODE_ENV === 'production';

  const result = await evaluateDocumentAnalysisQuota({
    plan,
    userId,
    redis,
    now,
    isProduction,
  });

  c.set('documentAnalysesLimit', result.limit);
  c.set('documentAnalysesUsed', result.used);

  switch (result.outcome) {
    case 'free_blocked':
      return c.json(
        {
          success: false as const,
          error:
            'Document analysis is not included in your current plan. Upgrade to Navigator to analyse up to 5 documents per month, or to Compass for unlimited analyses.',
          code: 'UPGRADE_REQUIRED',
          details: {
            plan: result.plan,
            limit: 0,
            used: 0,
            resetDate: result.resetDate,
            upgradeUrl: '/dashboard/billing',
          },
        },
        402,
      );

    case 'limit_reached':
      return c.json(
        {
          success: false as const,
          error: `You have used all ${result.limit} document analyses included in your Navigator plan this month. Upgrade to Compass for unlimited analyses, or wait until your quota resets on ${result.resetDate}.`,
          code: 'DOCUMENT_LIMIT_REACHED',
          details: {
            plan: result.plan,
            limit: result.limit,
            used: result.used,
            resetDate: result.resetDate,
            upgradeUrl: '/dashboard/billing',
          },
        },
        402,
      );

    case 'redis_unavailable_prod':
      return c.json(
        {
          success: false as const,
          error: 'Service temporarily unavailable. Please try again shortly.',
          code: 'RATE_LIMITER_UNAVAILABLE',
        },
        503,
      );

    case 'unlimited':
    case 'redis_unavailable_dev':
      // Unlimited tier — or dev fail-open: pass through with a no-op consume.
      c.set('consumeDocumentAnalysisToken', noopConsume);
      await next();
      return undefined;

    case 'allow': {
      // Bind a single-shot consume that the route handler must invoke once
      // the document is durably created. We close over the request-scoped
      // `redis`, `now`, `userId` so the handler doesn't need to re-derive them.
      const consume = makeConsumer({ redis: redis!, userId, now });
      c.set('consumeDocumentAnalysisToken', consume);
      await next();
      return undefined;
    }
  }
});

const noopConsume = (): Promise<void> => Promise.resolve();

/**
 * Build a one-shot consume callback. The first call performs the INCR (+
 * sets TTL if this is the first counter write of the month). Subsequent
 * calls within the same request are no-ops — handlers can call it
 * defensively without risk of double-counting.
 */
function makeConsumer(args: {
  redis: Redis;
  userId: string;
  now: Date;
}): () => Promise<void> {
  let consumed = false;
  return async (): Promise<void> => {
    if (consumed) return;
    consumed = true;
    const key = documentAnalysisCounterKey(args.userId, args.now);
    try {
      const pipeline = args.redis.pipeline();
      pipeline.incr(key);
      pipeline.ttl(key);
      const replies = await pipeline.exec();
      const ttlReply = replies?.[1];
      const ttlValue = ttlReply ? Number(ttlReply[1]) : -1;
      if (ttlValue === -1) {
        await args.redis.expire(key, secondsUntilEndOfMonth(args.now));
      }
    } catch (err) {
      // We've already returned 2xx to the client by now (consume is called
      // from the route's success branch). Log + swallow so a Redis blip
      // doesn't crash the worker — the worst case is one un-counted
      // analysis, which is acceptable.
      console.error(
        '[rateLimitDocumentAnalyses] consume failed:',
        err instanceof Error ? err.message : err,
      );
    }
  };
}
