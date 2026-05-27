import { z } from 'zod';
import type { WhitePaperAnalysisResult } from '../types/whitePaperAnalysis.js';
import {
  WHITE_PAPER_DISCLAIMER,
  WHITE_PAPER_LICENCE_CATEGORIES,
  WHITE_PAPER_SECTION_IDS,
  WHITE_PAPER_SOURCE_JURISDICTIONS,
} from '../types/whitePaperAnalysis.js';

const CitationSchema = z.object({
  regulation: z.string().min(1),
  section: z.string().min(1),
  url: z.string().url().optional(),
});

export const WhitePaperUploadMetadataSchema = z.object({
  sourceJurisdiction: z.enum(WHITE_PAPER_SOURCE_JURISDICTIONS),
  licenceCategorySought: z.enum(WHITE_PAPER_LICENCE_CATEGORIES),
  existingSourceLicence: z.string().max(500).optional(),
});

export const WhitePaperPasteRequestSchema = WhitePaperUploadMetadataSchema.extend({
  text: z.string().min(1000, 'Please paste at least 1,000 characters of the white paper.'),
});

export type WhitePaperUploadMetadata = z.infer<typeof WhitePaperUploadMetadataSchema>;

export const WhitePaperAnalysisResultSchema = z.object({
  analysed_at: z.string().min(10),
  source_jurisdiction: z.enum(WHITE_PAPER_SOURCE_JURISDICTIONS),
  licence_category_sought: z.enum(WHITE_PAPER_LICENCE_CATEGORIES),
  existing_source_licence: z.string().nullable(),
  sections_adequate_count: z.number().int().min(0).max(14),
  sections_total: z.literal(14),
  completeness_pct: z.number().int().min(0).max(100),
  executive_summary: z.string().min(1),
  critical_gaps: z
    .array(
      z.object({
        rank: z.number().int().min(1).max(5),
        section_id: z.enum(WHITE_PAPER_SECTION_IDS),
        title: z.string().min(1),
        gap_description: z.string().min(1),
        remediation: z.string().min(1),
        citations: z.array(CitationSchema),
      }),
    )
    .max(5),
  section_assessments: z
    .array(
      z.object({
        section_id: z.enum(WHITE_PAPER_SECTION_IDS),
        section_name: z.string().min(1),
        status: z.enum(['adequate', 'partial', 'missing', 'not_applicable']),
        found_in_upload: z.boolean(),
        gap_summary: z.string(),
        remediation: z.string(),
        citations: z.array(CitationSchema),
      }),
    )
    .length(14),
  source_jurisdiction_notes: z.object({
    retainable_content: z.array(z.string()),
    must_rewrite: z.array(z.string()),
    comparative_notes: z.string(),
  }),
  token_classification_flags: z.array(
    z.object({
      severity: z.enum(['info', 'amber', 'critical']),
      message: z.string().min(1),
      citations: z.array(CitationSchema),
    }),
  ),
  draft_outline: z.object({
    sections: z
      .array(
        z.object({
          number: z.number().int().min(1).max(14),
          title: z.string().min(1),
          guidance: z.string().min(1),
          suggested_content: z.string(),
          regulatory_basis: z.string(),
        }),
      )
      .min(14),
  }),
  generator_prefill: z.object({
    product_name: z.string().optional(),
    licence_category: z.string().min(1),
    product_summary: z.string().optional(),
    token_or_asset_details: z.string().optional(),
    target_users: z.string().optional(),
    technology_stack: z.string().optional(),
    investor_protection_measures: z.string().optional(),
    capital_position: z.string().optional(),
  }),
  low_structure_confidence: z.boolean(),
  disclaimer: z.string().min(1),
});

export function parseWhitePaperAnalysisResult(raw: unknown): WhitePaperAnalysisResult {
  const parsed = WhitePaperAnalysisResultSchema.parse(raw);
  if (!parsed.disclaimer.includes('not legal advice')) {
    throw new Error('White paper analysis result missing mandatory legal disclaimer.');
  }
  return parsed;
}

export function coerceWhitePaperAnalysisResult(raw: unknown): WhitePaperAnalysisResult {
  const obj =
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const withDefaults: Record<string, unknown> = { ...obj };
  if (typeof withDefaults.disclaimer !== 'string' || withDefaults.disclaimer.length === 0) {
    withDefaults.disclaimer = WHITE_PAPER_DISCLAIMER;
  }
  if (typeof withDefaults.analysed_at !== 'string' || withDefaults.analysed_at.length < 10) {
    withDefaults.analysed_at = new Date().toISOString();
  }
  if (withDefaults.sections_total !== 14) {
    withDefaults.sections_total = 14;
  }
  return WhitePaperAnalysisResultSchema.parse(withDefaults);
}

/** Ensure missing exit_plan always appears in critical_gaps (spec §8). */
export function enforceExitPlanCriticalGap(result: WhitePaperAnalysisResult): WhitePaperAnalysisResult {
  const exitSection = result.section_assessments.find((s) => s.section_id === 'exit_plan');
  const hasExitGap = result.critical_gaps.some((g) => g.section_id === 'exit_plan');
  if (!exitSection || exitSection.status === 'adequate' || hasExitGap) {
    return result;
  }
  const gap: WhitePaperAnalysisResult['critical_gaps'][number] = {
    rank: 1,
    section_id: 'exit_plan',
    title: 'Exit Plan (Section 36 — mandatory)',
    gap_description:
      exitSection.gap_summary ||
      'The uploaded white paper does not include a mandatory exit plan describing how customer obligations will be fulfilled if full registration is not granted.',
    remediation:
      exitSection.remediation ||
      'Add a detailed exit plan covering asset return, customer notification, and data handling per ARIP Framework Section 36.',
    citations: exitSection.citations.length > 0 ? exitSection.citations : [{ regulation: 'ARIP Framework', section: 'Section 36' }],
  };
  const others = result.critical_gaps.filter((g) => g.section_id !== 'exit_plan').slice(0, 4);
  return {
    ...result,
    critical_gaps: [gap, ...others].map((g, i) => ({ ...g, rank: i + 1 })),
  };
}
