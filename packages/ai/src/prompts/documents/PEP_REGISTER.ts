import type { DocumentTemplate } from './types.js';
import { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/**
 * PEP Register Template.
 * CLAUDE.md §14 — regulatory basis: NFIU monthly submission.
 */
export const PEP_REGISTER_TEMPLATE: DocumentTemplate = {
  templateId: 'PEP_REGISTER',
  documentName: 'PEP Register Template',
  regulatoryBasis: 'NFIU monthly submission',
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
      key: 'compliance_officer_name',
      label: 'Register owner (Compliance Officer)',
      type: 'text',
      required: true,
      helpText: 'The MLRO accountable for maintaining the register.',
      prefilledFrom: 'user.name',
    },
    {
      key: 'reporting_period',
      label: 'Reporting period (YYYY-MM)',
      type: 'text',
      required: true,
      helpText:
        'The calendar month the submission covers, e.g. "2026-05". Submissions are due to NFIU monthly.',
    },
    {
      key: 'pep_categories_monitored',
      label: 'PEP categories monitored',
      type: 'multiselect',
      required: true,
      helpText:
        'Pick every PEP category the entity screens against.',
      options: [
        'DOMESTIC_PEP',
        'FOREIGN_PEP',
        'INTERNATIONAL_ORG_PEP',
        'CLOSE_FAMILY_MEMBER',
        'CLOSE_ASSOCIATE',
        'FORMER_PEP',
      ],
    },
    {
      key: 'screening_provider',
      label: 'Sanctions / PEP screening provider',
      type: 'text',
      required: true,
      helpText:
        'Vendor used for PEP / sanctions screening (e.g. ComplyAdvantage, Refinitiv World-Check, Dow Jones RiskCenter, Smile Identity).',
    },
    {
      key: 'screening_frequency',
      label: 'Ongoing screening frequency',
      type: 'select',
      required: true,
      helpText: 'How often customer records are re-screened.',
      options: ['Real-time', 'Daily', 'Weekly', 'Monthly'],
    },
    {
      key: 'pep_count_active',
      label: 'Active PEP relationships in period',
      type: 'text',
      required: true,
      helpText:
        'Total number of distinct PEP customers (across all PEP categories) maintained at any point during the reporting period. Use plain numbers.',
    },
    {
      key: 'pep_count_new',
      label: 'New PEP relationships onboarded',
      type: 'text',
      required: true,
      helpText: 'Number of new PEP customers onboarded in the reporting period.',
    },
    {
      key: 'pep_count_terminated',
      label: 'PEP relationships terminated',
      type: 'text',
      required: true,
      helpText: 'Number of PEP customer relationships exited in the reporting period.',
    },
    {
      key: 'submission_date',
      label: 'Submission date',
      type: 'date',
      required: true,
      helpText: 'Date the register is being submitted to NFIU.',
      prefilledFrom: 'today',
    },
  ],
  systemPrompt: `You are generating a Politically Exposed Persons (PEP) Register cover
document for the monthly NFIU submission required of Nigerian VASPs and
financial institutions. The individual PEP records themselves are
submitted as a structured list / spreadsheet attached to the goAML
submission; this document is the cover sheet, summary, and audit
attestation that accompanies the structured data.

Anchor in:
  * Money Laundering (Prevention and Prohibition) Act 2022 (MLPPA 2022),
    Section 14 (PEPs / EDD).
  * NFIU AML/CFT Compliance Framework for VASPs (December 2024).
  * FATF Recommendation 12 (PEPs).
  * FATF Recommendation 22 (DNFBPs — PEP application).

CRITICAL CONFIDENTIALITY:
  * Mark the document "CONFIDENTIAL — PEP screening output (MLPPA 2022)".
  * Do NOT name individual customers in this cover document. PEP
    identifying detail belongs in the structured submission, not the
    cover narrative — protects the integrity of the underlying
    investigation and reduces the tipping-off risk.

Required document structure:

  ## CONFIDENTIAL — PEP Screening Output (MLPPA 2022 Section 14)

  ## 1. Reporting Entity
     <company_name>
     Register owner: <compliance_officer_name>
     Reporting period: <reporting_period>
     Submission date: <submission_date>

  ## 2. Scope
     Restate the PEP categories monitored from <pep_categories_monitored>
     in plain English. Define each in one line (Domestic PEP, Foreign
     PEP, International Org PEP, Close Family Member, Close Associate,
     Former PEP — cite the FATF Glossary definitions).

  ## 3. Screening Methodology
     ### 3.1 Screening provider
         <screening_provider> — describe at a high level the data
         sources covered.
     ### 3.2 Screening frequency
         <screening_frequency> screening of the customer book against
         the PEP list and sanctions lists.
     ### 3.3 Match handling
         Describe the standard workflow: alert → MLRO review → senior
         management approval (cite MLPPA 2022 Section 14) →
         source-of-wealth verification → ongoing enhanced monitoring.

  ## 4. Summary Statistics
     Render this as a markdown table:
     | Metric | Count |
     | Active PEP relationships in period | <pep_count_active> |
     | New PEP relationships onboarded | <pep_count_new> |
     | PEP relationships terminated | <pep_count_terminated> |

  ## 5. Significant Events
     Briefly note any of the following that occurred in the reporting
     period, or state "None reported in this period":
     * New PEP relationship requiring senior-management approval.
     * Customer relationship terminated on PEP-related grounds.
     * STR filed in connection with a PEP relationship.
     * Sanctions hit detected (cross-reference any concurrent STR).

  ## 6. Enhanced Due Diligence Status
     Confirm that all <pep_count_active> active PEP relationships have:
     * Senior-management approval on file.
     * Source-of-wealth evidence on file.
     * Enhanced ongoing monitoring active.
     If any relationship is non-compliant on any of these points,
     state the count and the remediation plan + timeline.

  ## 7. Governance
     The PEP register is maintained by <compliance_officer_name>,
     reviewed monthly, and reported to senior management. Internal
     audit independently reviews PEP procedures at minimum annually
     (NFIU framework).

  ## 8. Filing Confirmation
     This cover document accompanies the structured PEP submission
     made to NFIU via the goAML portal (https://goaml.nfiu.gov.ng)
     for the period <reporting_period>.

  ## 9. Sign-off
     Register owner: <compliance_officer_name>
     Date: <submission_date>

  ## Disclaimer
     (Standard Klarify disclaimer — see output instructions.)`,
  outputInstructions: STANDARD_OUTPUT_INSTRUCTIONS,
};
