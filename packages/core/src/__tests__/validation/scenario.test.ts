import { describe, expect, it } from 'vitest';
import {
  SCENARIO_TEMPLATES,
  SCENARIO_TEMPLATE_IDS,
  getScenarioTemplate,
} from '../../scenarios/templates.js';
import {
  ScenarioRequestSchema,
  ScenarioResultSchema,
  coerceScenarioResult,
  parseScenarioResult,
} from '../../validation/scenario.js';
import { SCENARIO_DISCLAIMER } from '../../types/scenario.js';

const validOutcome = {
  label: 'best_case' as const,
  probability: 'LOW' as const,
  summary: 'Best outcome summary.',
  regulatory_basis: 'Under ISA 2025, Section 357, digital assets are securities.',
  business_impact: 'Minimal disruption if licensing proceeds on schedule.',
  recommended_mitigation: 'Engage SEC Nigeria before public launch.',
  citations: [{ regulation: 'ISA 2025', section: 'Section 357' }],
};

const validScenarioResult = {
  scenario_summary: 'Launching a DAX without SEC registration.',
  outcomes: {
    best_case: { ...validOutcome, label: 'best_case' as const },
    likely_case: { ...validOutcome, label: 'likely_case' as const, probability: 'HIGH' as const },
    worst_case: { ...validOutcome, label: 'worst_case' as const, probability: 'MEDIUM' as const },
  },
  key_assumptions: ['User operates in Nigeria only.'],
  citations: [{ regulation: 'ISA 2025', section: 'Section 357' }],
  disclaimer: SCENARIO_DISCLAIMER,
};

describe('SCENARIO_TEMPLATES', () => {
  it('defines exactly 8 pre-built scenarios (S1–S8)', () => {
    expect(SCENARIO_TEMPLATES).toHaveLength(8);
    expect(SCENARIO_TEMPLATE_IDS).toHaveLength(8);
    expect(new Set(SCENARIO_TEMPLATE_IDS).size).toBe(8);
  });

  it('each template has id, title, description, and prefillText ≥ 30 chars', () => {
    for (const template of SCENARIO_TEMPLATES) {
      expect(template.id.length).toBeGreaterThan(0);
      expect(template.title.length).toBeGreaterThan(0);
      expect(template.description.length).toBeGreaterThan(0);
      expect(template.prefillText.trim().length).toBeGreaterThanOrEqual(30);
      expect(getScenarioTemplate(template.id)).toEqual(template);
    }
  });
});

describe('ScenarioRequestSchema', () => {
  it('rejects scenario text shorter than 30 characters', () => {
    const result = ScenarioRequestSchema.safeParse({ scenario: 'Too short.' });
    expect(result.success).toBe(false);
  });

  it('accepts valid scenario text and known templateId', () => {
    const result = ScenarioRequestSchema.safeParse({
      scenario: 'We plan to launch a crypto exchange in Lagos without SEC registration.',
      templateId: 'launch-without-arip',
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown templateId', () => {
    const result = ScenarioRequestSchema.safeParse({
      scenario: 'We plan to launch a crypto exchange in Lagos without SEC registration.',
      templateId: 'not-a-real-template',
    });
    expect(result.success).toBe(false);
  });
});

describe('ScenarioResultSchema', () => {
  it('parses a complete scenario result with mandatory disclaimer', () => {
    const parsed = parseScenarioResult(validScenarioResult);
    expect(parsed.disclaimer).toContain('not legal advice');
    expect(parsed.outcomes.likely_case.probability).toBe('HIGH');
  });

  it('coerceScenarioResult injects disclaimer when omitted', () => {
    const { disclaimer: _removed, ...withoutDisclaimer } = validScenarioResult;
    const coerced = coerceScenarioResult(withoutDisclaimer);
    expect(coerced.disclaimer).toBe(SCENARIO_DISCLAIMER);
  });

  it('rejects result without legal disclaimer wording', () => {
    expect(() =>
      parseScenarioResult({
        ...validScenarioResult,
        disclaimer: 'Generic footer text only.',
      }),
    ).toThrow(/mandatory legal disclaimer/);
  });
});
