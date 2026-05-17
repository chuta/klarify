// Default roadmap task templates for all 4 phases.
// Seeded after onboarding completes.
// Regulatory basis references: CAMA 2020, ISA 2025, SEC Digital Asset Rules 2025,
// MLPPA 2022, NFIU AML/CFT Compliance Framework (Dec 2024).

export interface RoadmapTaskTemplate {
  phase: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  /** e.g. "CAMA 2020, Section 18" */
  regulatory_basis: string;
  /** Links to a document template if applicable */
  template_id?: string;
  /** "dimension.indicator_key" — completing this task sets the indicator */
  indicator_key?: string;
}

// =============================================================================
// Phase 1 — Foundation: Corporate & Capital
// =============================================================================
export const PHASE_1_TEMPLATES: RoadmapTaskTemplate[] = [
  {
    phase: 1,
    title: 'Register with the Corporate Affairs Commission (CAC)',
    description:
      'Incorporate your company with the CAC as a limited liability company (Ltd) or public limited company (Plc). Ensure your MEMART includes digital asset activities in the objects clause. Obtain your CAC certificate and certified true copies of all incorporation documents.',
    regulatory_basis: 'Companies and Allied Matters Act 2020 (CAMA), Sections 18–40',
    indicator_key: 'corporate_structure.cac_registered',
  },
  {
    phase: 1,
    title: 'Establish the correct share structure and beneficial ownership register',
    description:
      'Structure share capital to meet SEC Nigeria minimum thresholds for your licence type. Prepare a register of members and beneficial owners. File the initial return of allotment with the CAC.',
    regulatory_basis: 'CAMA 2020, Section 119; ISA 2025, Section 357',
    indicator_key: 'corporate_structure.correct_share_structure',
  },
  {
    phase: 1,
    title: 'Confirm Nigerian CEO/MD resident in Nigeria',
    description:
      'The SEC Digital Asset Rules 2025 require that the Chief Executive Officer or Managing Director of a VASP is resident in Nigeria. Confirm residency status and document accordingly.',
    regulatory_basis: 'SEC Digital Asset Rules 2025, Rule 3(2)(b)',
    indicator_key: 'corporate_structure.nigerian_ceo_resident',
  },
  {
    phase: 1,
    title: 'Deposit minimum paid-up capital and obtain documentary evidence',
    description:
      'Deposit the required minimum paid-up capital into the company\'s designated capital account. Obtain a bank confirmation letter documenting the amount, date, and source of funds. This evidence is submitted to SEC Nigeria as part of the ARIP application.',
    regulatory_basis: 'ISA 2025, Section 357; SEC Digital Asset Rules 2025, Rule 5(1)',
    indicator_key: 'capital_licensing.minimum_capital_deposited',
  },
  {
    phase: 1,
    title: 'Document the source of capital funds',
    description:
      'Prepare a capital source document evidencing the origin of the minimum paid-up capital. This must show that funds are from legitimate sources and are not proceeds of crime. Required for the ARIP initial assessment.',
    regulatory_basis: 'MLPPA 2022, Section 7; SEC Digital Asset Rules 2025, Rule 5(3)',
    indicator_key: 'capital_licensing.capital_source_documented',
  },
  {
    phase: 1,
    title: 'Engage qualified legal counsel with digital asset regulatory experience',
    description:
      'Retain a lawyer or law firm with demonstrated experience in Nigerian digital asset and capital markets regulation. Legal counsel will review your MEMART, capital structure, and prepare the token classification memo required for ARIP.',
    regulatory_basis: 'SEC Digital Asset Rules 2025, Rule 6; ISA 2025, Section 19',
    template_id: 'TOKEN_MEMO',
  },
  {
    phase: 1,
    title: 'Register a compliant office address in Nigeria',
    description:
      'Establish a physical registered office address in Nigeria. Virtual offices are generally not acceptable for regulatory purposes. Update this address with the CAC and ensure all regulatory correspondence is directed here.',
    regulatory_basis: 'CAMA 2020, Section 26',
    indicator_key: 'corporate_structure.registered_office_address',
  },
];

