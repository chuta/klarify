// =============================================================================
// emailService.ts — Preference-aware email dispatch layer (Sprint 5-D2).
//
// All outbound email from the API flows through this module or through
// @klarify/email send-helpers directly. This layer adds:
//
//   1. Notification preference checks — consults notification_preferences
//      table before dispatching so users who opted out don't receive emails.
//   2. Stateless unsubscribe tokens — HMAC-SHA256(userId|type, JWT_SECRET).
//      No DB row needed; the token is verified and the preference updated
//      by the unsubscribe endpoint in routes/notifications.ts.
//   3. Typed wrapper functions for each email category used by cron jobs
//      and service hooks.
//
// Billing emails (payment confirmations, failed payments) ALWAYS send —
// preference opt-outs do not apply to them.
// =============================================================================

import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '../db.js';
import {
  sendDeadlineReminderEmail,
  sendWeeklyDigestEmail,
  sendAripGrowthAlertEmail,
  sendDripReadinessScoreExplainedEmail,
  sendDripPostLetterCaseStudyEmail,
  sendDripPlanComparisonEmail,
  sendDripLaunchOfferExpiryEmail,
  sendDripAbandonedOnboardingEmail,
  type SendEmailResult,
  type DripReadinessScoreExplainedProps,
  type DripPostLetterCaseStudyProps,
  type DripPlanComparisonProps,
  type DripLaunchOfferExpiryProps,
  type DripAbandonedOnboardingProps,
} from '@klarify/email';
import { emailConfig } from '@klarify/email';

// =============================================================================
// Unsubscribe token helpers
// =============================================================================

/**
 * Encode a userId + preference type into a stateless HMAC token.
 * The token carries `userId|type` as its signed payload so the
 * unsubscribe endpoint can extract the userId without a DB lookup.
 *
 * Format: base64url(userId|type) + '.' + hmac_hex
 */
export function buildUnsubscribeToken(userId: string, type: NotificationType): string {
  const payload = `${userId}|${type}`;
  const secret = process.env.JWT_SECRET ?? '';
  const hmac = createHmac('sha256', secret).update(payload).digest('hex');
  const encoded = Buffer.from(payload).toString('base64url');
  return `${encoded}.${hmac}`;
}

/**
 * Verify an unsubscribe token. Returns `{ userId, type }` on success, null on failure.
 */
export function verifyUnsubscribeToken(
  token: string,
): { userId: string; type: NotificationType } | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, receivedHmac] = parts as [string, string];

  let payload: string;
  try {
    payload = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
  } catch {
    return null;
  }

  const secret = process.env.JWT_SECRET ?? '';
  const expectedHmac = createHmac('sha256', secret).update(payload).digest('hex');

  // Timing-safe comparison — same length check first.
  if (receivedHmac.length !== expectedHmac.length) return null;
  try {
    const same = timingSafeEqual(
      Buffer.from(receivedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex'),
    );
    if (!same) return null;
  } catch {
    return null;
  }

  const payloadParts = payload.split('|');
  const userId = payloadParts[0];
  const type = payloadParts[1];
  if (!userId || !type || !isNotificationType(type)) return null;
  return { userId, type };
}

// =============================================================================
// Notification type registry
// =============================================================================

export type NotificationType =
  | 'email_deadline_alerts'
  | 'email_weekly_digest'
  | 'email_document_analysis'
  | 'email_arip_alerts'
  | 'email_billing'
  | 'email_lifecycle';

const NOTIFICATION_TYPES: readonly NotificationType[] = [
  'email_deadline_alerts',
  'email_weekly_digest',
  'email_document_analysis',
  'email_arip_alerts',
  'email_billing',
  'email_lifecycle',
];

function isNotificationType(s: string): s is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(s);
}

// =============================================================================
// Preference check
// =============================================================================

/**
 * Returns true if the user has opted in to this notification type (or no
 * preference row exists — defaults to opted-in). Billing is always true.
 */
async function isOptedIn(userId: string, type: NotificationType): Promise<boolean> {
  if (type === 'email_billing') return true;
  try {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
    });
    if (!prefs) return true; // no row = default opted-in
    // Map the snake_case NotificationType string to the camelCase Prisma field.
    const fieldMap: Record<NotificationType, keyof typeof prefs> = {
      email_deadline_alerts:   'emailDeadlineAlerts',
      email_weekly_digest:     'emailWeeklyDigest',
      email_document_analysis: 'emailDocumentAnalysis',
      email_arip_alerts:       'emailAripAlerts',
      email_billing:           'emailBilling',
      email_lifecycle:         'emailLifecycle',
    };
    const field = fieldMap[type];
    return prefs[field] as boolean;
  } catch (err) {
    // Prefer to send rather than suppress on DB error.
    console.error('[emailService] preference lookup error', err);
    return true;
  }
}

// =============================================================================
// Deadline alert
// =============================================================================

export interface DeadlineAlertInput {
  userId: string;
  to: string;
  name: string;
  eventTitle: string;
  eventDescription: string;
  dueDate: string;
  daysRemaining: number;
  regulatorCode?: string;
  eventUrl?: string;
  idempotencyKey?: string;
}

export async function sendDeadlineAlert(
  input: DeadlineAlertInput,
): Promise<SendEmailResult | null> {
  if (!(await isOptedIn(input.userId, 'email_deadline_alerts'))) {
    return null;
  }
  return sendDeadlineReminderEmail({
    to:   input.to,
    name: input.name,
    eventTitle:       input.eventTitle,
    eventDescription: input.eventDescription,
    dueDate:          input.dueDate,
    daysRemaining:    input.daysRemaining,
    regulatorCode:    input.regulatorCode,
    eventUrl:         input.eventUrl,
    idempotencyKey:   input.idempotencyKey,
  }).catch((err: unknown) => {
    console.error('[emailService] sendDeadlineAlert error', err);
    return { success: false, error: String(err) };
  });
}

