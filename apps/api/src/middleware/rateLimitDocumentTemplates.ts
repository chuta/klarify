// =============================================================================
// Document-generator plan-tier gate (Sprint 4 — S4-B1c).
//
// Enforces `PLAN_LIMITS.document_templates` from CLAUDE.md §10 on the
// generator routes:
//
//   * POST /api/documents/generate
//   * POST /api/documents/generated/:id/regenerate
//
// Mirrors the Sprint 3 `rateLimitDocumentAnalyses.ts` pattern exactly:
//   * resolvePlan() — same source of truth.
//   * Redis counter keyed by user + calendar month.
//   * Counter incremented AFTER the row is durably persisted (no quota
//     burn on Claude failures, S3 failures, or 4xx validation rejections).
//   * Fail-closed in prod, fail-open in dev.
//
// Plan limits (CLAUDE.md §10):
//   free       → 0   (UPGRADE_REQUIRED — block entirely)
//   navigator  → 3   (DOCUMENT_TEMPLATE_LIMIT_REACHED — once hit)
//   compass    → Infinity
//   flagship   → Infinity
//
// Counter key: `doc_templates:{userId}:{YYYY}:{MM}` (per-user, not per-org —
// matches the Sprint 3 analyses gate so a multi-tenant operator can't
// rotate orgs to bypass the cap).
// =============================================================================
import type { Redis } from 'ioredis';
import { createMiddleware } from 'hono/factory';
import { PLAN_LIMITS, type Plan } from '@klarify/core';
import { getRedis, secondsUntilEndOfMonth } from '../redis.js';
import type { AuthVars } from './auth.js';
import { resolvePlan } from './rateLimitAI.js';

export interface DocumentTemplateRateLimitVars extends AuthVars {
  /** Resolved plan for the authenticated user. */
  plan: Plan;
  /** Current document-generation count for this calendar month. */
  documentTemplatesUsed: number;
  /** Plan limit (Infinity for compass/flagship, 0 for free, 3 for navigator). */
  documentTemplatesLimit: number;
  /**
   * Idempotent token-consume callback. Route handlers MUST call this once
   * after the generated_documents row is durably persisted. Calling it
   * more than once in the same request is a no-op.
   */
  consumeDocumentTemplateToken: () => Promise<void>;
}

// =============================================================================
// PURE HELPER — exposed for unit tests so every branch is exercised without
// hitting Hono / Redis / Prisma.
// =============================================================================

export type DocumentTemplateQuotaOutcome =
  | { outcome: 'free_blocked'; plan: Plan; limit: 0; used: 0; resetDate: string }
  | { outcome: 'limit_reached'; plan: Plan; limit: number; used: number; resetDate: string }
  | { outcome: 'unlimited'; plan: Plan; limit: number; used: 0; resetDate: string }
  | { outcome: 'allow'; plan: Plan; limit: number; used: number; resetDate: string }
  | { outcome: 'redis_unavailable_prod'; plan: Plan; limit: number; used: 0; resetDate: string }
  | { outcome: 'redis_unavailable_dev'; plan: Plan; limit: number; used: 0; resetDate: string };

/** Canonical key format for the monthly counter. Public for redis-cli inspection. */
export function documentTemplateCounterKey(userId: string, now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `doc_templates:${userId}:${yyyy}:${mm}`;
}

/** ISO date (YYYY-MM-DD) of the first day of next calendar month (UTC). */
export function nextMonthResetDate(now: Date): string {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return next.toISOString().slice(0, 10);
}

/**
 * Decide whether a document-generation request should be allowed. Pure —
 * does NOT mutate Redis. The matching consume callback handles INCR/TTL.
 */
export async function evaluateDocumentTemplateQuota(args: {
  plan: Plan;
  userId: string;
  redis: Redis | null;
  now: Date;
  isProduction: boolean;
}): Promise<DocumentTemplateQuotaOutcome> {
  const { plan, userId, redis, now, isProduction } = args;
  const limit = PLAN_LIMITS[plan].document_templates;
  const resetDate = nextMonthResetDate(now);

  if (limit === 0) {
    return { outcome: 'free_blocked', plan, limit: 0, used: 0, resetDate };
  }

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

  let used = 0;
  try {
    const raw = await redis.get(documentTemplateCounterKey(userId, now));
    used = raw ? Number.parseInt(raw, 10) : 0;
    if (!Number.isFinite(used) || used < 0) used = 0;
  } catch (err) {
    if (isProduction) {
      console.error(
        '[rateLimitDocumentTemplates] Redis read failed in prod:',
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
      '[rateLimitDocumentTemplates] Redis read failed — fail-open in dev:',
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

export const rateLimitDocumentTemplates = createMiddleware<{
  Variables: DocumentTemplateRateLimitVars;
}>(async (c, next) => {
  const userId = c.get('userId');
  const plan = await resolvePlan(userId);
  c.set('plan', plan);

  const redis = getRedis();
  const now = new Date();
  const isProduction = process.env.NODE_ENV === 'production';

  const result = await evaluateDocumentTemplateQuota({
    plan,
    userId,
    redis,
    now,
    isProduction,
  });

  c.set('documentTemplatesLimit', result.limit);
  c.set('documentTemplatesUsed', result.used);

  switch (result.outcome) {
    case 'free_blocked':
      return c.json(
        {
          success: false as const,
          error:
            'Document generation is not included in your current plan. Upgrade to Navigator to generate up to 3 documents per month, or to Compass for unlimited.',
          code: 'UPGRADE_REQUIRED',
          details: {
            plan: result.plan,
            limit: 0,
            used: 0,
            resetDate: result.resetDate,
            upgradeUrl: '/billing/upgrade',
          },
        },
        402,
      );

    case 'limit_reached':
      return c.json(
        {
          success: false as const,
          error: `You have generated all ${result.limit} documents included in your Navigator plan this month. Upgrade to Compass for unlimited generations, or wait until your quota resets on ${result.resetDate}.`,
          code: 'DOCUMENT_TEMPLATE_LIMIT_REACHED',
          details: {
            plan: result.plan,
            limit: result.limit,
            used: result.used,
            resetDate: result.resetDate,
            upgradeUrl: '/billing/upgrade',
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
      c.set('consumeDocumentTemplateToken', noopConsume);
      await next();
      return undefined;

    case 'allow': {
      const consume = makeConsumer({ redis: redis!, userId, now });
      c.set('consumeDocumentTemplateToken', consume);
      await next();
      return undefined;
    }
  }
});

const noopConsume = (): Promise<void> => Promise.resolve();

function makeConsumer(args: {
  redis: Redis;
  userId: string;
  now: Date;
}): () => Promise<void> {
  let consumed = false;
  return async (): Promise<void> => {
    if (consumed) return;
    consumed = true;
    const key = documentTemplateCounterKey(args.userId, args.now);
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
      console.error(
        '[rateLimitDocumentTemplates] consume failed:',
        err instanceof Error ? err.message : err,
      );
    }
  };
}
