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

describe('coerceWhitePaperAnalysisResult', () => {
  it('pads missing section_assessments to 14 canonical sections', () => {
    const result = coerceWhitePaperAnalysisResult({
      executive_summary: 'Summary',
      section_assessments: [
        {
          section_id: 'exit_plan',
          section_name: 'Exit Plan',
          status: 'missing',
          found_in_upload: false,
          gap_summary: 'Missing',
          remediation: 'Add exit plan',
          citations: [],
        },
      ],
      critical_gaps: [],
      source_jurisdiction_notes: {
        retainable_content: [],
        must_rewrite: [],
        comparative_notes: '',
      },
      token_classification_flags: [],
      draft_outline: { sections: [] },
      generator_prefill: { licence_category: 'DAX' },
      low_structure_confidence: false,
      source_jurisdiction: 'GH',
      licence_category_sought: 'DAX',
      existing_source_licence: null,
    });
    expect(result.section_assessments).toHaveLength(14);
    expect(result.draft_outline.sections.length).toBeGreaterThanOrEqual(14);
  });

  it('strips invalid citation URLs instead of failing validation', () => {
    const result = coerceWhitePaperAnalysisResult({
      executive_summary: 'Summary',
      section_assessments: WHITE_PAPER_SECTION_IDS.map((id) => ({
        section_id: id,
        section_name: id,
        status: 'partial',
        found_in_upload: false,
        gap_summary: '',
        remediation: '',
        citations: [{ regulation: 'ISA 2025', section: 'S.357', url: 'not-a-url' }],
      })),
      critical_gaps: [
        {
          rank: 1,
          section_id: 'exit_plan',
          title: 'Exit plan missing',
          gap_description: 'No exit plan found',
          remediation: 'Add exit plan',
          citations: [{ regulation: 'ARIP Framework', section: '36', url: '' }],
        },
      ],
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
    expect(result.section_assessments[0]?.citations[0]?.url).toBeUndefined();
    expect(result.critical_gaps[0]?.citations[0]?.url).toBeUndefined();
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
