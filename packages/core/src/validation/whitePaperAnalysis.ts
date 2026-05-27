import { z } from 'zod';
import type {
  WhitePaperAnalysisResult,
  WhitePaperCitation,
  WhitePaperSectionAssessment,
  WhitePaperSectionId,
  WhitePaperSectionStatus,
} from '../types/whitePaperAnalysis.js';
import {
  WHITE_PAPER_DISCLAIMER,
  WHITE_PAPER_LICENCE_CATEGORIES,
  WHITE_PAPER_SECTION_IDS,
  WHITE_PAPER_SECTION_NAMES,
  WHITE_PAPER_SOURCE_JURISDICTIONS,
} from '../types/whitePaperAnalysis.js';

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeCitationUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim().length === 0) return undefined;
  return isValidUrl(value) ? value : undefined;
}

function normalizeCitations(raw: unknown): WhitePaperCitation[] {
  if (!Array.isArray(raw)) return [];
  const out: WhitePaperCitation[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const rec = item as Record<string, unknown>;
    const regulation = typeof rec.regulation === 'string' ? rec.regulation.trim() : '';
    const section = typeof rec.section === 'string' ? rec.section.trim() : '';
    if (!regulation || !section) continue;
    const url = normalizeCitationUrl(rec.url);
    out.push(url ? { regulation, section, url } : { regulation, section });
  }
  return out;
}

function normalizeSectionStatus(value: unknown): WhitePaperSectionStatus {
  if (value === 'adequate' || value === 'partial' || value === 'missing' || value === 'not_applicable') {
    return value;
  }
  return 'partial';
}

function normalizeSectionId(value: unknown): WhitePaperSectionId | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return (WHITE_PAPER_SECTION_IDS as readonly string[]).includes(normalized)
    ? (normalized as WhitePaperSectionId)
    : null;
}

function normalizeSectionAssessments(raw: unknown): WhitePaperSectionAssessment[] {
  const byId = new Map<WhitePaperSectionId, WhitePaperSectionAssessment>();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== 'object' || item === null) continue;
      const rec = item as Record<string, unknown>;
      const sectionId = normalizeSectionId(rec.section_id);
      if (!sectionId || byId.has(sectionId)) continue;
      byId.set(sectionId, {
        section_id: sectionId,
        section_name:
          typeof rec.section_name === 'string' && rec.section_name.trim().length > 0
            ? rec.section_name.trim()
            : WHITE_PAPER_SECTION_NAMES[sectionId],
        status: normalizeSectionStatus(rec.status),
        found_in_upload: Boolean(rec.found_in_upload),
        gap_summary: typeof rec.gap_summary === 'string' ? rec.gap_summary : '',
        remediation: typeof rec.remediation === 'string' ? rec.remediation : '',
        citations: normalizeCitations(rec.citations),
      });
    }
  }
  return WHITE_PAPER_SECTION_IDS.map((sectionId) => {
    const existing = byId.get(sectionId);
    if (existing) return existing;
    return {
      section_id: sectionId,
      section_name: WHITE_PAPER_SECTION_NAMES[sectionId],
      status: 'missing',
      found_in_upload: false,
      gap_summary: 'This section was not present in the model output.',
      remediation: 'Review this section against SEC Nigeria ARIP white paper requirements.',
      citations: [],
    };
  });
}

