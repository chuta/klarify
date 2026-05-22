import { describe, it, expect } from 'vitest';
import {
  getSpecialistById,
  messageSuggestsEscalation,
  specialistsForTopic,
  VETTED_SPECIALISTS,
} from '../../specialists/directory.js';
import { specialistRequestSchema } from '../../validation/specialists.js';

describe('VETTED_SPECIALISTS', () => {
  it('has at least 8 entries', () => {
    expect(VETTED_SPECIALISTS.length).toBeGreaterThanOrEqual(8);
  });

  it('every entry is verified', () => {
    for (const s of VETTED_SPECIALISTS) {
      expect(s.verified).toBe(true);
      expect(s.id.length).toBeGreaterThan(0);
      expect(s.specialties.length).toBeGreaterThan(0);
    }
  });
});

describe('specialistsForTopic', () => {
  it('returns AML specialists for aml topic', () => {
    const list = specialistsForTopic('aml');
    expect(list.length).toBeGreaterThan(0);
    expect(list.every((s) => s.specialties.includes('aml'))).toBe(true);
  });
});

describe('getSpecialistById', () => {
  it('finds known id', () => {
    expect(getSpecialistById('sp-arip-01')?.name).toContain('ARIP');
  });
});

describe('messageSuggestsEscalation', () => {
  it('detects escalation offer language', () => {
    expect(
      messageSuggestsEscalation(
        'Would you like me to connect you with a vetted Nigerian digital asset regulatory lawyer?',
      ),
    ).toBe(true);
  });

  it('returns false for generic answers', () => {
    expect(messageSuggestsEscalation('Under ISA 2025, Section 357…')).toBe(false);
  });
});

describe('specialistRequestSchema', () => {
  it('accepts valid payload', () => {
    const result = specialistRequestSchema.safeParse({
      name: 'Ada Okonkwo',
      email: 'ada@example.com',
      company: 'Acme Digital Ltd',
      topic: 'enforcement_response',
      urgency: 'critical',
      message: 'We received an SEC Nigeria letter and need specialist review before responding.',
      source: 'document_analyser',
      context: { documentId: '550e8400-e29b-41d4-a716-446655440000' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects short message', () => {
    const result = specialistRequestSchema.safeParse({
      name: 'Ada Okonkwo',
      email: 'ada@example.com',
      company: 'Acme Digital Ltd',
      topic: 'general',
      urgency: 'standard',
      message: 'Too short',
    });
    expect(result.success).toBe(false);
  });
});
