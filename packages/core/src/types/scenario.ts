// US-005 — Scenario Simulator result types (Sprint 6).

import type { Citation } from './api.js';

/** Mandatory disclaimer — CLAUDE.md §16 Rule 1. Must appear in every AI output. */
export const SCENARIO_DISCLAIMER =
  'This is regulatory information, not legal advice. For advice specific to your situation, consult a qualified practitioner.';

export type ScenarioOutcomeLabel = 'best_case' | 'likely_case' | 'worst_case';

export type ScenarioProbability = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ScenarioOutcome {
  readonly label: ScenarioOutcomeLabel;
  readonly probability: ScenarioProbability;
  readonly summary: string;
  readonly regulatory_basis: string;
  readonly business_impact: string;
  readonly recommended_mitigation: string;
  readonly citations: readonly Citation[];
}

export interface ScenarioResult {
  readonly scenario_summary: string;
  readonly outcomes: {
    readonly best_case: ScenarioOutcome;
    readonly likely_case: ScenarioOutcome;
    readonly worst_case: ScenarioOutcome;
  };
  readonly key_assumptions: readonly string[];
  readonly citations: readonly Citation[];
  readonly disclaimer: string;
}

export interface ScenarioAnalysisRecord {
  readonly id: string;
  readonly scenarioText: string;
  readonly templateId: string | null;
  readonly parentId: string | null;
  readonly result: ScenarioResult;
  readonly createdAt: string;
}
