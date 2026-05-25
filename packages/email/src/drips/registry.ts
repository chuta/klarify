/**
 * Canonical lifecycle drip definitions for the API cron / event workers.
 *
 * The email templates themselves live in src/templates/drips/. This file is
 * the single source of truth for sequence IDs, day offsets, skip rules, and
 * idempotency key formats — import from apps/api when wiring automation.
 */

export type DripSequenceId = 'onboarding_launch_v1';

export type DripSkipCondition =
  | 'onboarding_incomplete'
  | 'onboarding_complete'
  | 'has_classification'
  | 'has_paid_plan'
  | 'coupon_redeemed';

export interface DripStepDefinition {
  /** Stable step identifier — used in email_drip_log and idempotency keys. */
  id: string;
  /** Days after anchor event (user.created_at for onboarding_launch_v1). */
  dayOffset: number;
  /** React Email component export name (for documentation / tooling). */
  templateExport: string;
  /** Resend tag value on send. */
  tag: string;
  /** Skip sending when any of these conditions are true. */
  skipIf?: DripSkipCondition[];
}

export interface DripSequenceDefinition {
  id: DripSequenceId;
  /** Human-readable name for logs and admin UI. */
  name: string;
  /** Prisma/datetime field that starts the sequence clock. */
  anchorField: 'user.created_at' | 'onboarding.completed_at' | 'launch.registered_at';
  /** Local send hour (24h) in Africa/Lagos. */
  sendHourWAT: number;
  steps: DripStepDefinition[];
}

export const ONBOARDING_LAUNCH_DRIP: DripSequenceDefinition = {
  id:     'onboarding_launch_v1',
  name:   'Onboarding & launch nurture',
  anchorField: 'user.created_at',
  sendHourWAT: 9,
  steps: [
    {
      id:             'welcome',
      dayOffset:      0,
      templateExport: 'WelcomeEmail',
      tag:            'welcome',
    },
    {
      id:             'onboarding_complete',
      dayOffset:      0,
      templateExport: 'OnboardingCompleteEmail',
      tag:            'onboarding_complete',
      // Event-driven at onboarding completion — not cron-scheduled by day offset.
    },
    {
      id:             'classify_reminder',
      dayOffset:      1,
      templateExport: 'DripClassifyReminder',
      tag:            'drip_classify_reminder',
      skipIf:         ['has_classification', 'onboarding_incomplete'],
    },
    {
      id:             'abandoned_onboarding',
      dayOffset:      2,
      templateExport: 'DripAbandonedOnboarding',
      tag:            'drip_abandoned_onboarding',
      skipIf:         ['onboarding_complete'],
    },
    {
      id:             'readiness_explained',
      dayOffset:      2,
      templateExport: 'DripReadinessScoreExplained',
      tag:            'drip_readiness_explained',
      skipIf:         ['onboarding_incomplete'],
    },
    {
      id:             'post_letter_case_study',
      dayOffset:      4,
      templateExport: 'DripPostLetterCaseStudy',
      tag:            'drip_post_letter_case_study',
    },
    {
      id:             'plan_comparison',
      dayOffset:      6,
      templateExport: 'DripPlanComparison',
      tag:            'drip_plan_comparison',
      skipIf:         ['has_paid_plan'],
    },
    {
      id:             'launch_offer_expiry',
      dayOffset:      9,
      templateExport: 'DripLaunchOfferExpiry',
      tag:            'drip_launch_offer_expiry',
      skipIf:         ['has_paid_plan', 'coupon_redeemed'],
    },
  ],
};

export const DRIP_SEQUENCES: readonly DripSequenceDefinition[] = [
  ONBOARDING_LAUNCH_DRIP,
];

/** Build a Resend idempotency key for a drip step. */
export function buildDripIdempotencyKey(
  sequenceId: DripSequenceId,
  stepId: string,
  userId: string,
): string {
  return `drip/${sequenceId}/${stepId}/${userId}`;
}

/**
 * Steps that fire on or after `dayOffset` (not only on the exact day).
 * Catches users who signed up before the cron existed or missed the exact window.
 */
export const DRIP_STEPS_MIN_DAY_OFFSET = new Set<string>(['abandoned_onboarding']);

export function isDripStepDue(stepId: string, dayOffset: number, daysSinceSignup: number): boolean {
  if (DRIP_STEPS_MIN_DAY_OFFSET.has(stepId)) {
    return daysSinceSignup >= dayOffset;
  }
  return daysSinceSignup === dayOffset;
}
