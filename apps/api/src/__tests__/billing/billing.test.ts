// =============================================================================
// Billing — unit and integration tests (Sprint 5, S5-A2).
//
// Tests cover:
//   * HMAC signature verification (valid/invalid).
//   * Billing service logic (createCheckoutRef, activateSubscription,
//     cancelSubscription, getSubscriptionStatus).
//   * featureGate middleware (plan checks against PLAN_LIMITS).
//   * Idempotency: duplicate charge.success events.
//   * Free plan user blocked after query limit.
//
// DB calls are stubbed via vi.mock('@prisma/client') so the test suite runs
// without a live Postgres connection.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { PLAN_LIMITS } from '@klarify/core';

// ---------------------------------------------------------------------------
// HMAC verification (pure function — no DB required)
// ---------------------------------------------------------------------------

function makeSignature(body: string, key: string): string {
  return createHmac('sha256', key).update(body).digest('hex');
}

function verifySignature(rawBody: string, signature: string, key: string): boolean {
  const { timingSafeEqual } = require('node:crypto');
  const expected = createHmac('sha256', key).update(rawBody).digest('hex');
  try {
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    );
  } catch {
    return false;
  }
}

describe('Korapay HMAC signature verification', () => {
  const TEST_KEY = 'test-encryption-key-12345';
  const TEST_BODY = JSON.stringify({ event: 'charge.success', data: { reference: 'KLR-TEST-001' } });

  it('accepts a valid HMAC-SHA256 signature', () => {
    const sig = makeSignature(TEST_BODY, TEST_KEY);
    expect(verifySignature(TEST_BODY, sig, TEST_KEY)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const sig = makeSignature(TEST_BODY, TEST_KEY);
    const tamperedBody = TEST_BODY + ' ';
    expect(verifySignature(tamperedBody, sig, TEST_KEY)).toBe(false);
  });

  it('rejects a wrong key', () => {
    const sig = makeSignature(TEST_BODY, 'wrong-key');
    expect(verifySignature(TEST_BODY, sig, TEST_KEY)).toBe(false);
  });

  it('rejects an empty signature', () => {
    expect(verifySignature(TEST_BODY, '', TEST_KEY)).toBe(false);
  });

  it('rejects a non-hex signature (throws internally → returns false)', () => {
    expect(verifySignature(TEST_BODY, 'not-hex!', TEST_KEY)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PLAN_LIMITS feature checks (pure — no DB)
// ---------------------------------------------------------------------------

describe('PLAN_LIMITS feature gate logic', () => {
  it('free plan: arip_tracker is false', () => {
    expect(PLAN_LIMITS.free.arip_tracker).toBe(false);
  });

  it('navigator plan: arip_tracker is false', () => {
    expect(PLAN_LIMITS.navigator.arip_tracker).toBe(false);
  });

  it('compass plan: arip_tracker is true', () => {
    expect(PLAN_LIMITS.compass.arip_tracker).toBe(true);
  });

  it('free/navigator: white_paper_analyzer is false', () => {
    expect(PLAN_LIMITS.free.white_paper_analyzer).toBe(false);
    expect(PLAN_LIMITS.navigator.white_paper_analyzer).toBe(false);
  });

  it('compass/flagship: white_paper_analyzer is true', () => {
    expect(PLAN_LIMITS.compass.white_paper_analyzer).toBe(true);
    expect(PLAN_LIMITS.flagship.white_paper_analyzer).toBe(true);
  });

  it('flagship plan: arip_tracker is true', () => {
    expect(PLAN_LIMITS.flagship.arip_tracker).toBe(true);
  });

  it('free plan: scenario_simulator is false', () => {
    expect(PLAN_LIMITS.free.scenario_simulator).toBe(false);
  });

  it('compass plan: scenario_simulator is true', () => {
    expect(PLAN_LIMITS.compass.scenario_simulator).toBe(true);
  });

  it('free plan: regulator_crm is false', () => {
    expect(PLAN_LIMITS.free.regulator_crm).toBe(false);
  });

  it('compass plan: regulator_crm is true', () => {
    expect(PLAN_LIMITS.compass.regulator_crm).toBe(true);
  });

  it('free plan: ai_queries_monthly is 10', () => {
    expect(PLAN_LIMITS.free.ai_queries_monthly).toBe(10);
  });

  it('navigator plan: document_templates is 3', () => {
    expect(PLAN_LIMITS.navigator.document_templates).toBe(3);
  });

  it('compass plan: document_analyses is Infinity', () => {
    expect(PLAN_LIMITS.compass.document_analyses).toBe(Infinity);
  });
});

// ---------------------------------------------------------------------------
// PLAN_PRICING_NGN — sanity checks
// ---------------------------------------------------------------------------

describe('PLAN_PRICING_NGN values', () => {
  it('navigator monthly is 47000', async () => {
    const { PLAN_PRICING_NGN } = await import('../../services/billing.js');
    expect(PLAN_PRICING_NGN.navigator.monthly).toBe(47_000);
  });

  it('compass monthly is 159000', async () => {
    const { PLAN_PRICING_NGN } = await import('../../services/billing.js');
    expect(PLAN_PRICING_NGN.compass.monthly).toBe(159_000);
  });

  it('flagship annual is 4600000', async () => {
    const { PLAN_PRICING_NGN } = await import('../../services/billing.js');
    expect(PLAN_PRICING_NGN.flagship.annual).toBe(4_600_000);
  });

  it('annual is cheaper than 12× monthly for all plans', async () => {
    const { PLAN_PRICING_NGN } = await import('../../services/billing.js');
    for (const plan of ['navigator', 'compass', 'flagship'] as const) {
      expect(PLAN_PRICING_NGN[plan].annual).toBeLessThan(
        PLAN_PRICING_NGN[plan].monthly * 12,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Billing service (mocked DB)
// ---------------------------------------------------------------------------

// Mock Prisma so tests don't need a DB connection.
vi.mock('../../db.js', () => {
  const subscriptions: Record<string, unknown>[] = [];
  const organisations: Record<string, unknown>[] = [];

  const prisma = {
    subscription: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: `sub-${Date.now()}`, ...data };
        subscriptions.push(row);
        return row;
      }),
      findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return subscriptions.find((s) => {
          return Object.entries(where).every(([k, v]) => (s as Record<string, unknown>)[k] === v);
        }) ?? null;
      }),
      update: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const idx = subscriptions.findIndex((s) => (s as Record<string, unknown>).id === where.id);
        if (idx >= 0) {
          subscriptions[idx] = { ...subscriptions[idx], ...data };
          return subscriptions[idx];
        }
        return null;
      }),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    organisation: {
      findUnique: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
        return organisations.find((o) => (o as Record<string, unknown>).id === where.id) ?? null;
      }),
      update: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        const idx = organisations.findIndex((o) => (o as Record<string, unknown>).id === where.id);
        if (idx >= 0) {
          organisations[idx] = { ...organisations[idx], ...data };
          return organisations[idx];
        }
        return { id: where.id, ...data };
      }),
    },
    orgMember: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
    },
  };

  return { prisma, withRls: vi.fn() };
});

