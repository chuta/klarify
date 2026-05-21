// =============================================================================
// Klarify Sprint 4 — Roadmap Task Templates (canonical seed library)
//
// This is the structured, regulation-cited seed source that powers the
// `roadmap_task_templates` master table in Postgres (009 migration).
// `generateRoadmap()` reads templates from this list, filters by the user's
// product types, and creates a row per matching template in `roadmap_tasks`.
//
// REGULATORY BASIS — never paraphrase the citations below. They are taken
// verbatim from:
//   * CLAUDE.md §11–14 (the corpus + document templates table)
//   * Klarify_PRD_v1.1.md US-007 Phase 3 Task Library (P3-01 → P3-11)
//   * ARIP Framework (SEC Nigeria, June 2024) — for Phase 3 / Phase 4
//
// CLAUDE.md §16 Rule 2: regulatory content lives in the DB (this file
// is the source of seed data — UI components must NEVER hardcode strings
// from here).
// =============================================================================

import type { DimensionKey } from '../compliance/readinessScore.js';

/** A single template row that becomes one row in `roadmap_task_templates`. */
export interface SeedTaskTemplate {
  /** Stable string key, e.g. "P1-01". Used as the row primary key. */
  readonly id: string;
  readonly phase: 1 | 2 | 3 | 4;
  readonly title: string;
  readonly description: string;
  readonly regulatory_basis: string;
  readonly effort_days_min: number;
  readonly effort_days_max: number;
  /** Compliance document template ID (CLAUDE.md §14). Drives the
   *  "Generate document" CTA on the task detail drawer. */
  readonly template_id?: string;
  readonly is_blocker: boolean;
  readonly depends_on: readonly string[];
  /** ['ALL'] = applies to every product type. Otherwise specific codes. */
  readonly product_types: readonly string[];
  /** "<dimension>.<indicator>" — one-way task→indicator sync. */
  readonly linked_indicator_key?: string;
  readonly linked_dimension?: DimensionKey;
  /** Stable display ordering inside the phase (smaller = earlier). */
  readonly display_order: number;
}

