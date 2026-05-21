// =============================================================================
// generateRoadmap — unit tests.
// Verifies that seed templates are correctly materialised into per-org tasks
// with the right initial lock state.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  generateRoadmap,
  templateMatchesProductTypes,
} from '../../roadmap/generateRoadmap.js';
import { ALL_SEED_TEMPLATES } from '../../roadmap/seedTaskTemplates.js';

describe('generateRoadmap()', () => {
  it('returns tasks for all 4 phases for an ALL-product user', () => {
    const tasks = generateRoadmap({ product_types: ['DAX'] });
    const phases = new Set(tasks.map((t) => t.phase));
    expect(phases.has(1)).toBe(true);
    expect(phases.has(2)).toBe(true);
    expect(phases.has(3)).toBe(true);
    expect(phases.has(4)).toBe(true);
  });

  it('Phase 1 tasks are unlocked, Phase 2-4 are locked on initial generation', () => {
    const tasks = generateRoadmap({ product_types: ['DAX'] });
    const phase1 = tasks.filter((t) => t.phase === 1);
    const phase2 = tasks.filter((t) => t.phase === 2);
    const phase3 = tasks.filter((t) => t.phase === 3);
    const phase4 = tasks.filter((t) => t.phase === 4);

    expect(phase1.length).toBeGreaterThan(0);
    expect(phase2.length).toBeGreaterThan(0);
    expect(phase3.length).toBeGreaterThan(0);
    expect(phase4.length).toBeGreaterThan(0);

    expect(phase1.every((t) => t.isLocked === false)).toBe(true);
    expect(phase2.every((t) => t.isLocked === true)).toBe(true);
    expect(phase3.every((t) => t.isLocked === true)).toBe(true);
    expect(phase4.every((t) => t.isLocked === true)).toBe(true);
  });

  it('all Phase 3 tasks include the P3-01 → P3-11 set verbatim', () => {
    const tasks = generateRoadmap({ product_types: ['DAX'] });
    const phase3Ids = tasks.filter((t) => t.phase === 3).map((t) => t.templateRefId);
    for (let i = 1; i <= 11; i += 1) {
      const id = `P3-${i.toString().padStart(2, '0')}`;
      expect(phase3Ids).toContain(id);
    }
  });

  it('P3-01 is_blocker=true (the solicitor blocker)', () => {
    const tasks = generateRoadmap({ product_types: ['DAX'] });
    const p301 = tasks.find((t) => t.templateRefId === 'P3-01');
    expect(p301?.isBlocker).toBe(true);
    expect(p301?.indicatorKey).toBe('capital_licensing.registered_solicitor_engaged');
  });

  it('all tasks default to status="not_started" and isCustom=false', () => {
    const tasks = generateRoadmap({ product_types: ['DAX'] });
    expect(tasks.every((t) => t.status === 'not_started')).toBe(true);
    expect(tasks.every((t) => t.isCustom === false)).toBe(true);
  });

  it('seed tasks all match ALL-product templates (every product type sees them)', () => {
    const tasksDax = generateRoadmap({ product_types: ['DAX'] });
    const tasksPayment = generateRoadmap({ product_types: ['PAYMENT'] });
    expect(tasksDax.length).toBe(tasksPayment.length);
    expect(tasksDax.length).toBe(ALL_SEED_TEMPLATES.length);
  });

  it('product-type-specific templates are filtered when not matching', () => {
    const customTemplates = [
      ...ALL_SEED_TEMPLATES,
      {
        id: 'CUSTOM-DAX-1',
        phase: 1 as const,
        title: 'DAX-only task',
        description: 'For DAX users only',
        regulatory_basis: 'TEST',
        effort_days_min: 1,
        effort_days_max: 1,
        is_blocker: false,
        depends_on: [],
        product_types: ['DAX'],
        display_order: 99,
      },
    ];
    const daxTasks = generateRoadmap({ product_types: ['DAX'] }, customTemplates);
    const paymentTasks = generateRoadmap({ product_types: ['PAYMENT'] }, customTemplates);
    expect(daxTasks.some((t) => t.templateRefId === 'CUSTOM-DAX-1')).toBe(true);
    expect(paymentTasks.some((t) => t.templateRefId === 'CUSTOM-DAX-1')).toBe(false);
  });

  it('output is sorted by phase asc then display_order asc', () => {
    const tasks = generateRoadmap({ product_types: ['DAX'] });
    for (let i = 1; i < tasks.length; i += 1) {
      const prev = tasks[i - 1]!;
      const curr = tasks[i]!;
      expect(prev.phase).toBeLessThanOrEqual(curr.phase);
    }
  });

  it('indicatorKey is populated for tasks that map to indicators', () => {
    const tasks = generateRoadmap({ product_types: ['DAX'] });
    const p101 = tasks.find((t) => t.templateRefId === 'P1-01');
    expect(p101?.indicatorKey).toBe('corporate_structure.cac_registered');
  });

  it('templateId is populated for tasks that map to document templates', () => {
    const tasks = generateRoadmap({ product_types: ['DAX'] });
    const p202 = tasks.find((t) => t.templateRefId === 'P2-02');
    expect(p202?.templateId).toBe('BWRA');
  });
});

describe('templateMatchesProductTypes()', () => {
  it('ALL matches every product type', () => {
    const template = ALL_SEED_TEMPLATES.find((t) => t.id === 'P1-01')!;
    expect(templateMatchesProductTypes(template, ['DAX'])).toBe(true);
    expect(templateMatchesProductTypes(template, ['PAYMENT'])).toBe(true);
    expect(templateMatchesProductTypes(template, [])).toBe(true);
  });

  it('case-insensitive intersection', () => {
    const fakeTemplate = {
      ...ALL_SEED_TEMPLATES[0]!,
      product_types: ['DAX'] as const,
    };
    expect(templateMatchesProductTypes(fakeTemplate, ['dax'])).toBe(true);
    expect(templateMatchesProductTypes(fakeTemplate, ['DAX'])).toBe(true);
    expect(templateMatchesProductTypes(fakeTemplate, ['PAYMENT'])).toBe(false);
  });
});
