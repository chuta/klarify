import { describe, expect, it } from 'vitest';
import {
  JurisdictionGapRequestSchema,
  JurisdictionGapResultSchema,
  coerceJurisdictionGapResult,
  parseJurisdictionGapResult,
} from '../../validation/jurisdictionGap.js';
import { JURISDICTION_GAP_DISCLAIMER } from '../../types/jurisdictionGap.js';

const validRow = {
  dimension: 'licensing' as const,
  jurisdiction: 'GH' as const,
  status: 'amber' as const,
  current_state: 'SEC Nigeria ARIP at initial assessment.',
  target_requirement: 'VASP registration under Ghana VASP Act 2025.',
  gap_summary: 'Ghana requires separate VASP authorisation.',
  how_to_close: 'Engage Bank of Ghana and SEC Ghana for VASP licensing pathway.',
  citations: [{ regulation: 'Ghana VASP Act 2025', section: 'Act 1154' }],
};

const validGapResult = {
  source_jurisdiction: 'NG' as const,
  target_jurisdictions: ['GH'] as const,
  generated_at: '2026-05-25T09:00:00+01:00',
  dimensions: [validRow],
  regulator_contacts: [
    {
      jurisdiction: 'GH' as const,
      name: 'Securities and Exchange Commission Ghana',
      website: 'https://sec.gov.gh',
      email: 'info@sec.gov.gh',
    },
  ],
  disclaimer: JURISDICTION_GAP_DISCLAIMER,
};

describe('JurisdictionGapRequestSchema', () => {
  it('rejects invalid jurisdiction codes', () => {
    const result = JurisdictionGapRequestSchema.safeParse({
      sourceJurisdiction: 'NG',
      targetJurisdictions: ['US'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects when all targets equal the source jurisdiction', () => {
    const result = JurisdictionGapRequestSchema.safeParse({
      sourceJurisdiction: 'NG',
      targetJurisdictions: ['NG'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate target jurisdictions', () => {
    const result = JurisdictionGapRequestSchema.safeParse({
      sourceJurisdiction: 'NG',
      targetJurisdictions: ['GH', 'GH'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid NG → GH expansion request', () => {
    const result = JurisdictionGapRequestSchema.safeParse({
      sourceJurisdiction: 'NG',
      targetJurisdictions: ['GH'],
    });
    expect(result.success).toBe(true);
  });
});

describe('JurisdictionGapResultSchema', () => {
  it('parses a complete gap analysis result', () => {
    const parsed = parseJurisdictionGapResult(validGapResult);
    expect(parsed.source_jurisdiction).toBe('NG');
    expect(parsed.dimensions[0]?.status).toBe('amber');
  });

  it('allows empty how_to_close when status is green', () => {
    const result = JurisdictionGapResultSchema.safeParse({
      ...validGapResult,
      dimensions: [{ ...validRow, status: 'green', how_to_close: '' }],
    });
    expect(result.success).toBe(true);
  });

  it('requires how_to_close when status is amber or red', () => {
    const result = JurisdictionGapResultSchema.safeParse({
      ...validGapResult,
      dimensions: [{ ...validRow, status: 'red', how_to_close: '   ' }],
    });
    expect(result.success).toBe(false);
  });

  it('coerceJurisdictionGapResult injects disclaimer and generated_at', () => {
    const { disclaimer: _d, generated_at: _g, ...partial } = validGapResult;
    const coerced = coerceJurisdictionGapResult(partial);
    expect(coerced.disclaimer).toBe(JURISDICTION_GAP_DISCLAIMER);
    expect(coerced.generated_at.length).toBeGreaterThanOrEqual(10);
  });
});