// -----------------------------------------------------------------------------
// PHASE 1 — Foundation (Corporate Structure)
// -----------------------------------------------------------------------------
const PHASE_1: SeedTaskTemplate[] = [
  {
    id: 'P1-01',
    phase: 1,
    title: 'Register with the Corporate Affairs Commission (CAC)',
    description:
      'Incorporate your company with the CAC as a limited liability company (Ltd) or public limited company (Plc). Ensure your MEMART includes digital asset activities in the objects clause. Obtain your CAC certificate and certified true copies of all incorporation documents.',
    regulatory_basis: 'Companies and Allied Matters Act 2020 (CAMA), Sections 18–40',
    effort_days_min: 5,
    effort_days_max: 14,
    is_blocker: true,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'corporate_structure.cac_registered',
    linked_dimension: 'corporate_structure',
    display_order: 1,
  },
  {
    id: 'P1-02',
    phase: 1,
    title: 'Establish correct share structure and beneficial ownership register',
    description:
      'Structure share capital to meet SEC Nigeria minimum thresholds for your licence type. Prepare a register of members and beneficial owners. File the initial return of allotment with the CAC.',
    regulatory_basis: 'CAMA 2020, Section 119; ISA 2025, Section 357',
    effort_days_min: 3,
    effort_days_max: 7,
    is_blocker: false,
    depends_on: ['P1-01'],
    product_types: ['ALL'],
    linked_indicator_key: 'corporate_structure.correct_share_structure',
    linked_dimension: 'corporate_structure',
    display_order: 2,
  },
  {
    id: 'P1-03',
    phase: 1,
    title: 'Confirm Nigerian CEO / MD is resident in Nigeria',
    description:
      'The SEC Digital Asset Rules 2025 and Section 6(i) of the ARIP Framework require that the Chief Executive Officer or Managing Director of a VASP is resident in Nigeria. Confirm residency status and document the evidence (immigration record, utility bills, lease).',
    regulatory_basis: 'ARIP Framework Section 6(i), June 2024; SEC Digital Asset Rules 2025, Rule 3(2)(b)',
    effort_days_min: 1,
    effort_days_max: 1,
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'corporate_structure.nigerian_ceo_resident',
    linked_dimension: 'corporate_structure',
    display_order: 3,
  },
  {
    id: 'P1-04',
    phase: 1,
    title: 'Open a corporate bank account with a deposit money bank',
    description:
      'Open a Nigerian corporate bank account at a CBN-licensed deposit money bank. Required for capital deposit, payroll, ARIP fee payment, and ongoing operations. Some banks remain cautious about VASP customers — start engagement early.',
    regulatory_basis: 'CBN VASP Guidelines 2023',
    effort_days_min: 7,
    effort_days_max: 21,
    is_blocker: false,
    depends_on: ['P1-01'],
    product_types: ['ALL'],
    display_order: 4,
  },
  {
    id: 'P1-05',
    phase: 1,
    title: 'Obtain Tax Identification Number (TIN) from FIRS',
    description:
      'Obtain the company Tax Identification Number from the Federal Inland Revenue Service. The TIN is required for the ARIP application and for routine tax compliance under the Nigeria Tax Administration Act 2025.',
    regulatory_basis: 'Nigeria Tax Administration Act 2025',
    effort_days_min: 3,
    effort_days_max: 7,
    is_blocker: false,
    depends_on: ['P1-01'],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.tax_id_obtained',
    linked_dimension: 'capital_licensing',
    display_order: 5,
  },
  {
    id: 'P1-06',
    phase: 1,
    title: 'Appoint a Compliance Officer',
    description:
      'Appoint a sufficiently senior and qualified Compliance Officer / Money Laundering Reporting Officer (MLRO) in writing. The MLRO must have direct access to the board and cannot also be the CEO (MLPPA 2022, Section 18). This is a blocker for Phase 2 — the AML/CFT framework cannot exist without an accountable owner.',
    regulatory_basis: 'MLPPA 2022, Section 12 and Section 18; NFIU Compliance Framework, Section 4.2',
    effort_days_min: 7,
    effort_days_max: 30,
    template_id: 'CO_APPOINTMENT',
    is_blocker: true,
    depends_on: ['P1-01'],
    product_types: ['ALL'],
    linked_indicator_key: 'aml_cft_programme.mlro_appointed',
    linked_dimension: 'aml_cft_programme',
    display_order: 6,
  },
  {
    id: 'P1-07',
    phase: 1,
    title: 'Classify your product against the Nigerian VASP framework',
    description:
      'Use the Klarify Product Classifier to determine whether your product is a DAX, DAOP, DAC, DAI, payment product, or hybrid — and which combination of SEC Nigeria and CBN licences you need. Misclassifying a product is the single most common reason early-stage VASPs are blocked at the ARIP eligibility stage.',
    regulatory_basis: 'ISA 2025; SEC Digital Asset Rules 2024',
    effort_days_min: 1,
    effort_days_max: 1,
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'product_classification.product_classified',
    linked_dimension: 'product_classification',
    display_order: 7,
  },
  {
    id: 'P1-08',
    phase: 1,
    title: 'Register a compliant office address in Nigeria',
    description:
      'Establish a physical registered office address in Nigeria. Virtual offices are generally not acceptable for regulatory purposes. Update this address with the CAC and ensure all regulatory correspondence is directed here.',
    regulatory_basis: 'CAMA 2020, Section 26; ARIP Framework Section 6(i), June 2024',
    effort_days_min: 1,
    effort_days_max: 7,
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'corporate_structure.registered_office_address',
    linked_dimension: 'corporate_structure',
    display_order: 8,
  },
];

