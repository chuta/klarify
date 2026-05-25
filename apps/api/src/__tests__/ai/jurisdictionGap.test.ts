import { describe, it, expect } from 'vitest';
import {
  parseJurisdictionGapResult,
  JurisdictionGapRequestSchema,
  JURISDICTION_GAP_DIMENSIONS,
  JURISDICTION_GAP_DISCLAIMER,
} from '@klarify/core';

function rowFor(jurisdiction: 'GH', dimension: (typeof JURISDICTION_GAP_DIMENSIONS)[number]) {
  return {
    dimension,
    jurisdiction,
    status: 'amber' as const,
    current_state: 'Partial NG compliance.',
    target_requirement: 'Ghana VASP Act requirement.',
    gap_summary: 'Gap exists.',
    how_to_close: 'Engage SEC Ghana.',
    citations: [{ regulation: 'Ghana VASP Act 2025', section: 'Act 1154' }],
  };
}

describe('Jurisdiction gap API contract', () => {
  it('JurisdictionGapRequestSchema accepts NG→GH', () => {
    expect(
      JurisdictionGapRequestSchema.safeParse({
        sourceJurisdiction: 'NG',
        targetJurisdictions: ['GH'],
      }).success,
    ).toBe(true);
  });

  it('parseJurisdictionGapResult validates 7 dimensions per target', () => {
    const dimensions = JURISDICTION_GAP_DIMENSIONS.map((d) => rowFor('GH', d));
    const result = parseJurisdictionGapResult({
      source_jurisdiction: 'NG',
      target_jurisdictions: ['GH'],
      generated_at: '2026-05-25T09:00:00+01:00',
      dimensions,
      regulator_contacts: [
        {
          jurisdiction: 'GH',
          name: 'SEC Ghana',
          website: 'https://sec.gov.gh',
          email: 'info@sec.gov.gh',
        },
      ],
      disclaimer: JURISDICTION_GAP_DISCLAIMER,
    });
    expect(result.dimensions).toHaveLength(7);
    expect(result.disclaimer).toContain('not legal advice');
  });
});
