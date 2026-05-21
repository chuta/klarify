import type { DocumentTemplate } from './types.js';
import { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/**
 * AML/CFT Policy Manual template.
 * CLAUDE.md §14 — regulatory basis: MLPPA 2022.
 */
export const AML_POLICY_TEMPLATE: DocumentTemplate = {
  templateId: 'AML_POLICY',
  documentName: 'AML/CFT Policy Manual',
  regulatoryBasis: 'MLPPA 2022',
  category: 'AML_CFT',
  requiredFields: [
    {
      key: 'company_name',
      label: 'Company name',
      type: 'text',
      required: true,
      helpText: 'The full registered name on your CAC certificate.',
      prefilledFrom: 'org.name',
    },
    {
      key: 'product_types',
      label: 'Product categories',
      type: 'multiselect',
      required: true,
      helpText: 'Drives the policy scope. Select all that apply.',
      options: ['DAX', 'DAOP', 'DAC', 'DAI', 'PAYMENT', 'STABLECOIN', 'OTHER'],
      prefilledFrom: 'profile.productTypes',
    },
    {
      key: 'target_markets',
      label: 'Jurisdictions covered',
      type: 'multiselect',
      required: true,
      helpText: 'Jurisdictions the policy must cover.',
      options: ['NG', 'GH', 'KE', 'ZA', 'MU', 'OTHER'],
      prefilledFrom: 'profile.targetMarkets',
    },
    {
      key: 'compliance_officer_name',
      label: 'Compliance officer (MLRO)',
      type: 'text',
      required: true,
      helpText: 'The named Money Laundering Reporting Officer.',
      prefilledFrom: 'user.name',
    },
    {
      key: 'compliance_officer_email',
      label: 'Compliance officer email',
      type: 'text',
      required: true,
      helpText: 'Primary contact channel for the MLRO.',
      prefilledFrom: 'user.email',
    },
    {
      key: 'board_oversight_committee',
      label: 'Board-level oversight body',
      type: 'text',
      required: true,
      helpText:
        'Name of the board committee that reviews the AML programme — usually "Risk & Compliance Committee" or "Audit Committee".',
    },
    {
      key: 'training_cadence',
      label: 'Training cadence',
      type: 'select',
      required: true,
      helpText: 'How often AML/CFT training is delivered to staff.',
      options: ['Quarterly', 'Semi-annually', 'Annually'],
    },
    {
      key: 'record_retention_years',
      label: 'Record retention period (years)',
      type: 'select',
      required: true,
      helpText:
        'MLPPA 2022 mandates a minimum of 5 years. Most VASPs adopt 7 to be safe.',
      options: ['5', '7', '10'],
    },
    {
      key: 'effective_date',
      label: 'Policy effective date',
      type: 'date',
      required: true,
      helpText: 'Date this version of the policy comes into force.',
      prefilledFrom: 'today',
    },
  ],
  systemPrompt: `You are generating an AML/CFT Policy Manual for a Nigerian VASP / fintech.
Anchor the policy in:
  * Money Laundering (Prevention and Prohibition) Act 2022 (MLPPA 2022) —
    primary statute.
  * NFIU AML/CFT Compliance Framework for VASPs (December 2024).
  * CBN VASP Guidelines 2023 (where the business has payment exposure).
  * FATF Recommendations 10, 11, 12, 13, 15, 16, and 20.

This is a board-approved policy. Tone: prescriptive, formal Nigerian
English, plain enough for an operations team to follow. No placeholder
text. Use the supplied form values verbatim where applicable.

Required document structure:

  ## 1. Policy Statement
     One-paragraph statement of management commitment to AML/CFT,
     signed off by the board through the named oversight body.

  ## 2. Scope
     Confirm the policy applies to all staff, contractors, agents and
     systems of <company_name>, across all <target_markets> for the
     <product_types> offered.

  ## 3. Regulatory Framework
     List the laws and rules the policy implements. Cite MLPPA 2022
     Section by Section (Sections 2, 6, 7, 8, 9, 11, 12, 14 are the
     core ones — cite specifically). Cite NFIU framework, CBN VASP
     Guidelines, FATF Recommendations.

  ## 4. Governance & Accountability
     * Board oversight: via <board_oversight_committee>.
     * Senior management responsibility.
     * MLRO: <compliance_officer_name>, <compliance_officer_email>.
       Cite MLPPA 2022 Section 12 (appointment of compliance officer).
     * Independence of MLRO function and protection from undue
       influence.

  ## 5. Risk-Based Approach
     Describe how the BWRA drives the AML/CFT controls. Cross-reference
     FATF Recommendation 1.

  ## 6. Customer Due Diligence (CDD)
     ### Standard CDD
     ### Simplified Due Diligence (SDD) — when permitted
     ### Enhanced Due Diligence (EDD) — for PEPs, high-risk jurisdictions,
         unusual transactions
     ### Beneficial Ownership identification (cite CAMA 2020)
     Reference the company's KYC Tiering Framework for tier-specific
     thresholds. Cite NFIU framework and FATF Recommendations 10 + 22.

  ## 7. Sanctions Screening
     OFAC, UN, EU, UK HMT, NSC list screening at onboarding and ongoing.
     Reference the Terrorism (Prevention and Prohibition) Act 2022 (TPPA).

  ## 8. Politically Exposed Persons (PEPs)
     Definition. Identification. Senior-management approval. Source-of-
     wealth establishment. Ongoing monitoring. Reference MLPPA 2022
     Section 14.

  ## 9. Transaction Monitoring
     Real-time and post-event monitoring. Threshold and pattern-based
     alerts. Alert handling. Cite MLPPA 2022 Section 11.

  ## 10. Suspicious Transaction Reporting (STR) & Currency Transaction Reporting (CTR)
      Trigger criteria. Internal escalation. NFIU filing on goAML within
      the statutory window. Confidentiality / no tipping-off (cite
      MLPPA 2022 Sections 6, 7, 8).

  ## 11. Record Keeping
      Customer records and transaction records retained for
      <record_retention_years> years from the date of relationship
      termination or transaction completion (whichever is later).
      Cite MLPPA 2022 Section 4.

  ## 12. Training
      <training_cadence> mandatory AML/CFT training for all staff.
      Onboarding training for new joiners. Targeted training for
      customer-facing teams. Records retained for the same period as
      customer records.

  ## 13. Independent Review & Audit
      Annual independent review (internal audit or external).
      Findings reported to <board_oversight_committee>.

  ## 14. Sanctions for Non-Compliance
      Internal disciplinary consequences for staff breach. Reference
      the criminal sanctions under MLPPA 2022 for the firm.

  ## 15. Policy Review
      Annual review minimum; ad hoc on material regulatory change.
      Effective from <effective_date>. Next review: <effective_date> + 12 months.

  ## Disclaimer
      (Standard Klarify disclaimer — see output instructions.)
`,
  outputInstructions: STANDARD_OUTPUT_INSTRUCTIONS,
};
