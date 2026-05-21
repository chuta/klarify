import type { DocumentTemplate } from './types.js';
import { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/**
 * Suspicious Transaction Report Filing Template.
 * CLAUDE.md §14 — regulatory basis: NFIU goAML format.
 */
export const STR_TEMPLATE: DocumentTemplate = {
  templateId: 'STR_TEMPLATE',
  documentName: 'STR Filing Template',
  regulatoryBasis: 'NFIU goAML format',
  category: 'AML_CFT',
  requiredFields: [
    {
      key: 'company_name',
      label: 'Reporting entity (your company)',
      type: 'text',
      required: true,
      helpText: 'Registered name of the reporting institution.',
      prefilledFrom: 'org.name',
    },
    {
      key: 'reporting_officer_name',
      label: 'Reporting officer name',
      type: 'text',
      required: true,
      helpText: 'The MLRO / compliance officer filing the STR.',
      prefilledFrom: 'user.name',
    },
    {
      key: 'reporting_officer_email',
      label: 'Reporting officer email',
      type: 'text',
      required: true,
      helpText: 'Contact email for the filing officer.',
      prefilledFrom: 'user.email',
    },
    {
      key: 'subject_type',
      label: 'Subject of the report',
      type: 'select',
      required: true,
      helpText: 'Who or what is the suspicious activity attributed to?',
      options: [
        'INDIVIDUAL_CUSTOMER',
        'BUSINESS_CUSTOMER',
        'NON_CUSTOMER',
        'EMPLOYEE',
        'UNKNOWN',
      ],
    },
    {
      key: 'transaction_type',
      label: 'Transaction type',
      type: 'select',
      required: true,
      helpText: 'Type of activity giving rise to the STR.',
      options: [
        'DEPOSIT',
        'WITHDRAWAL',
        'TRANSFER_IN',
        'TRANSFER_OUT',
        'CRYPTO_BUY',
        'CRYPTO_SELL',
        'CRYPTO_TRANSFER',
        'ACCOUNT_ACTIVITY_NO_TRANSACTION',
        'OTHER',
      ],
    },
    {
      key: 'transaction_value_ngn',
      label: 'Aggregate transaction value (NGN equivalent)',
      type: 'text',
      required: true,
      helpText:
        'Convert any crypto / FX amounts to NGN at the prevailing CBN rate at the time of the transaction.',
    },
    {
      key: 'suspicion_indicators',
      label: 'Red flags / suspicion indicators triggered',
      type: 'multiselect',
      required: true,
      helpText: 'Tick every indicator that applies.',
      options: [
        'STRUCTURING',
        'UNUSUAL_VOLUME',
        'INCONSISTENT_WITH_PROFILE',
        'HIGH_RISK_JURISDICTION',
        'PEP_MATCH',
        'SANCTIONS_HIT',
        'NEGATIVE_NEWS',
        'RAPID_MOVEMENT_THROUGH_ACCOUNT',
        'UNEXPLAINED_THIRD_PARTY_FUNDS',
        'REFUSAL_TO_PROVIDE_INFORMATION',
        'OTHER',
      ],
    },
    {
      key: 'narrative_facts',
      label: 'Narrative — facts giving rise to suspicion',
      type: 'textarea',
      required: true,
      helpText:
        'Plain, factual account of what happened. Dates, amounts, counterparties (if known), patterns observed. No speculation about underlying offence.',
    },
    {
      key: 'internal_investigation_summary',
      label: 'Internal investigation summary',
      type: 'textarea',
      required: true,
      helpText:
        'What internal review was conducted? Who reviewed it? What did you find? Was the customer relationship restricted, frozen, or maintained?',
    },
    {
      key: 'filing_date',
      label: 'Filing date',
      type: 'date',
      required: true,
      helpText: 'Date the STR is being filed with NFIU.',
      prefilledFrom: 'today',
    },
  ],
  systemPrompt: `You are generating an internal Suspicious Transaction Report (STR)
filing template for a Nigerian VASP / fintech. The output is an
internal companion to the structured goAML XML submission — it gives
the compliance officer a clear, complete narrative they can paste into
the goAML "Reason for Suspicion" field and a paper-trail record for the
audit file.

This is NOT the goAML XML itself (the NFIU goAML format is the
structured filing schema fixed by the NFIU). It IS the human-readable narrative + internal record.

Anchor in:
  * Money Laundering (Prevention and Prohibition) Act 2022 (MLPPA 2022),
    Sections 6 (STR obligation), 7 (CTR), 8 (no tipping-off).
  * NFIU AML/CFT Compliance Framework for VASPs (December 2024).
  * NFIU goAML portal: https://goaml.nfiu.gov.ng

Filing window: STRs must be filed promptly — within 24 hours of the
suspicion forming under MLPPA 2022 / NFIU framework. State this
filing-window obligation in the document.

CRITICAL — confidentiality and tipping-off:
  * The narrative must NOT contain language suggesting the customer be
    notified of the filing. Cite MLPPA 2022 Section 8 (no tipping-off
    offence).
  * Mark the document "CONFIDENTIAL — Subject to MLPPA 2022 Section 8".

Required document structure:

  ## CONFIDENTIAL — Subject to MLPPA 2022 Section 8 (No Tipping-Off)

  ## 1. Reporting Entity
     <company_name>
     Reporting officer: <reporting_officer_name>, <reporting_officer_email>
     Filing date: <filing_date>

  ## 2. Subject of Report
     Subject type: <subject_type>
     Note: customer identifying details (NIN, BVN, account number) are
     captured directly in the goAML structured form and NOT repeated in
     this narrative companion.

  ## 3. Transaction Summary
     Transaction type: <transaction_type>
     Aggregate NGN equivalent: <transaction_value_ngn>
     (Detailed transaction-by-transaction list is filed in the goAML
     structured form.)

  ## 4. Suspicion Indicators
     List every indicator from <suspicion_indicators> in plain English
     with a one-line explanation of how it manifested in this case.

  ## 5. Narrative — Facts Giving Rise to Suspicion
     Reproduce <narrative_facts> in a structured, factual sequence.
     Distinguish "observed facts" from "inferences drawn".
     No speculation about underlying offence.

  ## 6. Internal Investigation
     Reproduce <internal_investigation_summary>. State who reviewed
     the case, what they decided, and what the customer-relationship
     outcome was (continued / restricted / frozen / terminated).

  ## 7. Regulatory Filing Reference
     Filed via NFIU goAML portal (https://goaml.nfiu.gov.ng).
     Filing window: within 24 hours of suspicion forming, per MLPPA
     2022 Section 6 and the NFIU AML/CFT Compliance Framework for
     VASPs (December 2024).
     goAML report reference: [To be inserted after submission]

  ## 8. Confidentiality Notice
     This report and any reference to it are confidential. Disclosure
     to the subject or any third party may constitute a tipping-off
     offence under MLPPA 2022 Section 8.

  ## 9. Sign-off
     Reporting officer: <reporting_officer_name>
     Date: <filing_date>

  ## Disclaimer
     (Standard Klarify disclaimer — see output instructions.)`,
  outputInstructions: STANDARD_OUTPUT_INSTRUCTIONS,
};
