import { z } from 'zod';
import { SCENARIO_TEMPLATE_IDS } from '../scenarios/templates.js';
import type { ScenarioResult } from '../types/scenario.js';
import { SCENARIO_DISCLAIMER } from '../types/scenario.js';

const CitationSchema = z.object({
  regulation: z.string().min(1),
  section: z.string().min(1),
  url: z.string().url().optional(),
});

const ScenarioOutcomeLabelSchema = z.enum(['best_case', 'likely_case', 'worst_case']);

const ScenarioProbabilitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const ScenarioOutcomeSchema = z.object({
  label: ScenarioOutcomeLabelSchema,
  probability: ScenarioProbabilitySchema,
  summary: z.string().min(1),
  regulatory_basis: z.string().min(1),
  business_impact: z.string().min(1),
  recommended_mitigation: z.string().min(1),
  citations: z.array(CitationSchema).min(1),
});

export const ScenarioResultSchema = z.object({
  scenario_summary: z.string().min(1),
  outcomes: z.object({
    best_case: ScenarioOutcomeSchema,
    likely_case: ScenarioOutcomeSchema,
    worst_case: ScenarioOutcomeSchema,
  }),
  key_assumptions: z.array(z.string().min(1)).min(1),
  citations: z.array(CitationSchema).min(1),
  disclaimer: z.string().min(1),
});

export const ScenarioRequestSchema = z.object({
  scenario: z
    .string()
    .trim()
    .min(30, 'Describe your scenario in at least 30 characters.')
    .max(2000, 'Scenarios are capped at 2,000 characters.'),
  templateId: z
    .enum(SCENARIO_TEMPLATE_IDS as [string, ...string[]])
    .optional(),
  parentAnalysisId: z.string().uuid().optional(),
});

export type ScenarioRequest = z.infer<typeof ScenarioRequestSchema>;

export function parseScenarioResult(raw: unknown): ScenarioResult {
  const parsed = ScenarioResultSchema.parse(raw);
  if (!parsed.disclaimer.includes('not legal advice')) {
    throw new Error('Scenario result missing mandatory legal disclaimer.');
  }
  return parsed;
}

/** Normalise model output — inject disclaimer if the model omitted it. */
export function coerceScenarioResult(raw: unknown): ScenarioResult {
  const obj =
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  if (typeof obj.disclaimer !== 'string' || obj.disclaimer.length === 0) {
    return ScenarioResultSchema.parse({ ...obj, disclaimer: SCENARIO_DISCLAIMER });
  }
  return parseScenarioResult(raw);
}
