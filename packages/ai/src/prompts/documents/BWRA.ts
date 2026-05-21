import type { DocumentTemplate } from './types.js';
import { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/**
 * Business-Wide Risk Assessment template.
 * CLAUDE.md §14 — regulatory basis: NFIU Guidelines + MLPPA 2022.
 */
export const BWRA_TEMPLATE: DocumentTemplate = {
  templateId: 'BWRA',
  documentName: 'Business-Wide Risk Assessment',
  regulatoryBasis: 'NFIU Guidelines + MLPPA 2022',
  category: 'AML_CFT',
  requiredFields: [
    {
      key: 'company_name',
      label: 'Company name',
      type: 'text',
      required: true,
      helpText: 'The full registered name as it appears on your CAC certificate.',
      prefilledFrom: 'org.name',
    },
    {
      key: 'product_types',
      label: 'Product categories',
      type: 'multiselect',
      required: true,
      helpText:
        'Select every category your product offers. Used to drive the risk-area analysis.',
      options: ['DAX', 'DAOP', 'DAC', 'DAI', 'PAYMENT', 'STABLECOIN', 'OTHER'],
      prefilledFrom: 'profile.productTypes',
    },
    {
      key: 'target_markets',
      label: 'Target markets',
      type: 'multiselect',
      required: true,
      helpText: 'Jurisdictions where you will (or already do) onboard customers.',
      options: ['NG', 'GH', 'KE', 'ZA', 'MU', 'OTHER'],
      prefilledFrom: 'profile.targetMarkets',
    },
    {
      key: 'business_description',
      label: 'Plain-language business description',
      type: 'textarea',
      required: true,
      helpText:
        'What does your business actually do? Who pays you, and how? 3–5 sentences is ideal.',
    },
    {
      key: 'key_risk_areas',
      label: 'Key risk areas you are aware of',
      type: 'multiselect',
      required: true,
      helpText:
        'Pick all the risk types relevant to your product. The BWRA will analyse each one in detail.',
      options: [
        'MONEY_LAUNDERING',
        'TERRORIST_FINANCING',
        'SANCTIONS',
        'FRAUD',
        'CYBER',
        'CUSTOMER_DUE_DILIGENCE',
        'TRANSACTION_MONITORING',
        'PEP_EXPOSURE',
        'CROSS_BORDER',
        'OTHER',
      ],
    },
    {
      key: 'customer_base_size',
      label: 'Approximate customer base size',
      type: 'select',
      required: true,
      helpText: 'Current onboarded customers — use your best estimate.',
      options: ['0-100', '101-1000', '1001-10000', '10001-100000', '100000+'],
    },
    {
      key: 'existing_controls',
      label: 'Existing controls in place',
      type: 'textarea',
      required: true,
      helpText:
        'Briefly describe any KYC, AML, transaction-monitoring, or training controls you already operate. Write "None yet" if you are pre-launch.',
    },
    {
      key: 'compliance_officer_name',
      label: 'Compliance officer name',
      type: 'text',
      required: true,
      helpText:
        'The named MLRO / Chief Compliance Officer accountable for this assessment.',
      prefilledFrom: 'user.name',
    },
    {
      key: 'assessment_date',
      label: 'Assessment date',
      type: 'date',
      required: true,
      helpText: 'Date the BWRA is being conducted. Defaults to today.',
      prefilledFrom: 'today',
    },
  ],
  systemPrompt: `You are generating a Business-Wide Risk Assessment (BWRA) for a Nigerian
digital asset / fintech business. Generate this BWRA in line with the NFIU
AML/CFT Compliance Framework for VASPs (December 2024) and the Money
Laundering (Prevention and Prohibition) Act 2022 (MLPPA 2022, Section 12).

The BWRA is a foundational AML/CFT document that the regulator (NFIU)
expects the business to maintain, review at least annually, and update on
material change. It must demonstrate the business has understood its
specific ML/TF/sanctions exposure and designed controls proportionate to
that exposure.

Required document structure (use these section headings in order):

  ## 1. Executive Summary
     One paragraph summarising the inherent risk rating (Low/Medium/
     High), the residual risk rating after existing controls, and the
     top three risk areas requiring management attention.

  ## 2. Business Profile
     Restate the company name, products, target markets, customer base
     size, and business model. Cite the customer-base bracket the user
     selected.

  ## 3. Methodology
     Describe a 5-step methodology: (1) identify inherent risks,
     (2) assess likelihood and impact, (3) document existing controls,
     (4) compute residual risk, (5) identify treatment plan. Reference
     the NFIU framework explicitly.

  ## 4. Inherent Risk Analysis
     For each of the user-supplied "key_risk_areas", produce a
     sub-section (### Risk: <name>) with:
       * Description of the risk in plain Nigerian English.
       * Why this risk matters for the business specifically (use the
         business_description and product_types).
       * Inherent likelihood (Low / Medium / High) with one-sentence
         reasoning.
       * Inherent impact (Low / Medium / High) with one-sentence
         reasoning.
       * Inherent risk rating (Likelihood × Impact).
     Cite MLPPA 2022 and the NFIU framework where applicable. Cite
     FATF Recommendation 15 for crypto-specific risks.

  ## 5. Existing Controls
     Summarise the user-supplied existing controls. Categorise them
     into Preventive / Detective / Corrective. If existing_controls
     reads "None yet", state that explicitly and flag the gap.

  ## 6. Residual Risk Rating
     For each risk area, restate the inherent rating, the controls
     applied, and the residual rating. Use a markdown table:
     | Risk area | Inherent | Controls | Residual |

  ## 7. Treatment Plan
     For every residual rating that is Medium or High, propose 2–4
     specific actions with named owners ("Compliance Officer",
     "Operations Lead") and 30 / 60 / 90-day timelines.

  ## 8. Governance & Review
     Restate the compliance officer's accountability. Confirm review
     cadence (at minimum annual, plus on material change as required
     by the NFIU framework). State the assessment date and the next
     scheduled review date (assessment_date + 12 months).

  ## 9. Sign-off
     Compliance Officer: <compliance_officer_name>
     Date: <assessment_date>

  ## Disclaimer
     (Standard Klarify disclaimer — see output instructions.)

Tone: professional, factual, plain Nigerian English. No regulatory jargon
without a one-sentence definition. No legal admissions. No statements
that the business "complies" with anything — describe controls and let
the regulator draw conclusions.`,
  outputInstructions: STANDARD_OUTPUT_INSTRUCTIONS,
};
