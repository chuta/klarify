// US-004 — Jurisdiction Expansion Adviser result types (Sprint 6).

import type { Citation } from './api.js';
import type { TargetMarket } from './domain.js';

/** Jurisdiction codes supported by the gap analysis engine (PRD US-004 MVP). */
export type JurisdictionCode = TargetMarket;

/** Mandatory disclaimer — CLAUDE.md §16 Rule 1. */
export const JURISDICTION_GAP_DISCLAIMER =
  'This is regulatory information, not legal advice. For advice specific to your situation, consult a qualified practitioner.';

export const JURISDICTION_GAP_DIMENSIONS = [
  'corporate_structure',
  'licensing',
  'capital_requirements',
  'aml_cft_programme',
  'kyc_standards',
  'reporting_obligations',
  'regulatory_contacts',
] as const;

export type JurisdictionGapDimension = (typeof JURISDICTION_GAP_DIMENSIONS)[number];

export type JurisdictionGapStatus = 'green' | 'amber' | 'red';

export interface JurisdictionGapRow {
  readonly dimension: JurisdictionGapDimension;
  /** Target jurisdiction this row compares against the source posture. */
  readonly jurisdiction: JurisdictionCode;
  readonly status: JurisdictionGapStatus;
  readonly current_state: string;
  readonly target_requirement: string;
  readonly gap_summary: string;
  readonly how_to_close: string;
  readonly citations: readonly Citation[];
}

export interface JurisdictionRegulatorContact {
  readonly jurisdiction: JurisdictionCode;
  readonly name: string;
  readonly website: string;
  readonly email: string;
}

export interface JurisdictionGapResult {
  readonly source_jurisdiction: JurisdictionCode;
  readonly target_jurisdictions: readonly JurisdictionCode[];
  readonly generated_at: string;
  readonly dimensions: readonly JurisdictionGapRow[];
  readonly regulator_contacts: readonly JurisdictionRegulatorContact[];
  readonly disclaimer: string;
}

export interface JurisdictionGapAnalysisRecord {
  readonly id: string;
  readonly sourceJurisdiction: JurisdictionCode;
  readonly targetJurisdictions: readonly JurisdictionCode[];
  readonly result: JurisdictionGapResult;
  readonly createdAt: string;
}
