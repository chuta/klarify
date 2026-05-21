import type { DocumentTemplate } from './types.js';
import { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/**
 * ARIP White Paper Outline template.
 * CLAUDE.md §14 — regulatory basis: SEC Digital Asset Rules.
 *
 * Note: this is the Sprint 4 outline. The full ARIP Framework templates
 * (Operational Plan, Sworn Undertaking, Sponsored Individual, Entity
 * Rules) land in Sprint 5 per CLAUDE.md Sprint 4/5 task spec.
 */
export const ARIP_WHITEPAPER_TEMPLATE: DocumentTemplate = {
  templateId: 'ARIP_WHITEPAPER',
  documentName: 'ARIP White Paper Outline',
  regulatoryBasis: 'SEC Digital Asset Rules',
  category: 'ARIP',
  requiredFields: [
    {
      key: 'company_name',
      label: 'Issuing company name',
      type: 'text',
      required: true,
      helpText: 'The full registered name on your CAC certificate.',
      prefilledFrom: 'org.name',
    },
    {
      key: 'product_name',
      label: 'Product name',
      type: 'text',
      required: true,
      helpText: 'The branded name of the product the white paper describes.',
    },
    {
      key: 'licence_category',
      label: 'Licence category sought',
      type: 'select',
      required: true,
      helpText: 'SEC Nigeria VASP category being applied for.',
      options: ['DAX', 'DAOP', 'DAC', 'DAI', 'HYBRID'],
    },
    {
      key: 'product_summary',
      label: 'Product summary',
      type: 'textarea',
      required: true,
      helpText:
        '4–6 sentence plain-language summary. What does the product do? Who is it for? How does it work?',
    },
    {
      key: 'token_or_asset_details',
      label: 'Token / asset details',
      type: 'textarea',
      required: true,
      helpText:
        'If a token: name, blockchain, total supply, distribution. If no token (e.g. exchange): describe the asset classes traded.',
    },
    {
      key: 'target_users',
      label: 'Target users / customer profile',
      type: 'textarea',
      required: true,
      helpText:
        'Who will use this product? Retail, professional, institutional? Nigerian-only or cross-border?',
    },
    {
      key: 'technology_stack',
      label: 'Technology stack',
      type: 'textarea',
      required: true,
      helpText:
        'High-level architecture: cloud provider, blockchain integration, custody architecture, KYC vendors. Avoid trade-secret-level detail.',
    },
    {
      key: 'investor_protection_measures',
      label: 'Investor / customer protection measures',
      type: 'textarea',
      required: true,
      helpText:
        'How customer assets are segregated, how disputes are handled, complaints process, insurance / fidelity bond cover.',
    },
    {
      key: 'capital_position',
      label: 'Capital position (NGN)',
      type: 'text',
      required: true,
      helpText:
        'Minimum paid-up capital available. The minimum capital is set by the SEC Digital Asset Rules — verify the current threshold for your category.',
    },
    {
      key: 'memo_date',
      label: 'White paper date',
      type: 'date',
      required: true,
      helpText: 'Date the white paper is being prepared.',
      prefilledFrom: 'today',
    },
  ],
  systemPrompt: `You are generating an ARIP (Accelerated Regulatory Incubation Programme)
White Paper Outline for a Nigerian digital asset issuer. Anchor it in:
  * Investments and Securities Act 2025 (ISA 2025).
  * SEC Digital Asset Rules 2024 (latest enacted) + 2022 / 2025 amendments.
  * SEC ARIP Framework (June 2024) — particularly Sections 15, 18, 21.
  * FATF Recommendation 15 (VASP scope).

A white paper is the canonical document SEC expects to receive as part
of an ARIP application. It must demonstrate the issuer understands
their product, risks, and obligations.

CRITICAL: Per ARIP Framework Section 16, an ARIP application MUST be
filed through a registered solicitor or adviser. State this in the
"Application Pathway" section explicitly.

Required document structure:

  ## 1. Cover Page (rendered as inline lines, NOT a literal cover)
     <company_name>
     <product_name> — White Paper Outline
     Licence Category: <licence_category>
     Date: <memo_date>

  ## 2. Executive Summary
     One paragraph stating the issuer, product, licence sought, target
     users, and the most important investor-protection feature.

  ## 3. About the Issuer
     <company_name> — CAC registration status, head office, beneficial
     ownership disclosure plan (cite CAMA 2020 + ARIP Framework
     Section 15 Sworn Undertaking requirement).

  ## 4. Product Description
     ### 4.1 Functional overview
         Restate <product_summary> in expanded form. Diagram the user
         journey in numbered steps.
     ### 4.2 Token / asset details
         Restate <token_or_asset_details>. Where applicable, classify
         per the Token Classification framework (security vs utility).
     ### 4.3 Target users
         Restate <target_users>. Where the product targets retail
         investors, flag the heightened protection requirements.

  ## 5. Technology
     Restate <technology_stack>. Describe custody architecture
     specifically — hot/cold split, multi-sig, third-party custodian
     if applicable. Cite ISA 2025 custody requirements where you can.

  ## 6. Regulatory Categorisation
     ### 6.1 Why <licence_category>
         Justify the category selection by mapping product features to
         the SEC Digital Asset Rules 2024 definition. Cite the specific
         rule.
     ### 6.2 Secondary registrations
         If the product touches naira on/off-ramps or stablecoin
         rails, state the additional CBN engagement requirement under
         CBN VASP Guidelines 2023.

  ## 7. Risk Disclosure
     For at least 6 risk categories (market, credit, operational,
     cyber, regulatory, AML/CFT, custody, technology), describe the
     risk in one sentence and the mitigation in one sentence. Cite
     MLPPA 2022 for AML/CFT risk.

  ## 8. Investor / Customer Protection
     Restate <investor_protection_measures>. Add the ARIP Framework
     Section 29 restrictions during the AIP period (no promotional
     activities, no business outside the operational plan, 10%
     customer growth cap from AIP receipt date).

  ## 9. AML / CFT Compliance
     One-paragraph summary of the AML/CFT programme: BWRA, AML Policy
     Manual, KYC tiered framework, transaction monitoring, NFIU
     goAML registration, MLRO accountability. Reference these as
     accompanying documents in the ARIP application bundle.

  ## 10. Governance
      Board oversight. Compliance Officer accountability. Independent
      audit. Cite ARIP Framework Section 18i (sponsored individuals —
      minimum 4 named persons).

  ## 11. Capital and Insurance
      Capital position: NGN <capital_position>. Confirm a fidelity
      bond commitment (ARIP Framework — fidelity bond at minimum 25%
      coverage). State the intent to maintain the bond throughout the
      AIP period.

  ## 12. Application Pathway
      **Solicitor requirement (NON-NEGOTIABLE):** Under Section 16 of
      the ARIP Framework, this application MUST be filed through a
      registered solicitor or adviser. The issuer will engage retained
      counsel before filing.
      Processing fee: NGN 2,000,000 non-refundable, payable via REVOP
      after receiving the Stage 2 eligibility notification.
      Contacts: innovation@sec.gov.ng / fintech@sec.gov.ng. Innovation
      Office hours: Tuesdays and Thursdays, 10:00–14:00 only.

  ## 13. Exit Plan
      How customer obligations will be met if full registration is not
      ultimately granted. Cite ARIP Framework Section 36 (operational
      plan exit-plan requirement).

  ## 14. Sign-off
      Prepared on <memo_date> by <company_name>. To be reviewed and
      filed by retained Nigerian solicitor / adviser.

  ## Disclaimer
      (Standard Klarify disclaimer — see output instructions.)`,
  outputInstructions: STANDARD_OUTPUT_INSTRUCTIONS,
};