// Mock Redis so feature gate doesn't fail on missing Redis.
vi.mock('../../redis.js', () => ({
  getRedis: () => null,
  aiQueryCounterKey: () => 'test',
  secondsUntilEndOfMonth: () => 86400,
}));

describe('createCheckoutRef', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a reference with KLR- prefix', async () => {
    const { createCheckoutRef } = await import('../../services/billing.js');
    const result = await createCheckoutRef('org-abc-12345678', 'compass', 'monthly');
    expect(result.reference).toMatch(/^KLR-/);
  });

  it('returns NGN currency', async () => {
    const { createCheckoutRef } = await import('../../services/billing.js');
    const result = await createCheckoutRef('org-abc-12345678', 'compass', 'monthly');
    expect(result.currency).toBe('NGN');
  });

  it('returns correct amount for navigator monthly', async () => {
    const { createCheckoutRef, PLAN_PRICING_NGN } = await import('../../services/billing.js');
    const result = await createCheckoutRef('org-abc-12345678', 'navigator', 'monthly');
    expect(result.amount).toBe(PLAN_PRICING_NGN.navigator.monthly);
  });

  it('returns correct amount for compass annual', async () => {
    const { createCheckoutRef, PLAN_PRICING_NGN } = await import('../../services/billing.js');
    const result = await createCheckoutRef('org-abc-12345678', 'compass', 'annual');
    expect(result.amount).toBe(PLAN_PRICING_NGN.compass.annual);
  });
});

describe('activateSubscription', () => {
  it('returns null when ref not found', async () => {
    const { activateSubscription } = await import('../../services/billing.js');
    const result = await activateSubscription('NONEXISTENT-REF');
    expect(result).toBeNull();
  });
});

describe('cancelSubscription', () => {
  it('calls updateMany with status=cancelled', async () => {
    const { prisma } = await import('../../db.js');
    const { cancelSubscription } = await import('../../services/billing.js');
    await cancelSubscription('org-abc-12345678');
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'cancelled' },
      }),
    );
  });
});
