import { describe, it, expect } from 'vitest';
import { parseScenarioResult, ScenarioRequestSchema } from '@klarify/core';
import { SCENARIO_DISCLAIMER } from '@klarify/core';
import { extractJsonObject } from '../../utils/extractJson.js';

const validOutcome = {
  label: 'likely_case' as const,
  probability: 'HIGH' as const,
  summary: 'Summary text.',
  regulatory_basis: 'Under ISA 2025, Section 357.',
  business_impact: 'Business impact text.',
  recommended_mitigation: 'Mitigation steps.',
  citations: [{ regulation: 'ISA 2025', section: 'Section 357' }],
};

const validResult = {
  scenario_summary: 'Launch without ARIP.',
  outcomes: {
    best_case: { ...validOutcome, label: 'best_case' as const, probability: 'LOW' as const },
    likely_case: validOutcome,
    worst_case: { ...validOutcome, label: 'worst_case' as const, probability: 'MEDIUM' as const },
  },
  key_assumptions: ['Operating in Nigeria.'],
  citations: [{ regulation: 'ISA 2025', section: 'Section 357' }],
  disclaimer: SCENARIO_DISCLAIMER,
};

describe('Scenario API contract', () => {
  it('ScenarioRequestSchema rejects short scenario text', () => {
    expect(ScenarioRequestSchema.safeParse({ scenario: 'Too short' }).success).toBe(false);
  });

  it('parseScenarioResult accepts three outcomes with disclaimer', () => {
    const parsed = parseScenarioResult(validResult);
    expect(parsed.outcomes.worst_case.label).toBe('worst_case');
    expect(parsed.disclaimer).toContain('not legal advice');
  });

  it('extractJsonObject parses fenced scenario JSON', () => {
    const raw = '```json\n' + JSON.stringify(validResult) + '\n```';
    expect(extractJsonObject(raw)).toEqual(validResult);
  });

  it('extractJsonObject repairs truncated JSON objects', () => {
    const truncated = '{"scenario_summary":"Launch without ARIP.","outcomes":{"likely_case":{"label":"likely_case"';
    const parsed = extractJsonObject(truncated) as { scenario_summary?: string };
    expect(parsed.scenario_summary).toBe('Launch without ARIP.');
  });
});
