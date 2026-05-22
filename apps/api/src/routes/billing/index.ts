// Billing routes — CLAUDE.md §9, Sprint 5 Phase A.
//
// POST /api/billing/subscribe  — initialise a Korapay checkout
// POST /api/billing/cancel     — cancel the active subscription
// GET  /api/billing/status     — return current plan/status for the org
// POST /api/billing/upgrade    — create a checkout ref for a higher plan
//
// Webhook route is mounted SEPARATELY (no auth) from apps/api/src/index.ts.

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Plan } from '@klarify/core';
import { requireAuth, type AuthVars } from '../../middleware/auth.js';
import { prisma } from '../../db.js';
import {
  createCheckoutRef,
  cancelSubscription,
  getSubscriptionStatus,
  PLAN_PRICING_NGN,
} from '../../services/billing.js';

export const billingRoutes = new Hono<{ Variables: AuthVars }>();

// ---------------------------------------------------------------------------
// Helper — resolve orgId for the authenticated user
// ---------------------------------------------------------------------------

async function resolveOrgId(userId: string): Promise<string | null> {
  const membership = await prisma.orgMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { orgId: true },
  });
  return membership?.orgId ?? null;
}

// ---------------------------------------------------------------------------
// POST /api/billing/subscribe
// ---------------------------------------------------------------------------

const subscribeSchema = z.object({
  plan: z.enum(['navigator', 'compass', 'flagship']),
  billingCycle: z.enum(['monthly', 'annual']),
});

billingRoutes.post('/subscribe', requireAuth, zValidator('json', subscribeSchema), async (c) => {
  const userId = c.get('userId');
  const { plan, billingCycle } = c.req.valid('json');

  const orgId = await resolveOrgId(userId);
  if (!orgId) {
    return c.json(
      { success: false as const, error: 'No organisation found.', code: 'NO_ORG' },
      400,
    );
  }

  try {
    const ref = await createCheckoutRef(orgId, plan, billingCycle);
    return c.json({
      success: true as const,
      data: {
        reference: ref.reference,
        amount: ref.amount,
        currency: ref.currency,
        plan: ref.plan,
        billingCycle: ref.billingCycle,
      },
    });
  } catch (err) {
    console.error('[billing/subscribe] error', err);
    return c.json(
      { success: false as const, error: 'Failed to create checkout.', code: 'CHECKOUT_ERROR' },
      500,
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/billing/upgrade
// ---------------------------------------------------------------------------

const upgradeSchema = z.object({
  newPlan: z.enum(['navigator', 'compass', 'flagship']),
  billingCycle: z.enum(['monthly', 'annual']),
});

billingRoutes.post('/upgrade', requireAuth, zValidator('json', upgradeSchema), async (c) => {
  const userId = c.get('userId');
  const { newPlan, billingCycle } = c.req.valid('json');

  const orgId = await resolveOrgId(userId);
  if (!orgId) {
    return c.json(
      { success: false as const, error: 'No organisation found.', code: 'NO_ORG' },
      400,
    );
  }

  try {
    const ref = await createCheckoutRef(orgId, newPlan, billingCycle);
    return c.json({
      success: true as const,
      data: {
        reference: ref.reference,
        amount: ref.amount,
        currency: ref.currency,
        plan: ref.plan,
        billingCycle: ref.billingCycle,
      },
    });
  } catch (err) {
    console.error('[billing/upgrade] error', err);
    return c.json(
      { success: false as const, error: 'Failed to create upgrade checkout.', code: 'CHECKOUT_ERROR' },
      500,
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/billing/cancel
// ---------------------------------------------------------------------------

billingRoutes.post('/cancel', requireAuth, async (c) => {
  const userId = c.get('userId');

  const orgId = await resolveOrgId(userId);
  if (!orgId) {
    return c.json(
      { success: false as const, error: 'No organisation found.', code: 'NO_ORG' },
      400,
    );
  }

  try {
    await cancelSubscription(orgId);
    return c.json({
      success: true as const,
      data: { cancelled: true, message: 'Subscription cancelled. Access continues until period end.' },
    });
  } catch (err) {
    console.error('[billing/cancel] error', err);
    return c.json(
      { success: false as const, error: 'Failed to cancel subscription.', code: 'CANCEL_ERROR' },
      500,
    );
  }
});

// ---------------------------------------------------------------------------
// GET /api/billing/status
// ---------------------------------------------------------------------------

billingRoutes.get('/status', requireAuth, async (c) => {
  const userId = c.get('userId');

  const orgId = await resolveOrgId(userId);
  if (!orgId) {
    // No org yet — return free defaults.
    return c.json({
      success: true as const,
      data: {
        plan: 'free' as Plan,
        status: 'active',
        billingCycle: null,
        currentPeriodEnd: null,
        seatsUsed: 0,
        pricing: PLAN_PRICING_NGN,
      },
    });
  }

  try {
    const status = await getSubscriptionStatus(orgId);
    return c.json({
      success: true as const,
      data: {
        ...status,
        pricing: PLAN_PRICING_NGN,
      },
    });
  } catch (err) {
    console.error('[billing/status] error', err);
    return c.json(
      { success: false as const, error: 'Failed to load billing status.', code: 'STATUS_ERROR' },
      500,
    );
  }
});