// =============================================================================
// Phase 2 — AML/KYC Infrastructure
// =============================================================================
export const PHASE_2_TEMPLATES: RoadmapTaskTemplate[] = [
  {
    phase: 2,
    title: 'Conduct and document a Business-Wide Risk Assessment (BWRA)',
    description:
      'Complete a formal Business-Wide Risk Assessment covering all ML/TF risks inherent in your business model, customer base, delivery channels, products, and geographic exposure. The BWRA is the cornerstone document of your AML/CFT framework and must be reviewed annually.',
    regulatory_basis:
      'MLPPA 2022, Section 25; NFIU AML/CFT Compliance Framework for VASPs (December 2024), Chapter 3',
    template_id: 'BWRA',
    indicator_key: 'aml_cft_programme.bwra_documented',
  },
  {
    phase: 2,
    title: 'Draft and adopt an AML/CFT Policy Manual',
    description:
      'Prepare a comprehensive AML/CFT Policy Manual covering: customer due diligence, enhanced due diligence, transaction monitoring, STR/CTR filing, PEP screening, sanctions screening, record retention, staff training, and internal reporting procedures.',
    regulatory_basis:
      'MLPPA 2022, Sections 5–15; NFIU AML/CFT Compliance Framework for VASPs (December 2024)',
    template_id: 'AML_POLICY',
    indicator_key: 'aml_cft_programme.aml_policy_in_place',
  },
  {
    phase: 2,
    title: 'Register on the NFIU goAML portal',
    description:
      'Register your organisation on the NFIU\'s goAML reporting portal (https://goaml.nfiu.gov.ng). This is mandatory for all VASPs and is required before you can file Suspicious Transaction Reports (STRs) and Currency Transaction Reports (CTRs).',
    regulatory_basis:
      'MLPPA 2022, Section 9; NFIU AML/CFT Compliance Framework for VASPs (December 2024), Section 7.1',
    indicator_key: 'aml_cft_programme.nfiu_goaml_registered',
  },
  {
    phase: 2,
    title: 'Appoint a qualified Money Laundering Reporting Officer (MLRO)',
    description:
      'Appoint a sufficiently senior and qualified individual as the Money Laundering Reporting Officer. Prepare the formal appointment letter. The MLRO must have direct access to the board and cannot also serve as the CEO.',
    regulatory_basis: 'MLPPA 2022, Section 18; NFIU Compliance Framework, Section 4.2',
    template_id: 'CO_APPOINTMENT',
    indicator_key: 'aml_cft_programme.mlro_appointed',
  },
  {
    phase: 2,
    title: 'Verify MLRO qualifications and submit to NFIU',
    description:
      'Confirm that the appointed MLRO holds a recognised AML/CFT certification (e.g., CAMS, ICA Diploma) or relevant professional qualifications. Notify the NFIU of the MLRO appointment as required.',
    regulatory_basis: 'NFIU AML/CFT Compliance Framework for VASPs (December 2024), Section 4.3',
    indicator_key: 'aml_cft_programme.mlro_qualified',
  },
  {
    phase: 2,
    title: 'Implement tiered KYC framework (Tier 1–3)',
    description:
      'Design and implement a three-tier KYC framework aligned with NFIU guidelines: Tier 1 (phone + BVN, limited transactions), Tier 2 (NIN + photo ID, higher limits), Tier 3 (full CDD + source of funds, highest limits). Integrate NIN and BVN verification APIs.',
    regulatory_basis:
      'NFIU AML/CFT Compliance Framework for VASPs (December 2024), Chapter 5; CBN VASP Guidelines 2023',
    template_id: 'KYC_TIERS',
    indicator_key: 'kyc_infrastructure.tiered_kyc_documented',
  },
  {
    phase: 2,
    title: 'Integrate NIN and BVN verification APIs',
    description:
      'Integrate NIMC-approved NIN verification and NIBSS BVN verification APIs into your customer onboarding flow. Test verification for all customer types. Document integration and maintain audit logs.',
    regulatory_basis: 'NFIU AML/CFT Compliance Framework for VASPs (December 2024), Chapter 5',
    indicator_key: 'kyc_infrastructure.nin_verification_integrated',
  },
];

