import { describe, expect, it } from 'vitest';
import { KLARIFY_JURISDICTION_PROMPT } from '../../prompts/jurisdiction.js';

describe('KLARIFY_JURISDICTION_PROMPT', () => {
  it('requires JSON-only output with seven dimensions per target', () => {
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('JSON object only');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('corporate_structure');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('licensing');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('capital_requirements');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('aml_cft_programme');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('kyc_standards');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('reporting_obligations');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('regulatory_contacts');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('how_to_close');
  });

  it('includes mandatory legal disclaimer requirement', () => {
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('not legal advice');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('disclaimer');
  });

  it('references African jurisdiction corpus sources', () => {
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('Ghana VASP Act 2025');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('Kenya VASP Act 2025');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('VAITOS Act 2021');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('CASP/FSCA');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('ISA 2025');
  });

  it('requires green / amber / red status and anti-hallucination rule', () => {
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('green');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('amber');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('red');
    expect(KLARIFY_JURISDICTION_PROMPT).toContain('NEVER HALLUCINATE');
  });
});