// -----------------------------------------------------------------------------
// PHASE 2 — Compliance Infrastructure
// -----------------------------------------------------------------------------
const PHASE_2: SeedTaskTemplate[] = [
  {
    id: 'P2-01',
    phase: 2,
    title: 'Register on the NFIU goAML portal',
    description:
      'Register your organisation on the NFIU goAML reporting portal (https://goaml.nfiu.gov.ng). Mandatory for all VASPs and required before any STR or CTR can be filed.',
    regulatory_basis: 'MLPPA 2022, Section 9; NFIU AML/CFT Compliance Framework for VASPs (Dec 2024), Section 7.1',
    effort_days_min: 3,
    effort_days_max: 7,
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'aml_cft_programme.nfiu_goaml_registered',
    linked_dimension: 'aml_cft_programme',
    display_order: 1,
  },
  {
    id: 'P2-02',
    phase: 2,
    title: 'Document your Business-Wide Risk Assessment (BWRA)',
    description:
      'Complete a formal Business-Wide Risk Assessment covering ML/TF risks inherent in your customers, products, delivery channels, and geographic exposure. The BWRA is the cornerstone document of your AML/CFT framework and must be reviewed annually.',
    regulatory_basis: 'NFIU AML/CFT Compliance Framework for VASPs (Dec 2024), Chapter 3; MLPPA 2022 Section 25',
    effort_days_min: 7,
    effort_days_max: 14,
    template_id: 'BWRA',
    is_blocker: false,
    depends_on: ['P2-01'],
    product_types: ['ALL'],
    linked_indicator_key: 'aml_cft_programme.bwra_documented',
    linked_dimension: 'aml_cft_programme',
    display_order: 2,
  },
  {
    id: 'P2-03',
    phase: 2,
    title: 'Draft your AML / CFT Policy Manual',
    description:
      'Prepare a comprehensive AML/CFT Policy Manual covering customer due diligence, enhanced due diligence, transaction monitoring, STR/CTR filing, PEP screening, sanctions screening, record retention, staff training, and internal reporting procedures.',
    regulatory_basis: 'MLPPA 2022, Sections 5–15',
    effort_days_min: 7,
    effort_days_max: 14,
    template_id: 'AML_POLICY',
    is_blocker: false,
    depends_on: ['P2-02'],
    product_types: ['ALL'],
    linked_indicator_key: 'aml_cft_programme.aml_policy_in_place',
    linked_dimension: 'aml_cft_programme',
    display_order: 3,
  },
  {
    id: 'P2-04',
    phase: 2,
    title: 'Implement tiered KYC framework (NIN / BVN verification)',
    description:
      'Design and implement a tiered KYC framework aligned with NFIU guidelines: Tier 1 (phone + BVN, limited transactions), Tier 2 (NIN + photo ID, higher limits), Tier 3 (full CDD + source of funds, highest limits). Integrate NIMC NIN and NIBSS BVN verification APIs.',
    regulatory_basis: 'NFIU Guidelines; CBN KYC Regulations',
    effort_days_min: 14,
    effort_days_max: 30,
    template_id: 'KYC_TIERS',
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'kyc_infrastructure.tiered_kyc_documented',
    linked_dimension: 'kyc_infrastructure',
    display_order: 4,
  },
  {
    id: 'P2-05',
    phase: 2,
    title: 'Configure transaction monitoring system',
    description:
      'Stand up a transaction monitoring system with risk-based alert thresholds for your product. Document scenarios, tune alerts, and ensure daily alert review is operating before launch.',
    regulatory_basis: 'MLPPA 2022, Section 11; NFIU AML/CFT Framework',
    effort_days_min: 14,
    effort_days_max: 30,
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'transaction_monitoring.tm_system_configured',
    linked_dimension: 'transaction_monitoring',
    display_order: 5,
  },
  {
    id: 'P2-06',
    phase: 2,
    title: 'Test STR and CTR filing workflow on goAML',
    description:
      'Run a dry-run STR (Suspicious Transaction Report) and CTR (Currency Transaction Report) submission on the NFIU goAML portal. Confirm format, attachments, and acknowledgement receipt processing before relying on the workflow for live filings.',
    regulatory_basis: 'MLPPA 2022, Sections 6–8',
    effort_days_min: 3,
    effort_days_max: 7,
    is_blocker: false,
    depends_on: ['P2-01', 'P2-05'],
    product_types: ['ALL'],
    linked_indicator_key: 'transaction_monitoring.str_filing_workflow_tested',
    linked_dimension: 'transaction_monitoring',
    display_order: 6,
  },
  {
    id: 'P2-07',
    phase: 2,
    title: 'Maintain PEP register and conduct initial screening',
    description:
      'Stand up your Politically Exposed Persons (PEP) register and run initial screening against your existing customer base. The register is submitted to the NFIU monthly thereafter.',
    regulatory_basis: 'MLPPA 2022, Section 14',
    effort_days_min: 3,
    effort_days_max: 7,
    template_id: 'PEP_REGISTER',
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'regulatory_reporting.pep_register_maintained',
    linked_dimension: 'regulatory_reporting',
    display_order: 7,
  },
  {
    id: 'P2-08',
    phase: 2,
    title: 'Deliver initial AML / CFT team training',
    description:
      'Deliver the first round of mandatory AML/CFT training to all customer-facing and compliance staff. Capture attendance and assessment evidence — required at every NFIU compliance review.',
    regulatory_basis: 'NFIU AML/CFT Compliance Framework, Chapter 6',
    effort_days_min: 1,
    effort_days_max: 3,
    is_blocker: false,
    depends_on: ['P2-03'],
    product_types: ['ALL'],
    linked_indicator_key: 'regulatory_reporting.quarterly_training_delivered',
    linked_dimension: 'regulatory_reporting',
    display_order: 8,
  },
];