// =============================================================================
// Phase 3 — Regulatory Engagement
// =============================================================================
export const PHASE_3_TEMPLATES: RoadmapTaskTemplate[] = [
  {
    phase: 3,
    title: 'Conduct SEC Nigeria pre-screening meeting',
    description:
      'Request and attend a pre-screening meeting with the SEC Nigeria Digital Assets unit before submitting your ARIP application. This informal engagement helps identify gaps, clarify expectations, and signals cooperative intent to the regulator.',
    regulatory_basis: 'SEC Digital Asset Rules 2025, Rule 10; ISA 2025, Section 357',
    indicator_key: 'regulatory_relationships.pre_screening_conducted',
  },
  {
    phase: 3,
    title: 'Notify the Central Bank of Nigeria (CBN) if product involves naira or payments',
    description:
      'If your product involves naira on/off-ramps, stablecoin payment rails, or any payment system infrastructure, notify the CBN and engage the Payments System Management Department. Separate CBN approval may be required in addition to SEC registration.',
    regulatory_basis: 'CBN VASP Guidelines 2023; BOFIA 2020, Section 57',
    indicator_key: 'regulatory_relationships.cbn_contact_logged',
  },
  {
    phase: 3,
    title: 'Log all regulator contacts in the CRM',
    description:
      'Record the names, roles, email addresses, and phone numbers of all SEC Nigeria, CBN, and NFIU contacts you have engaged. Document the date and substance of every communication. This record becomes evidence of cooperative engagement.',
    regulatory_basis: 'Best practice — CLAUDE.md §13 (Regulator CRM)',
    indicator_key: 'regulatory_relationships.sec_contact_logged',
  },
  {
    phase: 3,
    title: 'Submit ARIP application to SEC Nigeria',
    description:
      'Compile and submit the full ARIP (Accelerated Regulatory Incubation Programme) application to SEC Nigeria. Required documents include: corporate documents, capital evidence, BWRA, AML policy, KYC framework, token white paper, technology security assessment, and legal opinion on token classification.',
    regulatory_basis: 'SEC Digital Asset Rules 2025, Rule 10–15; ISA 2025, Section 357',
    template_id: 'ARIP_WHITEPAPER',
    indicator_key: 'capital_licensing.arip_application_submitted',
  },
];

// =============================================================================
// Phase 4 — Full Registration
// =============================================================================
export const PHASE_4_TEMPLATES: RoadmapTaskTemplate[] = [
  {
    phase: 4,
    title: 'Respond to SEC Nigeria initial assessment queries',
    description:
      'Following your ARIP submission, SEC Nigeria will issue queries or requests for additional information during the initial assessment stage. Prepare comprehensive, accurate responses. All responses must be reviewed by legal counsel before submission.',
    regulatory_basis: 'SEC Digital Asset Rules 2025, Rule 12; ISA 2025, Section 357',
    indicator_key: 'regulatory_relationships.communications_documented',
  },
  {
    phase: 4,
    title: 'Obtain AIP (Approval in Principle) and enter AIP operations period',
    description:
      'Upon successful assessment, SEC Nigeria issues an Approval in Principle (AIP). During the AIP operations period you may offer services under regulatory supervision. Maintain all compliance obligations throughout this period. AIP is valid for a limited period (typically 12 months).',
    regulatory_basis: 'SEC Digital Asset Rules 2025, Rules 16–20',
    indicator_key: 'capital_licensing.arip_application_submitted',
  },
  {
    phase: 4,
    title: 'Obtain fidelity bond or professional indemnity insurance',
    description:
      'Arrange a fidelity bond or professional indemnity insurance from a NAICOM-approved insurer for the required minimum coverage amount. The fidelity bond must be in place before full licence registration.',
    regulatory_basis: 'SEC Digital Asset Rules 2025, Rule 5(4); ISA 2025, Section 357',
    indicator_key: 'capital_licensing.fidelity_bond_in_place',
  },
  {
    phase: 4,
    title: 'Complete full licence registration and set up ongoing reporting',
    description:
      'Complete all outstanding documentation for full VASP registration with SEC Nigeria. Establish ongoing regulatory reporting workflows: quarterly transaction reports, STR/CTR filing cadence, PEP register monthly submission, and annual BWRA review cycle.',
    regulatory_basis: 'SEC Digital Asset Rules 2025, Rules 21–30; NFIU goAML reporting requirements',
    template_id: 'REG_BRIEF',
    indicator_key: 'regulatory_reporting.goaml_portal_registered',
  },
  {
    phase: 4,
    title: 'Establish compliance calendar and automated deadline alerts',
    description:
      'Configure the Klarify compliance calendar with all recurring regulatory deadlines: monthly PEP register, quarterly training, CTR filing thresholds, annual BWRA review, and ARIP expiry date. Assign owners and set advance alerts.',
    regulatory_basis: 'MLPPA 2022, Section 9; NFIU Compliance Framework, Section 8',
    indicator_key: 'regulatory_reporting.record_retention_configured',
  },
];

