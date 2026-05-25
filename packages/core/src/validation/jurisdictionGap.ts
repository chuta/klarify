import { z } from 'zod';
import type { JurisdictionGapResult } from '../types/jurisdictionGap.js';
import {
  JURISDICTION_GAP_DIMENSIONS,
  JURISDICTION_GAP_DISCLAIMER,
} from '../types/jurisdictionGap.js';

export const JurisdictionCodeSchema = z.enum(['NG', 'GH', 'KE', 'MU', 'ZA']);

const CitationSchema = z.object({
  regulation: z.string().min(1),
  section: z.string().min(1),
  url: z.string().url().optional(),
});

export const JurisdictionGapRowSchema = z
  .object({
    dimension: z.enum(JURISDICTION_GAP_DIMENSIONS),
    jurisdiction: JurisdictionCodeSchema,
    status: z.enum(['green', 'amber', 'red']),
    current_state: z.string().min(1),
    target_requirement: z.string().min(1),
    gap_summary: z.string().min(1),
    how_to_close: z.string(),
    citations: z.array(CitationSchema).min(1),
  })
  .superRefine((row, ctx) => {
    if (row.status !== 'green' && row.how_to_close.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'how_to_close is required when status is amber or red.',
        path: ['how_to_close'],
      });
    }
  });

export const JurisdictionGapResultSchema = z.object({
  source_jurisdiction: JurisdictionCodeSchema,
  target_jurisdictions: z.array(JurisdictionCodeSchema).min(1).max(4),
  generated_at: z.string().min(10),
  dimensions: z.array(JurisdictionGapRowSchema).min(1),
  regulator_contacts: z.array(
    z.object({
      jurisdiction: JurisdictionCodeSchema,
      name: z.string().min(1),
      website: z.string().url(),
      email: z.string().email(),
    }),
  ),
  disclaimer: z.string().min(1),
});

export const JurisdictionGapRequestSchema = z
  .object({
    sourceJurisdiction: JurisdictionCodeSchema.default('NG'),
    targetJurisdictions: z
      .array(JurisdictionCodeSchema)
      .min(1, 'Select at least one target jurisdiction.')
      .max(4, 'You can compare up to four target jurisdictions at once.'),
  })
  .superRefine((val, ctx) => {
    const unique = new Set(val.targetJurisdictions);
    if (unique.size !== val.targetJurisdictions.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duplicate target jurisdictions are not allowed.',
        path: ['targetJurisdictions'],
      });
    }
    const onlySource = val.targetJurisdictions.every((j) => j === val.sourceJurisdiction);
    if (onlySource) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Select at least one target jurisdiction different from the source.',
        path: ['targetJurisdictions'],
      });
    }
  });

export type JurisdictionGapRequest = z.infer<typeof JurisdictionGapRequestSchema>;

export function parseJurisdictionGapResult(raw: unknown): JurisdictionGapResult {
  const parsed = JurisdictionGapResultSchema.parse(raw);
  if (!parsed.disclaimer.includes('not legal advice')) {
    throw new Error('Jurisdiction gap result missing mandatory legal disclaimer.');
  }
  return parsed;
}

export function coerceJurisdictionGapResult(raw: unknown): JurisdictionGapResult {
  const obj =
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const withDefaults: Record<string, unknown> = { ...obj };
  if (typeof withDefaults.disclaimer !== 'string' || withDefaults.disclaimer.length === 0) {
    withDefaults.disclaimer = JURISDICTION_GAP_DISCLAIMER;
  }
  if (typeof withDefaults.generated_at !== 'string' || withDefaults.generated_at.length < 10) {
    withDefaults.generated_at = new Date().toISOString();
  }
  return JurisdictionGapResultSchema.parse(withDefaults);
}