// -----------------------------------------------------------------------------
// PHASE 3 — ARIP Application
// Sourced VERBATIM from Klarify_PRD_v1.1.md US-007 Phase 3 Task Library.
// -----------------------------------------------------------------------------
const PHASE_3: SeedTaskTemplate[] = [
  {
    id: 'P3-01',
    phase: 3,
    title: 'Engage a registered solicitor or adviser',
    description:
      'CRITICAL BLOCKER — nothing else in Phase 3 proceeds without this. Application MUST be filed through a registered solicitor or adviser (Section 16, ARIP Framework). The applicant cannot self-file. Ask your solicitor to verify they have experience with SEC Nigeria digital asset applications specifically.',
    regulatory_basis: 'Section 16, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 7,
    effort_days_max: 14,
    is_blocker: true,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.registered_solicitor_engaged',
    linked_dimension: 'capital_licensing',
    display_order: 1,
  },
  {
    id: 'P3-02',
    phase: 3,
    title: 'Verify M&A includes VASP powers',
    description:
      'Your Memorandum and Articles of Association must specifically include the power to perform the specified VASP function (Section 18ii(b), ARIP Framework). Generic M&A from a CAC registration for a different business purpose is often insufficient. May require CAC amendment which adds up to 4 weeks.',
    regulatory_basis: 'Section 18ii(b), ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 3,
    effort_days_max: 28,
    is_blocker: false,
    depends_on: ['P3-01'],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.moa_includes_vasp_powers',
    linked_dimension: 'capital_licensing',
    display_order: 2,
  },
  {
    id: 'P3-03',
    phase: 3,
    title: 'Appoint minimum 4 sponsored individuals',
    description:
      'You must appoint and sponsor a minimum of four principal officers, including the MD and Compliance Officer (Section 18i, ARIP Framework). All sponsored individuals must complete fitness and propriety declarations and have their NIN and BVN verified and ready. File via Form SEC 2 and 2D.',
    regulatory_basis: 'Section 18i, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 7,
    effort_days_max: 14,
    is_blocker: false,
    depends_on: ['P3-01'],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.min_four_sponsored_individuals',
    linked_dimension: 'capital_licensing',
    display_order: 3,
  },
  {
    id: 'P3-04',
    phase: 3,
    title: 'Obtain Tax Clearance Certificate',
    description:
      'You need a current Tax Clearance Certificate from FIRS — not just your Tax Identification Number (Section 18iv, ARIP Framework). New companies often overlook this. Allow 2–4 weeks to obtain from FIRS. The certificate must be current at the time of application.',
    regulatory_basis: 'Section 18iv, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 14,
    effort_days_max: 28,
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.tax_clearance_certificate_obtained',
    linked_dimension: 'capital_licensing',
    display_order: 4,
  },
  {
    id: 'P3-05',
    phase: 3,
    title: 'Draft complete Operational Plan including exit plan',
    description:
      'Must include risk management framework, investor protection measures, data protection measures, customer communication strategy, and a mandatory exit plan describing how customer obligations will be fulfilled if registration is not achieved (Section 15b + Section 36, ARIP Framework). Use Klarify template: ARIP_OPERATIONAL_PLAN.',
    regulatory_basis: 'Section 15b + Section 36, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 7,
    effort_days_max: 14,
    template_id: 'ARIP_OPERATIONAL_PLAN',
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.operational_plan_drafted',
    linked_dimension: 'capital_licensing',
    display_order: 5,
  },
  {
    id: 'P3-06',
    phase: 3,
    title: 'Prepare ARIP Sworn Undertaking for all officers',
    description:
      'Covers all directors, CEO, controller, and key officers (Section 15a, ARIP Framework). Each person must make individual declarations covering all 8 fitness criteria. Use Klarify template: ARIP_SWORN_UNDERTAKING. Allow 3–5 days per person for completion and notarisation.',
    regulatory_basis: 'Section 15a, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 5,
    effort_days_max: 14,
    template_id: 'ARIP_SWORN_UNDERTAKING',
    is_blocker: false,
    depends_on: ['P3-03'],
    product_types: ['ALL'],
    display_order: 6,
  },
  {
    id: 'P3-07',
    phase: 3,
    title: 'Obtain No Objection from other regulators if applicable',
    description:
      'Required if regulated by another sectoral regulator (e.g. CBN, NAICOM, NCC). If product touches payment rails, CBN No Objection may be required before SEC ARIP application (Section 17, ARIP Framework). Allow 4–8 weeks — plan this early.',
    regulatory_basis: 'Section 17, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 28,
    effort_days_max: 56,
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.other_regulator_no_objection_obtained',
    linked_dimension: 'capital_licensing',
    display_order: 7,
  },
  {
    id: 'P3-08',
    phase: 3,
    title: 'Prepare Entity Rules and Governance Framework',
    description:
      'Prepare your Entity Rules document covering all 8 mandatory provisions including investor protection, fairness and transparency, conflict of interest management, user suspension procedures, and an appeals process (Section 15c, ARIP Framework). Use Klarify template: ARIP_ENTITY_RULES.',
    regulatory_basis: 'Section 15c, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 3,
    effort_days_max: 7,
    template_id: 'ARIP_ENTITY_RULES',
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    display_order: 8,
  },
  {
    id: 'P3-09',
    phase: 3,
    title: 'Submit Initial Assessment via SEC ePortal',
    description:
      'Submit the Initial Assessment Form via the SEC ePortal at home.sec.gov.ng. This is Stage 1 of the ARIP process only — not the full application. Await eligibility notification before proceeding to Stage 3 formal application. Contact: innovation@sec.gov.ng. SEC Innovation Office is open Tuesdays and Thursdays 10am–2pm only (Section 8, ARIP Framework).',
    regulatory_basis: 'Section 8, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 1,
    effort_days_max: 2,
    is_blocker: false,
    depends_on: ['P3-01', 'P3-02', 'P3-03'],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.arip_application_submitted',
    linked_dimension: 'capital_licensing',
    display_order: 9,
  },
  {
    id: 'P3-10',
    phase: 3,
    title: 'Record customer baseline count on day AIP is received',
    description:
      'CRITICAL — The 10% customer growth cap is measured from the exact date AIP is received (Section 29d, ARIP Framework). Record the exact customer count that day in the Klarify ARIP tracker. This number cannot be reconstructed later. Effort: 1 hour — must be done on the day of AIP receipt.',
    regulatory_basis: 'Section 29d, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 0,
    effort_days_max: 1,
    is_blocker: true,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.customer_growth_baseline_recorded',
    linked_dimension: 'capital_licensing',
    display_order: 10,
  },
  {
    id: 'P3-11',
    phase: 3,
    title: 'Brief entire team on AIP restrictions',
    description:
      'The promotional ban applies to ALL team members — marketing, sales, and customer success must know they cannot run campaigns, send mass emails, or solicit new customers for the entire AIP duration (Section 29, ARIP Framework). Violations can result in AIP withdrawal.',
    regulatory_basis: 'Section 29, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 1,
    effort_days_max: 2,
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.promotional_restrictions_team_briefed',
    linked_dimension: 'capital_licensing',
    display_order: 11,
  },
];