// =============================================================================
// Phase 3 — ARIP Application Tasks (ARIP Framework, SEC Nigeria, June 2024)
// =============================================================================

/** Extended RoadmapTask type for Phase 3 ARIP tasks with dependency tracking */
export interface ARIPRoadmapTask extends RoadmapTaskTemplate {
  id: string;
  phase: 3;
  effort_days_min: number;
  effort_days_max: number;
  is_blocker: boolean;
  depends_on?: string[];
  product_types: string[];
}

export const PHASE_3_ARIP_TASKS: ARIPRoadmapTask[] = [
  {
    id: 'P3-01',
    phase: 3,
    title: 'Engage a registered solicitor or adviser',
    description:
      'Your ARIP application MUST be filed through a registered solicitor or adviser (Section 16, ARIP Framework). The applicant cannot self-file. This is a hard blocker — no other Phase 3 task can proceed until a solicitor is engaged. Ask your solicitor to verify they have experience with SEC Nigeria digital asset applications specifically.',
    regulatory_basis: 'Section 16, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 7,
    effort_days_max: 14,
    is_blocker: true,
    indicator_key: 'capital_licensing.registered_solicitor_engaged',
    product_types: ['ALL'],
  },
  {
    id: 'P3-02',
    phase: 3,
    title: 'Verify M&A includes VASP powers',
    description:
      'Your Memorandum and Articles of Association must specifically include the power to perform your specified VASP function (Section 18ii(b), ARIP Framework). Generic M&A from a CAC registration for a different business purpose is often insufficient. Have your solicitor review the M&A before submitting. If an amendment is needed, this adds 2–4 weeks at the CAC.',
    regulatory_basis: 'Section 18ii(b), ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 3,
    effort_days_max: 28,
    depends_on: ['P3-01'],
    is_blocker: false,
    indicator_key: 'capital_licensing.moa_includes_vasp_powers',
    product_types: ['ALL'],
  },
  {
    id: 'P3-03',
    phase: 3,
    title: 'Appoint minimum 4 sponsored individuals',
    description:
      'You must appoint and sponsor a minimum of four principal officers (Section 18i, ARIP Framework). These must include your Managing Director and Compliance Officer. All sponsored individuals must have their NIN and BVN verified and must complete fitness and propriety declarations. File via Form SEC 2 and 2D.',
    regulatory_basis: 'Section 18i, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 7,
    effort_days_max: 14,
    depends_on: ['P3-01'],
    is_blocker: false,
    indicator_key: 'capital_licensing.min_four_sponsored_individuals',
    product_types: ['ALL'],
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
    indicator_key: 'capital_licensing.tax_clearance_certificate_obtained',
    product_types: ['ALL'],
  },
  {
    id: 'P3-05',
    phase: 3,
    title: 'Draft ARIP Operational Plan including exit plan',
    description:
      'Your operational plan must include a full business description, technology stack, customer profile, risk management framework with key risks and mitigations, investor protection measures, data protection measures, customer communication strategy, and — critically — an exit plan describing how customer obligations will be fulfilled if registration is not achieved. Use the Klarify document generator (ARIP_OPERATIONAL_PLAN template).',
    regulatory_basis: 'Section 15b + Section 36, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 7,
    effort_days_max: 14,
    template_id: 'ARIP_OPERATIONAL_PLAN',
    is_blocker: false,
    indicator_key: 'capital_licensing.operational_plan_drafted',
    product_types: ['ALL'],
  },
  {
    id: 'P3-06',
    phase: 3,
    title: 'Prepare Sworn Undertaking for all officers',
    description:
      'Prepare fitness and propriety Sworn Undertakings for the applicant company and for all directors, CEO, controllers, and key officers (Section 15a, ARIP Framework). Each person must make individual declarations covering all 8 fitness criteria. Use the Klarify document generator (ARIP_SWORN_UNDERTAKING template). Allow 3–5 days per person for completion and notarisation.',
    regulatory_basis: 'Section 15a, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 5,
    effort_days_max: 14,
    template_id: 'ARIP_SWORN_UNDERTAKING',
    depends_on: ['P3-03'],
    is_blocker: false,
    product_types: ['ALL'],
  },
  {
    id: 'P3-07',
    phase: 3,
    title: 'Obtain No Objection from other regulators (if applicable)',
    description:
      'If your product is regulated by another sectoral regulator (e.g. CBN for payment products, NAICOM for insurance products, NCC for mobile products), you must submit a "No Objection" or approval letter from that regulator with your ARIP application (Section 17, ARIP Framework). This can take 4–8 weeks — start early. If your product is purely a capital markets product with no CBN/NAICOM/NCC intersection, mark this as not applicable.',
    regulatory_basis: 'Section 17, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 28,
    effort_days_max: 56,
    is_blocker: false,
    indicator_key: 'capital_licensing.other_regulator_no_objection_obtained',
    product_types: ['ALL'],
  },
  {
    id: 'P3-08',
    phase: 3,
    title: 'Prepare Entity Rules and Governance Framework',
    description:
      'Prepare your Entity Rules document covering all 8 mandatory provisions: investor and public protection, proper entity functioning, fairness and transparency, conflict of interest management, user fair treatment policy, platform host fair treatment policy, user regulation and suspension procedures, and an appeals process against entity decisions (Section 15c, ARIP Framework). Use the Klarify document generator (ARIP_ENTITY_RULES template).',
    regulatory_basis: 'Section 15c, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 3,
    effort_days_max: 7,
    template_id: 'ARIP_ENTITY_RULES',
    is_blocker: false,
    product_types: ['ALL'],
  },
  {
    id: 'P3-09',
    phase: 3,
    title: 'Submit Initial Assessment via SEC ePortal',
    description:
      'Submit the Initial Assessment Form via the SEC ePortal at home.sec.gov.ng. This is Stage 1 of the ARIP process only — not the full application. Await eligibility notification from SEC before proceeding to Stage 3 formal application. For questions, contact the SEC Innovation Office at innovation@sec.gov.ng. Note: the Innovation Office is open Tuesdays and Thursdays, 10:00am–2:00pm only (Section 8, ARIP Framework).',
    regulatory_basis: 'Section 8, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 1,
    effort_days_max: 2,
    depends_on: ['P3-01', 'P3-02', 'P3-03'],
    is_blocker: false,
    indicator_key: 'capital_licensing.arip_application_submitted',
    product_types: ['ALL'],
  },
  {
    id: 'P3-10',
    phase: 3,
    title: 'Record customer baseline count on day AIP is received',
    description:
      'CRITICAL — On the exact day you receive your Approval-in-Principle (AIP), record your exact customer count in the Klarify ARIP tracker. This number becomes your baseline for the 10% customer growth cap (Section 29d, ARIP Framework). You cannot grow your customer base by more than 10% from this baseline for the entire AIP period. This number cannot be reconstructed later — it must be recorded on the day. Effort: 1 hour.',
    regulatory_basis: 'Section 29d, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 0,
    effort_days_max: 1,
    is_blocker: true,
    indicator_key: 'capital_licensing.customer_growth_baseline_recorded',
    product_types: ['ALL'],
  },
  {
    id: 'P3-11',
    phase: 3,
    title: 'Brief entire team on AIP restrictions',
    description:
      'The AIP promotional ban applies to ALL team members — not just leadership. Your marketing, sales, growth, and customer success teams must be briefed that during the AIP period they cannot run advertising campaigns, send mass emails, post growth solicitation content on social media, or engage in any promotional activity (Section 29b, ARIP Framework). Hold a team session and document attendance. Violations by any team member can result in AIP withdrawal.',
    regulatory_basis: 'Section 29, ARIP Framework (SEC Nigeria, June 2024)',
    effort_days_min: 1,
    effort_days_max: 2,
    is_blocker: false,
    indicator_key: 'capital_licensing.promotional_restrictions_team_briefed',
    product_types: ['ALL'],
  },
];

export const ALL_ROADMAP_TEMPLATES: RoadmapTaskTemplate[] = [
  ...PHASE_1_TEMPLATES,
  ...PHASE_2_TEMPLATES,
  ...PHASE_3_TEMPLATES,
  ...PHASE_3_ARIP_TASKS,
  ...PHASE_4_TEMPLATES,
];
