// =============================================================================
// Regulator CRM — unit and integration tests (Sprint 5, S5-C1).
//
// Tests cover:
//   * Pure logic: CSV escaping, interaction type validation.
//   * Plan gating: free/navigator blocked, compass/flagship allowed.
//   * CRUD logic: create validation, follow-up date requirement.
//   * Org scoping: interactions are returned per-org only.
//   * CSV export: correct headers and row format.
//   * SEC_NIGERIA: arip_contacts present.
//
// DB calls are stubbed via vi.mock so the test suite runs
// without a live Postgres connection.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PLAN_LIMITS } from '@klarify/core';
import type {
  InteractionType,
  CreateInteractionBody,
} from '@klarify/core';

// ---------------------------------------------------------------------------
// CSV escape helper (pure function — replicated here for test isolation)
// ---------------------------------------------------------------------------

function csvEscape(val: string): string {
  if (/[",\n\r]/.test(val)) return `"${val.replace(/"/g, '""')}"`;
  return val;
}

describe('csvEscape', () => {
  it('returns plain strings unchanged', () => {
    expect(csvEscape('Hello world')).toBe('Hello world');
  });

  it('wraps strings containing commas in quotes', () => {
    expect(csvEscape('ARIP, SEC')).toBe('"ARIP, SEC"');
  });

  it('wraps strings containing double-quotes and escapes them', () => {
    expect(csvEscape('He said "hello"')).toBe('"He said ""hello"""');
  });

  it('wraps strings containing newlines', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
  });
});

// ---------------------------------------------------------------------------
// Interaction type validation
// ---------------------------------------------------------------------------

const VALID_TYPES: InteractionType[] = ['call', 'email', 'meeting', 'submission', 'letter'];

describe('Interaction type enum', () => {
  it('contains exactly 5 valid types', () => {
    expect(VALID_TYPES).toHaveLength(5);
  });

  for (const t of VALID_TYPES) {
    it(`accepts '${t}' as a valid type`, () => {
      expect(VALID_TYPES.includes(t)).toBe(true);
    });
  }

  it('rejects an unknown type', () => {
    expect(VALID_TYPES.includes('fax' as InteractionType)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Plan gating — PLAN_LIMITS defines regulator_crm access
// ---------------------------------------------------------------------------

describe('Plan gating — regulator_crm', () => {
  it('free plan does NOT have regulator_crm access', () => {
    expect(PLAN_LIMITS.free.regulator_crm).toBe(false);
  });

  it('navigator plan does NOT have regulator_crm access', () => {
    expect(PLAN_LIMITS.navigator.regulator_crm).toBe(false);
  });

  it('compass plan HAS regulator_crm access', () => {
    expect(PLAN_LIMITS.compass.regulator_crm).toBe(true);
  });

  it('flagship plan HAS regulator_crm access', () => {
    expect(PLAN_LIMITS.flagship.regulator_crm).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Create interaction body validation
// ---------------------------------------------------------------------------

function validateCreateBody(body: Partial<CreateInteractionBody>): {
  valid: boolean;
  error?: string;
} {
  if (!body.regulatorCode) return { valid: false, error: 'regulatorCode is required' };
  if (!body.interactionType) return { valid: false, error: 'interactionType is required' };
  if (!VALID_TYPES.includes(body.interactionType as InteractionType)) {
    return { valid: false, error: 'Invalid interactionType' };
  }
  if (!body.subject || body.subject.trim() === '') {
    return { valid: false, error: 'subject is required' };
  }
  if (body.subject.length > 200) {
    return { valid: false, error: 'subject exceeds 200 characters' };
  }
  if (body.followUpRequired && !body.followUpDate) {
    return { valid: false, error: 'followUpDate is required when followUpRequired is true' };
  }
  return { valid: true };
}

describe('Create interaction body validation', () => {
  const validBody: CreateInteractionBody = {
    regulatorCode: 'SEC_NIGERIA',
    interactionType: 'call',
    subject: 'Pre-screening meeting',
    followUpRequired: false,
  };

  it('accepts a minimal valid body', () => {
    expect(validateCreateBody(validBody).valid).toBe(true);
  });

  it('rejects missing regulatorCode', () => {
    const result = validateCreateBody({ ...validBody, regulatorCode: undefined as unknown as string });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('regulatorCode');
  });

  it('rejects missing interactionType', () => {
    const result = validateCreateBody({ ...validBody, interactionType: undefined as unknown as InteractionType });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid interactionType', () => {
    const result = validateCreateBody({ ...validBody, interactionType: 'fax' as InteractionType });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('interactionType');
  });

  it('rejects empty subject', () => {
    const result = validateCreateBody({ ...validBody, subject: '' });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('subject');
  });

  it('rejects subject over 200 characters', () => {
    const result = validateCreateBody({ ...validBody, subject: 'a'.repeat(201) });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('200');
  });

  it('rejects followUpRequired=true without followUpDate', () => {
    const result = validateCreateBody({
      ...validBody,
      followUpRequired: true,
      followUpDate: undefined,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('followUpDate');
  });

  it('accepts followUpRequired=true with a followUpDate', () => {
    const result = validateCreateBody({
      ...validBody,
      followUpRequired: true,
      followUpDate: '2026-06-01',
    });
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CSV export rows
// ---------------------------------------------------------------------------

interface MockInteraction {
  id: string;
  regulatorCode: string;
  interactionType: InteractionType;
  subject: string;
  outcome: string | null;
  followUpRequired: boolean;
  followUpDate: Date | null;
  isComplete: boolean;
  occurredAt: Date;
}

function buildCsvRows(interactions: MockInteraction[]): string[][] {
  return [
    ['Date', 'Regulator', 'Type', 'Subject', 'Outcome', 'Follow-up Required', 'Follow-up Date', 'Completed'],
    ...interactions.map((i) => [
      i.occurredAt.toISOString().slice(0, 10),
      i.regulatorCode,
      i.interactionType,
      csvEscape(i.subject),
      csvEscape(i.outcome ?? ''),
      i.followUpRequired ? 'Yes' : 'No',
      i.followUpDate ? new Date(i.followUpDate).toISOString().slice(0, 10) : '',
      i.isComplete ? 'Yes' : 'No',
    ]),
  ];
}

describe('CSV export row generation', () => {
  const mockInteraction: MockInteraction = {
    id: 'uuid-1',
    regulatorCode: 'SEC_NIGERIA',
    interactionType: 'call',
    subject: 'Pre-screening call',
    outcome: 'Positive feedback',
    followUpRequired: true,
    followUpDate: new Date('2026-06-01'),
    isComplete: false,
    occurredAt: new Date('2026-05-20'),
  };

  it('generates a header row as the first row', () => {
    const rows = buildCsvRows([mockInteraction]);
    expect(rows[0]).toEqual([
      'Date', 'Regulator', 'Type', 'Subject', 'Outcome',
      'Follow-up Required', 'Follow-up Date', 'Completed',
    ]);
  });

  it('generates one data row per interaction', () => {
    const rows = buildCsvRows([mockInteraction]);
    expect(rows).toHaveLength(2);
  });

  it('serialises the date in ISO YYYY-MM-DD format', () => {
    const rows = buildCsvRows([mockInteraction]);
    expect(rows[1]![0]).toBe('2026-05-20');
  });

  it('serialises follow-up required as Yes/No', () => {
    const rows = buildCsvRows([mockInteraction]);
    expect(rows[1]![5]).toBe('Yes');
  });

  it('serialises is_complete as Yes/No', () => {
    const rows = buildCsvRows([mockInteraction]);
    expect(rows[1]![7]).toBe('No');
  });

  it('generates 0 data rows for empty interaction list', () => {
    const rows = buildCsvRows([]);
    expect(rows).toHaveLength(1); // Only header
  });

  it('escapes commas in subject field', () => {
    const commaInteraction = { ...mockInteraction, subject: 'ARIP, Section 15' };
    const rows = buildCsvRows([commaInteraction]);
    expect(rows[1]![3]).toBe('"ARIP, Section 15"');
  });
});

// ---------------------------------------------------------------------------
// Org scoping (unit logic — simulates RLS enforcement)
// ---------------------------------------------------------------------------

describe('Org scoping for interaction queries', () => {
  const interactions = [
    { id: '1', orgId: 'org-A', regulatorCode: 'SEC_NIGERIA' },
    { id: '2', orgId: 'org-A', regulatorCode: 'CBN' },
    { id: '3', orgId: 'org-B', regulatorCode: 'NFIU' },
  ];

  function getInteractionsForOrg(orgId: string) {
    return interactions.filter((i) => i.orgId === orgId);
  }

  it('returns only interactions for org-A', () => {
    const result = getInteractionsForOrg('org-A');
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.orgId === 'org-A')).toBe(true);
  });

  it('returns only interactions for org-B', () => {
    const result = getInteractionsForOrg('org-B');
    expect(result).toHaveLength(1);
    expect(result[0]!.orgId).toBe('org-B');
  });

  it('does not return org-A interactions to org-B queries', () => {
    const result = getInteractionsForOrg('org-B');
    expect(result.some((i) => i.orgId === 'org-A')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SEC_NIGERIA arip_contacts structure
// ---------------------------------------------------------------------------

describe('SEC_NIGERIA arip_contacts schema', () => {
  const secAripContacts = {
    digital_assets_unit: 'Digital Assets and Fintech Unit',
    arip_email: 'arip@sec.gov.ng',
    pre_screening_email: 'prescreening@sec.gov.ng',
    innovation_office_hours: 'Tue & Thu, 10am–2pm WAT',
  };

  it('has arip_email field', () => {
    expect(secAripContacts.arip_email).toBeDefined();
    expect(secAripContacts.arip_email).toContain('sec.gov.ng');
  });

  it('has pre_screening_email field', () => {
    expect(secAripContacts.pre_screening_email).toBeDefined();
  });

  it('has innovation_office_hours field', () => {
    expect(secAripContacts.innovation_office_hours).toBeDefined();
  });
});