// -----------------------------------------------------------------------------
// PHASE 4 — AIP Period Operations
// -----------------------------------------------------------------------------
const PHASE_4: SeedTaskTemplate[] = [
  {
    id: 'P4-01',
    phase: 4,
    title: 'Record customer baseline count on AIP receipt date',
    description:
      'Record the EXACT customer count on the day AIP is received. This is the baseline for the 10% growth cap (Section 29d, ARIP Framework). It cannot be reconstructed later.',
    regulatory_basis: 'Section 29d, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 0,
    effort_days_max: 1,
    is_blocker: true,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.customer_growth_baseline_recorded',
    linked_dimension: 'capital_licensing',
    display_order: 1,
  },
  {
    id: 'P4-02',
    phase: 4,
    title: 'Brief all team members on AIP restrictions',
    description:
      'Marketing, sales, and customer success must know the promotional ban applies to ALL communications (Section 29, ARIP Framework). Hold a team session and document attendance.',
    regulatory_basis: 'Section 29, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 1,
    effort_days_max: 2,
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.promotional_restrictions_team_briefed',
    linked_dimension: 'capital_licensing',
    display_order: 2,
  },
  {
    id: 'P4-03',
    phase: 4,
    title: 'Set up weekly trading statistics report to SEC',
    description:
      'Stand up a recurring workflow to compile and file weekly trading statistics with SEC Nigeria for the duration of the AIP period (Section 21a, ARIP Framework).',
    regulatory_basis: 'Section 21a, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 1,
    effort_days_max: 3,
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.weekly_reporting_system_ready',
    linked_dimension: 'capital_licensing',
    display_order: 3,
  },
  {
    id: 'P4-04',
    phase: 4,
    title: 'Set up monthly trading statistics report to SEC',
    description:
      'Stand up the monthly trading statistics report cadence to SEC Nigeria (Section 21a, ARIP Framework).',
    regulatory_basis: 'Section 21a, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 1,
    effort_days_max: 3,
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.monthly_reporting_system_ready',
    linked_dimension: 'capital_licensing',
    display_order: 4,
  },
  {
    id: 'P4-05',
    phase: 4,
    title: 'File quarterly financial and compliance reports to SEC',
    description:
      'Quarterly financial and compliance reports to SEC Nigeria covering the AIP period (Section 21b, ARIP Framework).',
    regulatory_basis: 'Section 21b, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 3,
    effort_days_max: 7,
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'capital_licensing.quarterly_reporting_system_ready',
    linked_dimension: 'capital_licensing',
    display_order: 5,
  },
  {
    id: 'P4-06',
    phase: 4,
    title: 'Annual BWRA review and update',
    description:
      'Refresh the Business-Wide Risk Assessment annually under the NFIU AML/CFT Framework. Reviewed BWRA must be approved by the board and lodged in compliance records.',
    regulatory_basis: 'NFIU AML/CFT Compliance Framework for VASPs (Dec 2024)',
    effort_days_min: 5,
    effort_days_max: 10,
    is_blocker: false,
    depends_on: [],
    product_types: ['ALL'],
    linked_indicator_key: 'regulatory_reporting.annual_bwra_reviewed',
    linked_dimension: 'regulatory_reporting',
    display_order: 6,
  },
];

/** The canonical Sprint 4 seed library — feeds `roadmap_task_templates`. */
export const ALL_SEED_TEMPLATES: readonly SeedTaskTemplate[] = [
  ...PHASE_1,
  ...PHASE_2,
  ...PHASE_3,
  ...PHASE_4,
];

/** Convenience lookups for tests + UI. */
export const SEED_TEMPLATES_BY_PHASE = {
  1: PHASE_1,
  2: PHASE_2,
  3: PHASE_3,
  4: PHASE_4,
} as const;

export function findSeedTemplate(id: string): SeedTaskTemplate | undefined {
  return ALL_SEED_TEMPLATES.find((t) => t.id === id);
}
