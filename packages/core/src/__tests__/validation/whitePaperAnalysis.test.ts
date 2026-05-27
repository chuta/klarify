import { describe, expect, it } from 'vitest';
import {
  coerceWhitePaperAnalysisResult,
  enforceExitPlanCriticalGap,
  WhitePaperPasteRequestSchema,
} from '@klarify/core';
import { WHITE_PAPER_SECTION_IDS } from '@klarify/core';

describe('WhitePaperPasteRequestSchema', () => {
  it('rejects text under 1000 characters', () => {
    const result = WhitePaperPasteRequestSchema.safeParse({
      text: 'short',
      sourceJurisdiction: 'GH',
      licenceCategorySought: 'DAX',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid paste payload', () => {
    const result = WhitePaperPasteRequestSchema.safeParse({
      text: 'x'.repeat(1000),
      sourceJurisdiction: 'GH',
      licenceCategorySought: 'DAX',
    });
    expect(result.success).toBe(true);
  });
});

describe('enforceExitPlanCriticalGap', () => {
  it('adds exit_plan to critical_gaps when section is missing', () => {
    const base = coerceWhitePaperAnalysisResult({
      sections_adequate_count: 2,
      sections_total: 14,
      completeness_pct: 14,
      executive_summary: 'Test',
      critical_gaps: [],
      section_assessments: WHITE_PAPER_SECTION_IDS.map((id) => ({
        section_id: id,
        section_name: id,
        status: id === 'exit_plan' ? 'missing' : 'partial',
        found_in_upload: false,
        gap_summary: id === 'exit_plan' ? 'No exit plan' : '',
        remediation: id === 'exit_plan' ? 'Add exit plan' : '',
        citations: [],
      })),
      source_jurisdiction_notes: {
        retainable_content: [],
        must_rewrite: [],
        comparative_notes: '',
      },
      token_classification_flags: [],
      draft_outline: {
        sections: WHITE_PAPER_SECTION_IDS.map((id, i) => ({
          number: i + 1,
          title: id,
          guidance: 'guidance',
          suggested_content: '',
          regulatory_basis: '',
        })),
      },
      generator_prefill: { licence_category: 'DAX' },
      low_structure_confidence: false,
      source_jurisdiction: 'GH',
      licence_category_sought: 'DAX',
      existing_source_licence: null,
    });

    const enforced = enforceExitPlanCriticalGap(base);
    expect(enforced.critical_gaps.some((g) => g.section_id === 'exit_plan')).toBe(true);
  });
});
