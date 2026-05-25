import { describe, it, expect } from 'vitest';
import { SCENARIO_TEMPLATES, SCENARIO_DISCLAIMER } from '@klarify/core';

describe('ScenarioSimulator UI data', () => {
  it('exposes 8 templates with prefill text', () => {
    expect(SCENARIO_TEMPLATES).toHaveLength(8);
    for (const t of SCENARIO_TEMPLATES) {
      expect(t.prefillText.length).toBeGreaterThanOrEqual(30);
    }
  });

  it('includes mandatory disclaimer constant', () => {
    expect(SCENARIO_DISCLAIMER).toContain('not legal advice');
  });
});
