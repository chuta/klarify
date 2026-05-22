// =============================================================================
// notifications.ts — Notification preferences + unsubscribe (Sprint 5-D2)
//
// Routes:
//   GET  /api/notifications/preferences   → current prefs for authenticated user
//   PATCH /api/notifications/preferences  → update one or more preference toggles
//   GET  /api/notifications/unsubscribe   → stateless unsubscribe via token
// =============================================================================

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { prisma } from '../db.js';
import { requireAuth, type AuthVars } from '../middleware/auth.js';
import {
  verifyUnsubscribeToken,
  type NotificationType,
} from '../services/emailService.js';
import { emailConfig } from '@klarify/email';

export const notificationRoutes = new Hono<{ Variables: AuthVars }>();

// ---------------------------------------------------------------------------
// GET /api/notifications/preferences
// ---------------------------------------------------------------------------

notificationRoutes.get('/preferences', requireAuth, async (c) => {
  const userId = c.get('userId');

  // Upsert so a row always exists on first read.
  const prefs = await prisma.notificationPreference.upsert({
    where:  { userId },
    create: { userId },
    update: {},
  });

  return c.json({
    success: true,
    data: {
      emailDeadlineAlerts:   prefs.emailDeadlineAlerts,
      emailWeeklyDigest:     prefs.emailWeeklyDigest,
      emailDocumentAnalysis: prefs.emailDocumentAnalysis,
      emailAripAlerts:       prefs.emailAripAlerts,
      emailBilling:          prefs.emailBilling,
      updatedAt:             prefs.updatedAt.toISOString(),
    },
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/notifications/preferences
// ---------------------------------------------------------------------------

const prefsUpdateSchema = z.object({
  emailDeadlineAlerts:   z.boolean().optional(),
  emailWeeklyDigest:     z.boolean().optional(),
  emailDocumentAnalysis: z.boolean().optional(),
  emailAripAlerts:       z.boolean().optional(),
  // emailBilling is intentionally excluded — always true, not user-controllable.
});

notificationRoutes.patch(
  '/preferences',
  requireAuth,
  zValidator('json', prefsUpdateSchema),
  async (c) => {
    const userId = c.get('userId');
    const patch  = c.req.valid('json');

    const prefs = await prisma.notificationPreference.upsert({
      where:  { userId },
      create: { userId, ...patch },
      update: patch,
    });

    return c.json({
      success: true,
      data: {
        emailDeadlineAlerts:   prefs.emailDeadlineAlerts,
        emailWeeklyDigest:     prefs.emailWeeklyDigest,
        emailDocumentAnalysis: prefs.emailDocumentAnalysis,
        emailAripAlerts:       prefs.emailAripAlerts,
        emailBilling:          prefs.emailBilling,
        updatedAt:             prefs.updatedAt.toISOString(),
      },
    });
  },
);

// ---------------------------------------------------------------------------
// GET /api/notifications/unsubscribe?token=xxx&type=xxx
//
// Public route — no auth required. The token itself proves identity.
// ---------------------------------------------------------------------------

const PREF_LABELS: Record<NotificationType, string> = {
  email_deadline_alerts:   'compliance deadline alerts',
  email_weekly_digest:     'weekly digest',
  email_document_analysis: 'document analysis notifications',
  email_arip_alerts:       'ARIP growth alerts',
  email_billing:           'billing notifications',
};

notificationRoutes.get('/unsubscribe', async (c) => {
  const token = c.req.query('token') ?? '';
  const typeParam = c.req.query('type') ?? '';

  const verified = verifyUnsubscribeToken(token);

  if (!verified) {
    return c.html(unsubscribePage(
      'Invalid or expired unsubscribe link',
      'This unsubscribe link is invalid or has been tampered with. Please manage your notification preferences directly in your Klarify dashboard.',
      false,
    ));
  }

  const { userId, type } = verified;

  // Billing cannot be unsubscribed.
  if (type === 'email_billing') {
    return c.html(unsubscribePage(
      'Billing notifications cannot be disabled',
      'Payment confirmations and subscription alerts are required for your account security. You can manage other email preferences in your dashboard.',
      false,
    ));
  }

  // Update the preference.
  await prisma.notificationPreference.upsert({
    where:  { userId },
    create: { userId, [toCamel(type)]: false },
    update: { [toCamel(type)]: false },
  });

  const label = PREF_LABELS[type];
  const prefsUrl = `${emailConfig.appUrl}/dashboard/account/notifications`;

  return c.html(unsubscribePage(
    `Unsubscribed from ${label}`,
    `You have been unsubscribed from ${label} emails from Klarify Africa. You can re-enable this at any time in your notification preferences.`,
    true,
    prefsUrl,
  ));
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map snake_case NotificationType → camelCase Prisma field name. */
function toCamel(type: NotificationType): string {
  return type.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

function unsubscribePage(
  title: string,
  message: string,
  success: boolean,
  prefsUrl?: string,
): string {
  const accent = success ? '#1A7A4A' : '#C0392B';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — Klarify</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAFAFA; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: white; border-radius: 12px; border: 1px solid #E5E7EB; max-width: 480px; width: 100%; padding: 40px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .badge { display: inline-block; background: ${accent}22; color: ${accent}; font-size: 12px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 700; color: #1A1A1A; margin: 0 0 12px 0; }
    p { font-size: 15px; line-height: 24px; color: #555; margin: 0 0 20px 0; }
    a.btn { display: inline-block; background: #0B6E6E; color: white; font-size: 14px; font-weight: 600; padding: 10px 20px; border-radius: 8px; text-decoration: none; }
    .logo { font-size: 18px; font-weight: 800; color: #0B6E6E; margin-bottom: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">Klarify</div>
    <div class="badge">${success ? 'Unsubscribed' : 'Notice'}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(message)}</p>
    ${prefsUrl ? `<a class="btn" href="${escapeHtml(prefsUrl)}">Manage preferences →</a>` : ''}
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
