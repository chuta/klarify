// =============================================================================
// Sprint 4 — Document-generator plan-tier gate pure-helper tests.
//
// Mirrors the Sprint 3 planGating tests in shape. Tests the pure quota
// evaluator in `rateLimitDocumentTemplates.ts` against the four states the
// middleware can be in: free_blocked / limit_reached / allow / unlimited,
// plus Redis outage in dev (fail-open) and in prod (fail-closed).
// =============================================================================
import { describe, expect, it } from 'vitest';
import type { Redis } from 'ioredis';
import {
  evaluateDocumentTemplateQuota,
  documentTemplateCounterKey,
  nextMonthResetDate,
} from '../../middleware/rateLimitDocumentTemplates.js';

interface FakeRedis {
  store: Map<string, string>;
  reads: number;
  get: (k: string) => Promise<string | null>;
}

function makeFakeRedis(initial: Record<string, string> = {}): FakeRedis & Redis {
  const f: FakeRedis = {
    store: new Map(Object.entries(initial)),
    reads: 0,
    async get(key: string): Promise<string | null> {
      f.reads += 1;
      return f.store.get(key) ?? null;
    },
  };
  return f as unknown as FakeRedis & Redis;
}

const NOW = new Date('2026-05-21T12:00:00.000Z');

describe('documentTemplateCounterKey', () => {
  it('formats as doc_templates:{userId}:{YYYY}:{MM}', () => {
    expect(documentTemplateCounterKey('abc', NOW)).toBe('doc_templates:abc:2026:05');
  });
  it('zero-pads single-digit months', () => {
    expect(documentTemplateCounterKey('u', new Date('2026-01-15T00:00:00Z'))).toBe(
      'doc_templates:u:2026:01',
    );
  });
});

describe('nextMonthResetDate', () => {
  it('returns first of next month', () => {
    expect(nextMonthResetDate(NOW)).toBe('2026-06-01');
  });
  it('wraps the year on December', () => {
    expect(nextMonthResetDate(new Date('2026-12-31T23:59:00Z'))).toBe('2027-01-01');
  });
});

describe('evaluateDocumentTemplateQuota', () => {
  it('free plan → free_blocked (limit 0)', async () => {
    const redis = makeFakeRedis();
    const result = await evaluateDocumentTemplateQuota({
      plan: 'free',
      userId: 'u-free',
      redis,
      now: NOW,
      isProduction: false,
    });
    expect(result.outcome).toBe('free_blocked');
    expect(result.limit).toBe(0);
    // Free tier must never hit Redis.
    expect((redis as unknown as FakeRedis).reads).toBe(0);
  });

  it('compass → unlimited, never reads Redis', async () => {
    const redis = makeFakeRedis();
    const result = await evaluateDocumentTemplateQuota({
      plan: 'compass',
      userId: 'u-compass',
      redis,
      now: NOW,
      isProduction: false,
    });
    expect(result.outcome).toBe('unlimited');
    expect((redis as unknown as FakeRedis).reads).toBe(0);
  });

  it('flagship → unlimited, never reads Redis', async () => {
    const redis = makeFakeRedis();
    const result = await evaluateDocumentTemplateQuota({
      plan: 'flagship',
      userId: 'u-flag',
      redis,
      now: NOW,
      isProduction: false,
    });
    expect(result.outcome).toBe('unlimited');
    expect((redis as unknown as FakeRedis).reads).toBe(0);
  });

  it('navigator at 3/3 → limit_reached', async () => {
    const redis = makeFakeRedis({
      'doc_templates:u-nav:2026:05': '3',
    });
    const result = await evaluateDocumentTemplateQuota({
      plan: 'navigator',
      userId: 'u-nav',
      redis,
      now: NOW,
      isProduction: false,
    });
    expect(result.outcome).toBe('limit_reached');
    expect(result.limit).toBe(3);
    expect(result.used).toBe(3);
    expect(result.resetDate).toBe('2026-06-01');
  });

  it('navigator at 2/3 → allow', async () => {
    const redis = makeFakeRedis({
      'doc_templates:u-nav:2026:05': '2',
    });
    const result = await evaluateDocumentTemplateQuota({
      plan: 'navigator',
      userId: 'u-nav',
      redis,
      now: NOW,
      isProduction: false,
    });
    expect(result.outcome).toBe('allow');
    expect(result.used).toBe(2);
  });

  it('navigator at 0/3 (cold start) → allow with used=0', async () => {
    const redis = makeFakeRedis();
    const result = await evaluateDocumentTemplateQuota({
      plan: 'navigator',
      userId: 'u-fresh',
      redis,
      now: NOW,
      isProduction: false,
    });
    expect(result.outcome).toBe('allow');
    expect(result.used).toBe(0);
  });

  it('Redis missing in dev → redis_unavailable_dev (fail-open)', async () => {
    const result = await evaluateDocumentTemplateQuota({
      plan: 'navigator',
      userId: 'u-nav',
      redis: null,
      now: NOW,
      isProduction: false,
    });
    expect(result.outcome).toBe('redis_unavailable_dev');
  });

  it('Redis missing in prod → redis_unavailable_prod (fail-closed)', async () => {
    const result = await evaluateDocumentTemplateQuota({
      plan: 'navigator',
      userId: 'u-nav',
      redis: null,
      now: NOW,
      isProduction: true,
    });
    expect(result.outcome).toBe('redis_unavailable_prod');
  });

  it('counter at exactly the limit (3/3) is limit_reached, not allow', async () => {
    // Boundary — `used >= limit` is the limit check.
    const redis = makeFakeRedis({
      'doc_templates:u-edge:2026:05': '3',
    });
    const result = await evaluateDocumentTemplateQuota({
      plan: 'navigator',
      userId: 'u-edge',
      redis,
      now: NOW,
      isProduction: false,
    });
    expect(result.outcome).toBe('limit_reached');
  });

  it('counter above the limit (4/3) still returns limit_reached (defensive)', async () => {
    const redis = makeFakeRedis({
      'doc_templates:u-over:2026:05': '4',
    });
    const result = await evaluateDocumentTemplateQuota({
      plan: 'navigator',
      userId: 'u-over',
      redis,
      now: NOW,
      isProduction: false,
    });
    expect(result.outcome).toBe('limit_reached');
    expect(result.used).toBe(4);
  });

  it('malformed counter value (non-numeric) is treated as 0', async () => {
    const redis = makeFakeRedis({
      'doc_templates:u-bad:2026:05': 'NaN',
    });
    const result = await evaluateDocumentTemplateQuota({
      plan: 'navigator',
      userId: 'u-bad',
      redis,
      now: NOW,
      isProduction: false,
    });
    expect(result.outcome).toBe('allow');
    expect(result.used).toBe(0);
  });
});
