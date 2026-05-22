// POST /api/billing/webhook/korapay — Korapay charge.success webhook handler.
//
// SECURITY: Every incoming payload is verified with HMAC-SHA256 using
// KORAPAY_ENCRYPTION_KEY. Requests with invalid or missing signatures are
// rejected with 401. This is the ONLY public route in the billing module.
//
// CLAUDE.md §3: Korapay is the payment provider. Webhook event: charge.success.
// Signature header: x-korapay-signature

import { timingSafeEqual, createHmac } from 'node:crypto';
import { Hono } from 'hono';
import { activateSubscription } from '../../services/billing.js';
import { prisma } from '../../db.js';
import {
  sendSubscriptionReceiptEmail,
  sendPaymentFailedEmail,
} from '@klarify/email';

export const billingWebhookRoutes = new Hono();

// ---------------------------------------------------------------------------
// HMAC verification helper
// ---------------------------------------------------------------------------

function verifyKorapaySignature(rawBody: string, signature: string): boolean {
  const key = process.env.KORAPAY_ENCRYPTION_KEY;
  if (!key) {
    console.error('[billing/webhook] KORAPAY_ENCRYPTION_KEY is not set');
    return false;
  }
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

// ---------------------------------------------------------------------------
// POST /api/billing/webhook/korapay
// ---------------------------------------------------------------------------

billingWebhookRoutes.post('/korapay', async (c) => {
  // Korapay sends the raw body — read it as text so the HMAC is computed over
  // exactly the same bytes that were signed.
  const rawBody = await c.req.text();
  const signature = c.req.header('x-korapay-signature') ?? '';

  if (!verifyKorapaySignature(rawBody, signature)) {
    console.warn('[billing/webhook] invalid signature — rejecting');
    return c.json(
      { success: false, error: 'Invalid signature', code: 'INVALID_SIGNATURE' },
      401,
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return c.json({ success: false, error: 'Invalid JSON', code: 'INVALID_BODY' }, 400);
  }

  const event = payload.event as string | undefined;

  if (event === 'charge.success') {
    await handleChargeSuccess(payload);
  } else if (event === 'charge.failed') {
    await handleChargeFailed(payload);
  }
  // All other events: acknowledge silently.

  return c.json({ success: true, data: { received: true } });
});

// ---------------------------------------------------------------------------
// charge.success handler
// ---------------------------------------------------------------------------

async function handleChargeSuccess(payload: Record<string, unknown>): Promise<void> {
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return;

  // Korapay passes the reference back in data.reference.
  const reference = (data.reference as string | undefined) ?? '';
  if (!reference) {
    console.warn('[billing/webhook] charge.success missing reference');
    return;
  }

  try {
    const result = await activateSubscription(reference);
    if (!result) return;

    // Send receipt email fire-and-forget.
    const orgId = result.orgId;
    const sub = await prisma.subscription.findFirst({
      where: { orgId, status: 'active', korapayTransactionRef: reference },
    });
    const orgOwner = await prisma.organisation.findUnique({
      where: { id: orgId },
      include: { owner: { select: { email: true, name: true } } },
    });

    if (orgOwner?.owner?.email && sub) {
      const amount = (data.amount as number | undefined) ?? 0;
      const plan = sub.plan as 'navigator' | 'compass' | 'flagship';
      void sendSubscriptionReceiptEmail({
        to: orgOwner.owner.email,
        name: orgOwner.owner.name ?? orgOwner.owner.email,
        plan,
        billingCycle: (sub.billingCycle ?? 'monthly') as 'monthly' | 'annual',
        amount: `₦${amount.toLocaleString()}`,
        currency: 'NGN',
        invoiceNumber: reference,
        paidAt: new Date().toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        nextChargeDate: sub.currentPeriodEnd?.toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        paymentMethod: (data.payment_type as string | undefined) ?? 'card',
        idempotencyKey: `receipt:${reference}`,
      }).catch((err: unknown) => {
        console.error('[billing/webhook] receipt email failed', err);
      });
    }
  } catch (err) {
    console.error('[billing/webhook] charge.success handler error', err);
  }
}

// ---------------------------------------------------------------------------
// charge.failed handler
// ---------------------------------------------------------------------------

async function handleChargeFailed(payload: Record<string, unknown>): Promise<void> {
  const data = payload.data as Record<string, unknown> | undefined;
  if (!data) return;

  const reference = (data.reference as string | undefined) ?? '';
  if (!reference) return;

  try {
    // Find the pending subscription and mark it as past_due.
    await prisma.subscription.updateMany({
      where: { korapayTransactionRef: reference, status: 'pending' },
      data: { status: 'past_due' },
    });

    // Send payment failed email.
    const pending = await prisma.subscription.findFirst({
      where: { korapayTransactionRef: reference },
      include: {
        org: {
          include: { owner: { select: { email: true, name: true } } },
        },
      },
    });

    if (pending?.org.owner?.email) {
      const retryByDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-NG', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      void sendPaymentFailedEmail({
        to: pending.org.owner.email,
        name: pending.org.owner.name ?? pending.org.owner.email,
        plan: pending.plan.charAt(0).toUpperCase() + pending.plan.slice(1),
        amount: `₦0`,
        paymentMethod: (data.payment_type as string | undefined) ?? 'card',
        retryByDate,
        idempotencyKey: `payment_failed:${reference}`,
      }).catch((err: unknown) => {
        console.error('[billing/webhook] payment failed email error', err);
      });
    }
  } catch (err) {
    console.error('[billing/webhook] charge.failed handler error', err);
  }
}
