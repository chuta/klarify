// =============================================================================
// emailService.test.ts — unit tests for the notification email service
// (Sprint 5-D2)
//
// Tests cover pure logic only — no Resend or DB connections needed.
// The module-level imports of @klarify/email and prisma are vi.mock'd so
// tests run without any external dependencies.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Set up env before importing the module under test ────────────────────────
process.env.JWT_SECRET          = 'test-jwt-secret-for-unit-tests-only';
process.env.RESEND_API_KEY      = '';  // no real sends in tests
process.env.NEXT_PUBLIC_APP_URL = 'https://klarify.africa';

// ── Mock heavy dependencies ───────────────────────────────────────────────────

vi.mock('@klarify/email', () => ({
  sendDeadlineReminderEmail: vi.fn().mockResolvedValue({ success: true, id: 'mock-id-deadline' }),
  sendWeeklyDigestEmail:     vi.fn().mockResolvedValue({ success: true, id: 'mock-id-digest' }),
  sendAripGrowthAlertEmail:  vi.fn().mockResolvedValue({ success: true, id: 'mock-id-arip' }),
  emailConfig:               { appUrl: 'https://klarify.africa' },
}));

vi.mock('../../db.js', () => ({
  prisma: {
    notificationPreference: {
      findUnique: vi.fn(),
    },
  },
}));

import {
  buildUnsubscribeToken,
  verifyUnsubscribeToken,
  sendDeadlineAlert,
  sendARIPGrowthAlert,
  type NotificationType,
} from '../../services/emailService.js';

import { prisma } from '../../db.js';
import { sendDeadlineReminderEmail, sendAripGrowthAlertEmail } from '@klarify/email';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MOCK_USER_ID = 'user-uuid-1234-5678-abcd';

const mockPrefsOptedIn = {
  userId:                MOCK_USER_ID,
  emailDeadlineAlerts:   true,
  emailWeeklyDigest:     true,
  emailDocumentAnalysis: true,
  emailAripAlerts:       true,
  emailBilling:          true,
  emailLifecycle:        true,
  updatedAt:             new Date(),
};

const mockPrefsOptedOut = {
  ...mockPrefsOptedIn,
  emailAripAlerts:     false,
  emailDeadlineAlerts: false,
};

// =============================================================================
// Unsubscribe token tests
// =============================================================================

describe('buildUnsubscribeToken + verifyUnsubscribeToken', () => {
  it('round-trips a valid token for email_deadline_alerts', () => {
    const token = buildUnsubscribeToken(MOCK_USER_ID, 'email_deadline_alerts');
    const result = verifyUnsubscribeToken(token);
    expect(result).not.toBeNull();
    expect(result!.userId).toBe(MOCK_USER_ID);
    expect(result!.type).toBe('email_deadline_alerts');
  });

  it('round-trips all notification types', () => {
    const types: NotificationType[] = [
      'email_deadline_alerts',
      'email_weekly_digest',
      'email_document_analysis',
      'email_arip_alerts',
      'email_billing',
      'email_lifecycle',
    ];
    for (const type of types) {
      const token = buildUnsubscribeToken(MOCK_USER_ID, type);
      const result = verifyUnsubscribeToken(token);
      expect(result?.type).toBe(type);
    }
  });

  it('returns null for a tampered token (wrong HMAC)', () => {
    const token = buildUnsubscribeToken(MOCK_USER_ID, 'email_arip_alerts');
    // Flip the last character of the HMAC to tamper it.
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });

  it('returns null for a completely invalid token', () => {
    expect(verifyUnsubscribeToken('not-a-token')).toBeNull();
    expect(verifyUnsubscribeToken('')).toBeNull();
  });

  it('encodes the userId in the token payload', () => {
    const token = buildUnsubscribeToken(MOCK_USER_ID, 'email_billing');
    const [encoded] = token.split('.');
    const decoded = Buffer.from(encoded!, 'base64url').toString('utf-8');
    expect(decoded).toContain(MOCK_USER_ID);
  });

  it('different users get different tokens', () => {
    const t1 = buildUnsubscribeToken('user-aaa', 'email_arip_alerts');
    const t2 = buildUnsubscribeToken('user-bbb', 'email_arip_alerts');
    expect(t1).not.toBe(t2);
  });

  it('different types for the same user get different tokens', () => {
    const t1 = buildUnsubscribeToken(MOCK_USER_ID, 'email_arip_alerts');
    const t2 = buildUnsubscribeToken(MOCK_USER_ID, 'email_billing');
    expect(t1).not.toBe(t2);
  });
});

// =============================================================================
// sendDeadlineAlert — preference gate tests
// =============================================================================

