/**
 * Phase 3 ARIP Task Library — unit tests.
 * Validates all 11 Phase 3 tasks from the ARIP Framework (SEC Nigeria, June 2024).
 */

import { describe, it, expect } from 'vitest';
import { PHASE_3_ARIP_TASKS } from '../../roadmap/templates.js';

describe('PHASE_3_ARIP_TASKS', () => {
  it('contains exactly 11 tasks', () => {
    expect(PHASE_3_ARIP_TASKS).toHaveLength(11);
  });

  it('all tasks have IDs P3-01 through P3-11', () => {
    const ids = PHASE_3_ARIP_TASKS.map((t) => t.id).sort();
    expect(ids).toEqual([
      'P3-01', 'P3-02', 'P3-03', 'P3-04', 'P3-05',
      'P3-06', 'P3-07', 'P3-08', 'P3-09', 'P3-10', 'P3-11',
    ]);
  });

  it('all tasks have phase = 3', () => {
    for (const task of PHASE_3_ARIP_TASKS) {
      expect(task.phase).toBe(3);
    }
  });

  it('P3-01 (solicitor engagement) is a blocker', () => {
    const task = PHASE_3_ARIP_TASKS.find((t) => t.id === 'P3-01');
    expect(task).toBeDefined();
    expect(task?.is_blocker).toBe(true);
  });

  it('P3-10 (customer baseline) is a blocker', () => {
    const task = PHASE_3_ARIP_TASKS.find((t) => t.id === 'P3-10');
    expect(task).toBeDefined();
    expect(task?.is_blocker).toBe(true);
  });

  it('P3-09 (submit initial assessment) depends on P3-01, P3-02, P3-03', () => {
    const task = PHASE_3_ARIP_TASKS.find((t) => t.id === 'P3-09');
    expect(task?.depends_on).toEqual(expect.arrayContaining(['P3-01', 'P3-02', 'P3-03']));
    expect(task?.depends_on).toHaveLength(3);
  });

  it('P3-02 depends on P3-01', () => {
    const task = PHASE_3_ARIP_TASKS.find((t) => t.id === 'P3-02');
    expect(task?.depends_on).toContain('P3-01');
  });

  it('P3-03 depends on P3-01', () => {
    const task = PHASE_3_ARIP_TASKS.find((t) => t.id === 'P3-03');
    expect(task?.depends_on).toContain('P3-01');
  });

  it('P3-06 depends on P3-03', () => {
    const task = PHASE_3_ARIP_TASKS.find((t) => t.id === 'P3-06');
    expect(task?.depends_on).toContain('P3-03');
  });

  it('all tasks have regulatory_basis citations', () => {
    for (const task of PHASE_3_ARIP_TASKS) {
      expect(task.regulatory_basis).toBeTruthy();
      expect(task.regulatory_basis).toContain('ARIP Framework');
      expect(task.regulatory_basis).toContain('SEC Nigeria');
    }
  });

  it('all tasks have product_types = [ALL]', () => {
    for (const task of PHASE_3_ARIP_TASKS) {
      expect(task.product_types).toContain('ALL');
    }
  });

  it('all tasks have effort_days_min and effort_days_max', () => {
    for (const task of PHASE_3_ARIP_TASKS) {
      expect(typeof task.effort_days_min).toBe('number');
      expect(typeof task.effort_days_max).toBe('number');
      expect(task.effort_days_max).toBeGreaterThanOrEqual(task.effort_days_min);
    }
  });

  it('P3-05 links to ARIP_OPERATIONAL_PLAN template', () => {
    const task = PHASE_3_ARIP_TASKS.find((t) => t.id === 'P3-05');
    expect(task?.template_id).toBe('ARIP_OPERATIONAL_PLAN');
  });

  it('P3-06 links to ARIP_SWORN_UNDERTAKING template', () => {
    const task = PHASE_3_ARIP_TASKS.find((t) => t.id === 'P3-06');
    expect(task?.template_id).toBe('ARIP_SWORN_UNDERTAKING');
  });

  it('P3-08 links to ARIP_ENTITY_RULES template', () => {
    const task = PHASE_3_ARIP_TASKS.find((t) => t.id === 'P3-08');
    expect(task?.template_id).toBe('ARIP_ENTITY_RULES');
  });

  it('P3-01 indicator_key is capital_licensing.registered_solicitor_engaged', () => {
    const task = PHASE_3_ARIP_TASKS.find((t) => t.id === 'P3-01');
    expect(task?.indicator_key).toBe('capital_licensing.registered_solicitor_engaged');
  });

  it('P3-10 indicator_key is capital_licensing.customer_growth_baseline_recorded', () => {
    const task = PHASE_3_ARIP_TASKS.find((t) => t.id === 'P3-10');
    expect(task?.indicator_key).toBe('capital_licensing.customer_growth_baseline_recorded');
  });
});

describe('Growth cap calculation', () => {
  it('110 customers with 100 baseline = 10% growth', () => {
    const baseline = 100;
    const current = 110;
    const growthPct = ((current - baseline) / baseline) * 100;
    expect(growthPct).toBe(10);
  });

  it('108 customers with 100 baseline = 8% growth (amber warning)', () => {
    const baseline = 100;
    const current = 108;
    const growthPct = ((current - baseline) / baseline) * 100;
    expect(growthPct).toBe(8);
  });

  it('105 customers with 100 baseline = 5% growth (green)', () => {
    const baseline = 100;
    const current = 105;
    const growthPct = ((current - baseline) / baseline) * 100;
    expect(growthPct).toBe(5);
  });

  it('growth cap breach threshold is >= 10%', () => {
    const isBreach = (baseline: number, current: number): boolean =>
      ((current - baseline) / baseline) * 100 >= 10;
    expect(isBreach(100, 109)).toBe(false);
    expect(isBreach(100, 110)).toBe(true);
    expect(isBreach(100, 111)).toBe(true);
  });
});