// =============================================================================
// ARIP growth alert
// =============================================================================

export interface ARIPGrowthAlertInput {
  userId: string;
  to: string;
  name: string;
  organisationName: string;
  currentCustomers: number;
  maxCustomers: number;
  utilPct: number;
  daysUntilAipExpiry: number | null;
  capBreached: boolean;
  idempotencyKey?: string;
}

export async function sendARIPGrowthAlert(
  input: ARIPGrowthAlertInput,
): Promise<SendEmailResult | null> {
  if (!(await isOptedIn(input.userId, 'email_arip_alerts'))) {
    return null;
  }

  const unsubscribeUrl = buildUnsubscribeUrl(input.userId, 'email_arip_alerts');

  return sendAripGrowthAlertEmail({
    to:   input.to,
    name: input.name,
    organisationName:    input.organisationName,
    currentCustomers:    input.currentCustomers,
    maxCustomers:        input.maxCustomers,
    utilPct:             input.utilPct,
    daysUntilAipExpiry:  input.daysUntilAipExpiry,
    capBreached:         input.capBreached,
    unsubscribeUrl,
    idempotencyKey: input.idempotencyKey,
  }).catch((err: unknown) => {
    console.error('[emailService] sendARIPGrowthAlert error', err);
    return { success: false, error: String(err) };
  });
}

// =============================================================================
// Weekly digest
// =============================================================================

export interface WeeklyDigestInput {
  userId: string;
  to: string;
  name: string;
  organisationName: string;
  score: number;
  scoreDelta: number;
  tasksCompleted: number;
  upcomingDeadlines: Array<{ title: string; dueDate: string; daysRemaining: number }>;
  newRegulatoryUpdates: Array<{ title: string; regulator: string; summary: string }>;
  weekStart: string;
  weekEnd: string;
  idempotencyKey?: string;
}

export async function sendWeeklyDigest(
  input: WeeklyDigestInput,
): Promise<SendEmailResult | null> {
  if (!(await isOptedIn(input.userId, 'email_weekly_digest'))) {
    return null;
  }
  return sendWeeklyDigestEmail({
    to:   input.to,
    name: input.name,
    organisationName:      input.organisationName,
    score:                 input.score,
    scoreDelta:            input.scoreDelta,
    tasksCompleted:        input.tasksCompleted,
    upcomingDeadlines:     input.upcomingDeadlines,
    newRegulatoryUpdates:  input.newRegulatoryUpdates,
    weekStart:             input.weekStart,
    weekEnd:               input.weekEnd,
    idempotencyKey:        input.idempotencyKey,
  }).catch((err: unknown) => {
    console.error('[emailService] sendWeeklyDigest error', err);
    return { success: false, error: String(err) };
  });
}

// =============================================================================
// Lifecycle drip emails (onboarding_launch_v1)
// =============================================================================

export type LifecycleDripStepId =
  | 'abandoned_onboarding'
  | 'readiness_explained'
  | 'post_letter_case_study'
  | 'plan_comparison'
  | 'launch_offer_expiry';

type LifecycleDripProps =
  | DripAbandonedOnboardingProps
  | DripReadinessScoreExplainedProps
  | DripPostLetterCaseStudyProps
  | DripPlanComparisonProps
  | DripLaunchOfferExpiryProps;

export interface LifecycleDripSendInput {
  stepId: LifecycleDripStepId;
  userId: string;
  to: string;
  idempotencyKey: string;
  props: LifecycleDripProps;
}

export async function sendLifecycleDripEmail(
  input: LifecycleDripSendInput,
): Promise<{ sent: boolean; resendId?: string }> {
  if (!(await isOptedIn(input.userId, 'email_lifecycle'))) {
    return { sent: false };
  }

  let result: SendEmailResult;

  switch (input.stepId) {
    case 'abandoned_onboarding':
      result = await sendDripAbandonedOnboardingEmail({
        to: input.to,
        idempotencyKey: input.idempotencyKey,
        ...(input.props as DripAbandonedOnboardingProps),
      });
      break;
    case 'readiness_explained':
      result = await sendDripReadinessScoreExplainedEmail({
        to: input.to,
        idempotencyKey: input.idempotencyKey,
        ...(input.props as DripReadinessScoreExplainedProps),
      });
      break;
    case 'post_letter_case_study':
      result = await sendDripPostLetterCaseStudyEmail({
        to: input.to,
        idempotencyKey: input.idempotencyKey,
        ...(input.props as DripPostLetterCaseStudyProps),
      });
      break;
    case 'plan_comparison':
      result = await sendDripPlanComparisonEmail({
        to: input.to,
        idempotencyKey: input.idempotencyKey,
        ...(input.props as DripPlanComparisonProps),
      });
      break;
    case 'launch_offer_expiry':
      result = await sendDripLaunchOfferExpiryEmail({
        to: input.to,
        idempotencyKey: input.idempotencyKey,
        ...(input.props as DripLaunchOfferExpiryProps),
      });
      break;
    default:
      return { sent: false };
  }

  if (!result.success) {
    console.error('[emailService] lifecycle drip send failed', {
      stepId: input.stepId,
      userId: input.userId,
      error:  result.error,
    });
    return { sent: false };
  }

  return { sent: true, resendId: result.id };
}

// =============================================================================
// Helpers
// =============================================================================

export function buildUnsubscribeUrl(userId: string, type: NotificationType): string {
  const token = buildUnsubscribeToken(userId, type);
  const base = emailConfig.appUrl.replace(/\/+$/, '');
  return `${base}/api/notifications/unsubscribe?token=${encodeURIComponent(token)}&type=${type}`;
}