describe('sendDeadlineAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends when user is opted-in to deadline_alerts', async () => {
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
      mockPrefsOptedIn as never,
    );

    const result = await sendDeadlineAlert({
      userId:           MOCK_USER_ID,
      to:               'test@example.com',
      name:             'Test User',
      eventTitle:       'STR Filing — Monthly NFIU Submission',
      eventDescription: 'Submit your monthly suspicious transaction report.',
      dueDate:          '1 June 2026',
      daysRemaining:    7,
    });

    expect(result).not.toBeNull();
    expect(sendDeadlineReminderEmail).toHaveBeenCalledOnce();
  });

  it('returns null and does not send when user opted out of deadline_alerts', async () => {
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
      mockPrefsOptedOut as never,
    );

    const result = await sendDeadlineAlert({
      userId:           MOCK_USER_ID,
      to:               'test@example.com',
      name:             'Test User',
      eventTitle:       'STR Filing',
      eventDescription: 'Submit STR.',
      dueDate:          '1 June 2026',
      daysRemaining:    7,
    });

    expect(result).toBeNull();
    expect(sendDeadlineReminderEmail).not.toHaveBeenCalled();
  });

  it('sends when no preference row exists (default opted-in)', async () => {
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(null);

    const result = await sendDeadlineAlert({
      userId:           MOCK_USER_ID,
      to:               'test@example.com',
      name:             'Test User',
      eventTitle:       'BWRA Review',
      eventDescription: 'Annual BWRA review.',
      dueDate:          '15 June 2026',
      daysRemaining:    14,
    });

    expect(result).not.toBeNull();
    expect(sendDeadlineReminderEmail).toHaveBeenCalledOnce();
  });

  it('includes idempotencyKey when provided', async () => {
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
      mockPrefsOptedIn as never,
    );

    await sendDeadlineAlert({
      userId:           MOCK_USER_ID,
      to:               'test@example.com',
      name:             'Test User',
      eventTitle:       'Event',
      eventDescription: 'Desc',
      dueDate:          '1 June 2026',
      daysRemaining:    1,
      idempotencyKey:   'deadline:event-123:1d',
    });

    expect(sendDeadlineReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'deadline:event-123:1d' }),
    );
  });

  it('passes correct daysRemaining for 1-day alert', async () => {
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
      mockPrefsOptedIn as never,
    );

    await sendDeadlineAlert({
      userId:           MOCK_USER_ID,
      to:               'test@example.com',
      name:             'Test',
      eventTitle:       'Due Tomorrow',
      eventDescription: 'Urgent.',
      dueDate:          '23 May 2026',
      daysRemaining:    1,
    });

    expect(sendDeadlineReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({ daysRemaining: 1 }),
    );
  });
});

// =============================================================================
// sendARIPGrowthAlert — preference gate tests
// =============================================================================

describe('sendARIPGrowthAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseAlert = {
    userId:              MOCK_USER_ID,
    to:                  'compliance@example.com',
    name:                'Compliance Officer',
    organisationName:    'Acme Exchange Ltd',
    currentCustomers:    46,
    maxCustomers:        50,
    utilPct:             92,
    daysUntilAipExpiry:  45,
    capBreached:         false,
  };

  it('sends when user is opted-in to arip_alerts', async () => {
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
      mockPrefsOptedIn as never,
    );

    const result = await sendARIPGrowthAlert(baseAlert);

    expect(result).not.toBeNull();
    expect(sendAripGrowthAlertEmail).toHaveBeenCalledOnce();
  });

  it('returns null and does not send when opted out of arip_alerts', async () => {
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
      mockPrefsOptedOut as never,
    );

    const result = await sendARIPGrowthAlert(baseAlert);

    expect(result).toBeNull();
    expect(sendAripGrowthAlertEmail).not.toHaveBeenCalled();
  });

  it('sends breach alert with capBreached=true', async () => {
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
      mockPrefsOptedIn as never,
    );

    await sendARIPGrowthAlert({
      ...baseAlert,
      currentCustomers: 50,
      utilPct:          100,
      capBreached:      true,
    });

    expect(sendAripGrowthAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({ capBreached: true }),
    );
  });

  it('includes unsubscribe URL in the email props', async () => {
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
      mockPrefsOptedIn as never,
    );

    await sendARIPGrowthAlert(baseAlert);

    const call = vi.mocked(sendAripGrowthAlertEmail).mock.calls[0]![0];
    expect((call as { unsubscribeUrl: string }).unsubscribeUrl).toMatch(/unsubscribe/);
    expect((call as { unsubscribeUrl: string }).unsubscribeUrl).toMatch(/email_arip_alerts/);
  });

  it('sends when no preference row exists (default opted-in)', async () => {
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(null);

    const result = await sendARIPGrowthAlert(baseAlert);

    expect(result).not.toBeNull();
    expect(sendAripGrowthAlertEmail).toHaveBeenCalledOnce();
  });

  it('passes correct utilPct and customer counts to the template', async () => {
    vi.mocked(prisma.notificationPreference.findUnique).mockResolvedValue(
      mockPrefsOptedIn as never,
    );

    await sendARIPGrowthAlert({ ...baseAlert, currentCustomers: 45, utilPct: 90 });

    expect(sendAripGrowthAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        currentCustomers: 45,
        utilPct:          90,
        maxCustomers:     50,
      }),
    );
  });
});

// =============================================================================
// Token idempotency — same input always produces same token
// =============================================================================

describe('token idempotency', () => {
  it('produces the same token for the same userId + type', () => {
    const t1 = buildUnsubscribeToken(MOCK_USER_ID, 'email_deadline_alerts');
    const t2 = buildUnsubscribeToken(MOCK_USER_ID, 'email_deadline_alerts');
    expect(t1).toBe(t2);
  });
});
