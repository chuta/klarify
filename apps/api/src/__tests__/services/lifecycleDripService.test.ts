// =============================================================================
// lifecycleDripService.test.ts — pure logic for onboarding drip cron
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  daysSinceSignup,
  getLaunchOfferConfig,
  shouldSkipStep,
  type UserDripContext,
} from '../../services/lifecycleDripService.js';
import type { DripStepDefinition } from '@klarify/email';

const BASE_CTX: UserDripContext = {
  userId:                      'user-1',
  email:                       'founder@example.com',
  name:                        'Ada',
  createdAt:                   new Date('2026-05-01T12:00:00Z'),
  onboardingComplete:          true,
  hasClassification:           false,
  hasPaidPlan:                 false,
  hasLaunchCouponRedemption:   false,
  score:                       42,
  currentPlan:                 'free',
};

describe('daysSinceSignup', () => {
  it('returns 0 on signup day', () => {
    const signup = new Date('2026-05-10T15:30:00Z');
    const now = new Date('2026-05-10T08:00:00Z');
    expect(daysSinceSignup(signup, now)).toBe(0);
  });

  it('returns 2 two calendar days later', () => {
    const signup = new Date('2026-05-10T12:00:00Z');
    const now = new Date('2026-05-12T09:00:00Z');
    expect(daysSinceSignup(signup, now)).toBe(2);
  });
});

describe('getLaunchOfferConfig', () => {
  const signup = new Date('2026-05-01T12:00:00Z');

  beforeEach(() => {
    delete process.env.LAUNCH_OFFER_EXPIRY_LABEL;
    delete process.env.LAUNCH_COUPON_CODE;
    delete process.env.LAUNCH_COUPON_DISCOUNT_PERCENT;
    delete process.env.LAUNCH_COUPON_VALID_DAYS;
  });

  it('uses defaults when env is unset', () => {
    const cfg = getLaunchOfferConfig(signup);
    expect(cfg.couponCode).toBe('LAUNCH20');
    expect(cfg.discountPercent).toBe(20);
    expect(cfg.expiryDateLabel.length).toBeGreaterThan(5);
  });

  it('respects LAUNCH_OFFER_EXPIRY_LABEL override', () => {
    process.env.LAUNCH_OFFER_EXPIRY_LABEL = 'Friday, 15 May 2026';
    const cfg = getLaunchOfferConfig(signup);
    expect(cfg.expiryDateLabel).toBe('Friday, 15 May 2026');
  });
});

describe('shouldSkipStep', () => {
  const readinessStep: DripStepDefinition = {
    id:             'readiness_explained',
    dayOffset:      2,
    templateExport: 'DripReadinessScoreExplained',
    tag:            'drip_readiness_explained',
    skipIf:         ['onboarding_incomplete'],
  };

  const planStep: DripStepDefinition = {
    id:             'plan_comparison',
    dayOffset:      6,
    templateExport: 'DripPlanComparison',
    tag:            'drip_plan_comparison',
    skipIf:         ['has_paid_plan'],
  };

  it('skips readiness email when onboarding incomplete', () => {
    expect(
      shouldSkipStep(readinessStep, { ...BASE_CTX, onboardingComplete: false }),
    ).toBe(true);
  });

  it('does not skip readiness email when onboarding complete', () => {
    expect(shouldSkipStep(readinessStep, BASE_CTX)).toBe(false);
  });

  it('skips plan comparison when user has paid plan', () => {
    expect(
      shouldSkipStep(planStep, { ...BASE_CTX, hasPaidPlan: true, currentPlan: 'compass' }),
    ).toBe(true);
  });
});