function normalizeOutlineSections(raw: unknown): WhitePaperAnalysisResult['draft_outline']['sections'] {
  const sections: WhitePaperAnalysisResult['draft_outline']['sections'] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item !== 'object' || item === null) continue;
      const rec = item as Record<string, unknown>;
      const title = typeof rec.title === 'string' && rec.title.trim().length > 0 ? rec.title.trim() : null;
      if (!title) continue;
      const number =
        typeof rec.number === 'number' && Number.isInteger(rec.number)
          ? rec.number
          : sections.length + 1;
      sections.push({
        number: Math.min(14, Math.max(1, number)),
        title,
        guidance:
          typeof rec.guidance === 'string' && rec.guidance.trim().length > 0
            ? rec.guidance.trim()
            : 'Complete this section per SEC Nigeria ARIP requirements.',
        suggested_content: typeof rec.suggested_content === 'string' ? rec.suggested_content : '',
        regulatory_basis: typeof rec.regulatory_basis === 'string' ? rec.regulatory_basis : '',
      });
    }
  }
  while (sections.length < 14) {
    const index = sections.length;
    const sectionId = WHITE_PAPER_SECTION_IDS[index]!;
    sections.push({
      number: index + 1,
      title: WHITE_PAPER_SECTION_NAMES[sectionId],
      guidance: 'Complete this section per SEC Nigeria ARIP requirements.',
      suggested_content: '',
      regulatory_basis: 'ARIP Framework (June 2024)',
    });
  }
  return sections.slice(0, 14);
}

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

  const sectionAssessments = normalizeSectionAssessments(obj.section_assessments);
  const adequateCount = sectionAssessments.filter((s) => s.status === 'adequate').length;
  const applicableCount = sectionAssessments.filter((s) => s.status !== 'not_applicable').length;
  const computedCompleteness =
    applicableCount > 0 ? Math.round((adequateCount / applicableCount) * 100) : 0;

  const licenceCategory =
    typeof obj.licence_category_sought === 'string' &&
    (WHITE_PAPER_LICENCE_CATEGORIES as readonly string[]).includes(obj.licence_category_sought)
      ? obj.licence_category_sought
      : 'HYBRID';

  const generatorPrefillRaw =
    typeof obj.generator_prefill === 'object' && obj.generator_prefill !== null
      ? (obj.generator_prefill as Record<string, unknown>)
      : {};

  const criticalGapsRaw = Array.isArray(obj.critical_gaps) ? obj.critical_gaps : [];
  const criticalGaps = criticalGapsRaw
    .map((gap, index) => {
      if (typeof gap !== 'object' || gap === null) return null;
      const rec = gap as Record<string, unknown>;
      const sectionId = normalizeSectionId(rec.section_id);
      const title = typeof rec.title === 'string' ? rec.title.trim() : '';
      const gapDescription = typeof rec.gap_description === 'string' ? rec.gap_description.trim() : '';
      const remediation = typeof rec.remediation === 'string' ? rec.remediation.trim() : '';
      if (!sectionId || !title || !gapDescription || !remediation) return null;
      return {
        rank: typeof rec.rank === 'number' ? rec.rank : index + 1,
        section_id: sectionId,
        title,
        gap_description: gapDescription,
        remediation,
        citations: normalizeCitations(rec.citations),
      };
    })
    .filter((gap): gap is NonNullable<typeof gap> => gap !== null)
    .slice(0, 5)
    .map((gap, index) => ({ ...gap, rank: index + 1 }));

  const notesRaw =
    typeof obj.source_jurisdiction_notes === 'object' && obj.source_jurisdiction_notes !== null
      ? (obj.source_jurisdiction_notes as Record<string, unknown>)
      : {};

  const tokenFlagsRaw = Array.isArray(obj.token_classification_flags)
    ? obj.token_classification_flags
    : [];
  const tokenFlags = tokenFlagsRaw
    .map((flag) => {
      if (typeof flag !== 'object' || flag === null) return null;
      const rec = flag as Record<string, unknown>;
      const message = typeof rec.message === 'string' ? rec.message.trim() : '';
      if (!message) return null;
      const severity =
        rec.severity === 'info' || rec.severity === 'amber' || rec.severity === 'critical'
          ? rec.severity
          : 'info';
      return {
        severity,
        message,
        citations: normalizeCitations(rec.citations),
      };
    })
    .filter((flag): flag is NonNullable<typeof flag> => flag !== null);

  const draftOutlineRaw =
    typeof obj.draft_outline === 'object' && obj.draft_outline !== null
      ? (obj.draft_outline as Record<string, unknown>)
      : {};

  const withDefaults: Record<string, unknown> = {
    ...obj,
    disclaimer:
      typeof obj.disclaimer === 'string' && obj.disclaimer.length > 0
        ? obj.disclaimer
        : WHITE_PAPER_DISCLAIMER,
    analysed_at:
      typeof obj.analysed_at === 'string' && obj.analysed_at.length >= 10
        ? obj.analysed_at
        : new Date().toISOString(),
    sections_total: 14,
    sections_adequate_count:
      typeof obj.sections_adequate_count === 'number'
        ? Math.min(14, Math.max(0, Math.round(obj.sections_adequate_count)))
        : adequateCount,
    completeness_pct:
      typeof obj.completeness_pct === 'number'
        ? Math.min(100, Math.max(0, Math.round(obj.completeness_pct)))
        : computedCompleteness,
    executive_summary:
      typeof obj.executive_summary === 'string' && obj.executive_summary.trim().length > 0
        ? obj.executive_summary.trim()
        : 'White paper gap analysis completed. Review section assessments for details.',
    section_assessments: sectionAssessments,
    critical_gaps: criticalGaps,
    source_jurisdiction_notes: {
      retainable_content: Array.isArray(notesRaw.retainable_content)
        ? notesRaw.retainable_content.filter((v): v is string => typeof v === 'string')
        : [],
      must_rewrite: Array.isArray(notesRaw.must_rewrite)
        ? notesRaw.must_rewrite.filter((v): v is string => typeof v === 'string')
        : [],
      comparative_notes:
        typeof notesRaw.comparative_notes === 'string' ? notesRaw.comparative_notes : '',
    },
    token_classification_flags: tokenFlags,
    draft_outline: {
      sections: normalizeOutlineSections(draftOutlineRaw.sections),
    },
    generator_prefill: {
      ...generatorPrefillRaw,
      licence_category:
        typeof generatorPrefillRaw.licence_category === 'string' &&
        generatorPrefillRaw.licence_category.trim().length > 0
          ? generatorPrefillRaw.licence_category.trim()
          : licenceCategory,
    },
    licence_category_sought: licenceCategory,
    existing_source_licence:
      typeof obj.existing_source_licence === 'string' ? obj.existing_source_licence : null,
    low_structure_confidence: Boolean(obj.low_structure_confidence),
  };

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
