// CLAUDE.md §8 — Readiness Score. Weights MUST NOT change without product owner sign-off (§18).

export const DIMENSION_WEIGHTS = {
  corporate_structure: 0.1,
  capital_licensing: 0.2,
  kyc_infrastructure: 0.15,
  aml_cft_programme: 0.2,
  transaction_monitoring: 0.1,
  regulatory_reporting: 0.1,
  regulatory_relationships: 0.1,
  product_classification: 0.05,
} as const;

export const DIMENSION_INDICATORS = {
  corporate_structure: [
    'cac_registered',
    'correct_share_structure',
    'nigerian_ceo_resident',
    'board_composition_compliant',
    'registered_office_address',
  ],
  capital_licensing: [
    // ── Core capital indicators ────────────────────────────────
    'minimum_capital_deposited',
    'capital_source_documented',
    'arip_application_submitted',
    'fidelity_bond_in_place',
    'paid_up_capital_verified',
    // ── ARIP Framework indicators (Section 15–18, June 2024) ──
    'nigerian_incorporation_confirmed',
    'ceo_resident_in_nigeria',
    'office_in_nigeria_established',
    'min_four_sponsored_individuals',
    'md_appointed_and_sponsored',
    'compliance_officer_appointed_and_sponsored',
    'sponsored_individuals_nin_bvn_verified',
    'certificate_of_incorporation_certified',
    'moa_includes_vasp_powers',
    'cac_forms_complete_and_certified',
    'audited_accounts_available',
    'tax_id_obtained',
    'tax_clearance_certificate_obtained',
    'registered_solicitor_engaged',
    'nfiu_registration_evidenced',
    'other_regulator_no_objection_obtained',
    'arip_processing_fee_budgeted',
    'operational_plan_drafted',
    'risk_management_framework_in_plan',
    'exit_plan_included_in_operational_plan',
    'customer_communication_strategy_defined',
    'customer_risk_disclosure_plan_in_place',
    'investor_protection_measures_documented',
    'data_protection_measures_documented',
    'promotional_restrictions_team_briefed',
    'customer_growth_baseline_recorded',
    'weekly_reporting_system_ready',
    'monthly_reporting_system_ready',
    'quarterly_reporting_system_ready',
    'incident_reporting_process_defined',
    'fidelity_bond_covers_25pct_shareholder_fund',
  ],
  kyc_infrastructure: [
    'nin_verification_integrated',
    'bvn_verification_integrated',
    'tiered_kyc_documented',
    'edd_procedures_defined',
    'pep_screening_configured',
  ],
  aml_cft_programme: [
    'bwra_documented',
    'aml_policy_in_place',
    'nfiu_goaml_registered',
    'mlro_appointed',
    'mlro_qualified',
  ],
  transaction_monitoring: [
    'tm_system_configured',
    'alert_thresholds_set',
    'daily_alert_review_active',
    'str_filing_workflow_tested',
    'ctr_filing_workflow_tested',
  ],
  regulatory_reporting: [
    'goaml_portal_registered',
    'pep_register_maintained',
    'quarterly_training_delivered',
    'annual_bwra_reviewed',
    'record_retention_configured',
  ],
  regulatory_relationships: [
    'sec_contact_logged',
    'cbn_contact_logged',
    'nfiu_contact_logged',
    'pre_screening_conducted',
    'communications_documented',
  ],
  product_classification: [
    'product_classified',
    'legal_opinion_obtained',
    'white_paper_drafted',
    'regulator_notified',
  ],
} as const;

export type DimensionKey = keyof typeof DIMENSION_WEIGHTS;
export type IndicatorKey<D extends DimensionKey> = (typeof DIMENSION_INDICATORS)[D][number];

export type DimensionScores = Record<DimensionKey, number>;

const DIMENSION_KEYS = Object.keys(DIMENSION_WEIGHTS) as DimensionKey[];

/**
 * Weighted total readiness score [0..100].
 * Each dimension input must already be on the 0..100 scale.
 */
export function calculateReadinessScore(dimensions: DimensionScores): number {
  let total = 0;
  for (const key of DIMENSION_KEYS) {
    total += dimensions[key] * DIMENSION_WEIGHTS[key];
  }
  return Math.round(total);
}

/**
 * Compute a single dimension's score (0..100) from a flag map of indicator → boolean.
 */
export function calculateDimensionScore<D extends DimensionKey>(
  dimension: D,
  indicators: Partial<Record<IndicatorKey<D>, boolean>>,
): number {
  const list = DIMENSION_INDICATORS[dimension];
  let satisfied = 0;
  for (const key of list) {
    if (indicators[key as IndicatorKey<D>]) satisfied += 1;
  }
  return Math.round((satisfied / list.length) * 100);
}
