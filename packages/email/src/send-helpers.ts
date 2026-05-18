// Typed, ergonomic helpers around `sendEmail` — one per template.
//
// Callers don't have to know the React Email component or subject helper for
// each template; they just pass the props and the recipient. This is what the
// rest of the codebase (apps/api services, Next.js server actions) imports.

import { createElement } from 'react';
import { sendEmail, type SendEmailResult } from './client.js';
import * as T from './templates/index.js';

export interface BaseSend {
  to: string | string[];
  /** Override default reply-to (e.g. set to user's account manager). */
  replyTo?: string;
  /** Idempotency key — recommended for any auto-triggered email. */
  idempotencyKey?: string;
}

export async function sendWelcomeEmail(
  args: BaseSend & T.WelcomeEmailProps,
): Promise<SendEmailResult> {
  const { to, replyTo, idempotencyKey, ...props } = args;
  return sendEmail({
    to, replyTo, idempotencyKey,
    subject:  T.welcomeSubject(props),
    template: createElement(T.WelcomeEmail, props),
    tag:      'welcome',
  });
}

export async function sendOnboardingCompleteEmail(
  args: BaseSend & T.OnboardingCompleteProps,
): Promise<SendEmailResult> {
  const { to, replyTo, idempotencyKey, ...props } = args;
  return sendEmail({
    to, replyTo, idempotencyKey,
    subject:  T.onboardingCompleteSubject(),
    template: createElement(T.OnboardingCompleteEmail, props),
    tag:      'onboarding_complete',
  });
}

export async function sendDocumentAnalysisCriticalEmail(
  args: BaseSend & T.DocumentAnalysisCriticalProps,
): Promise<SendEmailResult> {
  const { to, replyTo, idempotencyKey, ...props } = args;
  return sendEmail({
    to, replyTo, idempotencyKey,
    subject:  T.documentAnalysisCriticalSubject(props),
    template: createElement(T.DocumentAnalysisCriticalEmail, props),
    tag:      'document_analysis_critical',
  });
}

export async function sendDocumentAnalysisStandardEmail(
  args: BaseSend & T.DocumentAnalysisStandardProps,
): Promise<SendEmailResult> {
  const { to, replyTo, idempotencyKey, ...props } = args;
  return sendEmail({
    to, replyTo, idempotencyKey,
    subject:  T.documentAnalysisStandardSubject(props),
    template: createElement(T.DocumentAnalysisStandardEmail, props),
    tag:      'document_analysis_standard',
  });
}

export async function sendDeadlineReminderEmail(
  args: BaseSend & T.DeadlineReminderProps,
): Promise<SendEmailResult> {
  const { to, replyTo, idempotencyKey, ...props } = args;
  return sendEmail({
    to, replyTo, idempotencyKey,
    subject:  T.deadlineReminderSubject(props),
    template: createElement(T.DeadlineReminderEmail, props),
    tag:      'deadline_reminder',
  });
}

export async function sendTaskAssignedEmail(
  args: BaseSend & T.TaskAssignedProps,
): Promise<SendEmailResult> {
  const { to, replyTo, idempotencyKey, ...props } = args;
  return sendEmail({
    to, replyTo, idempotencyKey,
    subject:  T.taskAssignedSubject(props),
    template: createElement(T.TaskAssignedEmail, props),
    tag:      'task_assigned',
  });
}

export async function sendWeeklyDigestEmail(
  args: BaseSend & T.WeeklyDigestProps,
): Promise<SendEmailResult> {
  const { to, replyTo, idempotencyKey, ...props } = args;
  return sendEmail({
    to, replyTo, idempotencyKey,
    subject:  T.weeklyDigestSubject(props),
    template: createElement(T.WeeklyDigestEmail, props),
    tag:      'weekly_digest',
  });
}

export async function sendTeamInvitationEmail(
  args: BaseSend & T.TeamInvitationProps,
): Promise<SendEmailResult> {
  const { to, replyTo, idempotencyKey, ...props } = args;
  return sendEmail({
    to, replyTo, idempotencyKey,
    subject:  T.teamInvitationSubject(props),
    template: createElement(T.TeamInvitationEmail, props),
    tag:      'team_invitation',
  });
}

export async function sendSubscriptionReceiptEmail(
  args: BaseSend & T.SubscriptionReceiptProps,
): Promise<SendEmailResult> {
  const { to, replyTo, idempotencyKey, ...props } = args;
  return sendEmail({
    to, replyTo, idempotencyKey,
    subject:  T.subscriptionReceiptSubject(props),
    template: createElement(T.SubscriptionReceiptEmail, props),
    tag:      'subscription_receipt',
  });
}

export async function sendPaymentFailedEmail(
  args: BaseSend & T.PaymentFailedProps,
): Promise<SendEmailResult> {
  const { to, replyTo, idempotencyKey, ...props } = args;
  return sendEmail({
    to, replyTo, idempotencyKey,
    subject:  T.paymentFailedSubject(),
    template: createElement(T.PaymentFailedEmail, props),
    tag:      'payment_failed',
  });
}

export async function sendPlanChangedEmail(
  args: BaseSend & T.PlanChangedProps,
): Promise<SendEmailResult> {
  const { to, replyTo, idempotencyKey, ...props } = args;
  return sendEmail({
    to, replyTo, idempotencyKey,
    subject:  T.planChangedSubject(props),
    template: createElement(T.PlanChangedEmail, props),
    tag:      'plan_changed',
  });
}

export async function sendRegulatorFollowUpEmail(
  args: BaseSend & T.RegulatorFollowUpProps,
): Promise<SendEmailResult> {
  const { to, replyTo, idempotencyKey, ...props } = args;
  return sendEmail({
    to, replyTo, idempotencyKey,
    subject:  T.regulatorFollowUpSubject(props),
    template: createElement(T.RegulatorFollowUpEmail, props),
    tag:      'regulator_follow_up',
  });
}

export async function sendAripStageAdvancedEmail(
  args: BaseSend & T.AripStageAdvancedProps,
): Promise<SendEmailResult> {
  const { to, replyTo, idempotencyKey, ...props } = args;
  return sendEmail({
    to, replyTo, idempotencyKey,
    subject:  T.aripStageAdvancedSubject(props),
    template: createElement(T.AripStageAdvancedEmail, props),
    tag:      'arip_stage_advanced',
  });
}

export async function sendAdminCriticalEventEmail(
  args: BaseSend & T.AdminCriticalEventProps,
): Promise<SendEmailResult> {
  const { to, replyTo, idempotencyKey, ...props } = args;
  return sendEmail({
    to, replyTo, idempotencyKey,
    subject:  T.adminCriticalEventSubject(props),
    template: createElement(T.AdminCriticalEventEmail, props),
    tag:      'admin_critical_event',
  });
}
