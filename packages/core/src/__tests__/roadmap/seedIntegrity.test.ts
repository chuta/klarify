// =============================================================================
// Seed integrity — every `linked_indicator_key` on a SeedTaskTemplate must
// reference a real indicator listed in DIMENSION_INDICATORS (CLAUDE.md §8).
// Catches typos before they leak into production.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { ALL_SEED_TEMPLATES } from '../../roadmap/seedTaskTemplates.js';
import {
  DIMENSION_INDICATORS,
  DIMENSION_WEIGHTS,
  type DimensionKey,
} from '../../compliance/readinessScore.js';

describe('SeedTaskTemplate integrity', () => {
  it('every linked_indicator_key references a real indicator', () => {
    const validDims = Object.keys(DIMENSION_WEIGHTS) as DimensionKey[];
    for (const t of ALL_SEED_TEMPLATES) {
      if (!t.linked_indicator_key) continue;
      const dotIdx = t.linked_indicator_key.indexOf('.');
      expect(dotIdx, `Task ${t.id} indicator_key must be "<dim>.<ind>"`).toBeGreaterThan(-1);
      const dim = t.linked_indicator_key.slice(0, dotIdx) as DimensionKey;
      const ind = t.linked_indicator_key.slice(dotIdx + 1);
      expect(validDims, `Task ${t.id} references unknown dimension "${dim}"`).toContain(dim);
      const indicators = DIMENSION_INDICATORS[dim] as readonly string[];
      expect(
        indicators,
        `Task ${t.id} references unknown indicator "${ind}" in dim "${dim}"`,
      ).toContain(ind);
    }
  });

  it('every linked_dimension matches the dimension implicit in linked_indicator_key', () => {
    for (const t of ALL_SEED_TEMPLATES) {
      if (!t.linked_indicator_key || !t.linked_dimension) continue;
      const dim = t.linked_indicator_key.split('.')[0];
      expect(t.linked_dimension).toBe(dim);
    }
  });

  it('all IDs are unique', () => {
    const ids = ALL_SEED_TEMPLATES.map((t) => t.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it('every depends_on entry points to a real template ID', () => {
    const known = new Set(ALL_SEED_TEMPLATES.map((t) => t.id));
    for (const t of ALL_SEED_TEMPLATES) {
      for (const dep of t.depends_on) {
        expect(known.has(dep), `Task ${t.id} depends on unknown "${dep}"`).toBe(true);
      }
    }
  });

  it('every template references a recognised document template_id (when set)', () => {
    const docTemplateIds = new Set([
      'BWRA', 'AML_POLICY', 'KYC_TIERS', 'TOKEN_MEMO', 'ARIP_WHITEPAPER',
      'STR_TEMPLATE', 'PEP_REGISTER', 'CO_APPOINTMENT', 'REG_BRIEF',
      // Sprint 5 ARIP templates referenced by P3-05/06/08:
      'ARIP_OPERATIONAL_PLAN', 'ARIP_SWORN_UNDERTAKING', 'ARIP_ENTITY_RULES',
    ]);
    for (const t of ALL_SEED_TEMPLATES) {
      if (!t.template_id) continue;
      expect(docTemplateIds.has(t.template_id), `${t.id} → unknown template ${t.template_id}`).toBe(true);
    }
  });

  it('phase counts match expected Sprint 4 layout', () => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const t of ALL_SEED_TEMPLATES) counts[t.phase] = (counts[t.phase] ?? 0) + 1;
    // Sanity ranges — see seedTaskTemplates.ts.
    expect(counts[1]).toBeGreaterThanOrEqual(7);
    expect(counts[2]).toBeGreaterThanOrEqual(7);
    expect(counts[3]).toBe(11); // PRD US-007 verbatim
    expect(counts[4]).toBeGreaterThanOrEqual(4);
  });
});
