import { describe, expect, it } from 'vitest';
import { KLARIFY_SCENARIO_PROMPT } from '../../prompts/scenario.js';

describe('KLARIFY_SCENARIO_PROMPT', () => {
  it('requires JSON-only output with three outcome branches', () => {
    expect(KLARIFY_SCENARIO_PROMPT).toContain('JSON object only');
    expect(KLARIFY_SCENARIO_PROMPT).toContain('best_case');
    expect(KLARIFY_SCENARIO_PROMPT).toContain('likely_case');
    expect(KLARIFY_SCENARIO_PROMPT).toContain('worst_case');
    expect(KLARIFY_SCENARIO_PROMPT).toContain('probability');
    expect(KLARIFY_SCENARIO_PROMPT).toContain('regulatory_basis');
    expect(KLARIFY_SCENARIO_PROMPT).toContain('business_impact');
    expect(KLARIFY_SCENARIO_PROMPT).toContain('recommended_mitigation');
  });

  it('includes mandatory legal disclaimer requirement', () => {
    expect(KLARIFY_SCENARIO_PROMPT).toContain('not legal advice');
    expect(KLARIFY_SCENARIO_PROMPT).toContain('disclaimer');
  });

  it('forbids hallucinated citations and requires plain language', () => {
    expect(KLARIFY_SCENARIO_PROMPT).toContain('NEVER HALLUCINATE');
    expect(KLARIFY_SCENARIO_PROMPT).toContain('PLAIN LANGUAGE');
    expect(KLARIFY_SCENARIO_PROMPT).toContain('ALWAYS CITE');
  });
});
