import type { DocumentTemplate } from './types.js';
import { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/**
 * KYC Tiering Framework template.
 * CLAUDE.md §14 — regulatory basis: NFIU Guidelines.
 */
export const KYC_TIERS_TEMPLATE: DocumentTemplate = {
  templateId: 'KYC_TIERS',
  documentName: 'KYC Tiering Framework',
  regulatoryBasis: 'NFIU Guidelines',
  category: 'KYC',
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
      label: 'Products this framework covers',
      type: 'multiselect',
      required: true,
      helpText: 'Select all that apply.',
      options: ['DAX', 'DAOP', 'DAC', 'DAI', 'PAYMENT', 'STABLECOIN', 'OTHER'],
      prefilledFrom: 'profile.productTypes',
    },
    {
      key: 'customer_types',
      label: 'Customer segments served',
      type: 'multiselect',
      required: true,
      helpText:
        'Pick every segment you onboard or plan to onboard. Drives the tiered KYC matrix.',
      options: [
        'NIGERIAN_RETAIL',
        'NIGERIAN_BUSINESS',
        'CROSS_BORDER_RETAIL',
        'CROSS_BORDER_BUSINESS',
        'INSTITUTIONAL',
        'HIGH_NET_WORTH',
      ],
    },
    {
      key: 'tier1_daily_limit_ngn',
      label: 'Tier 1 daily transaction cap (NGN)',
      type: 'text',
      required: true,
      helpText:
        'Cap for the lightest onboarding tier — typically NGN 50,000. Use plain numbers (e.g. "50000").',
    },
    {
      key: 'tier2_daily_limit_ngn',
      label: 'Tier 2 daily transaction cap (NGN)',
      type: 'text',
      required: true,
      helpText: 'Mid-tier cap. Typically NGN 200,000–500,000.',
    },
    {
      key: 'tier3_daily_limit_ngn',
      label: 'Tier 3 daily transaction cap (NGN)',
      type: 'text',
      required: true,
      helpText: 'Full-KYC tier cap. Often unlimited per day; state as "Unlimited" if so.',
    },
    {
      key: 'nin_verification_provider',
      label: 'NIN verification provider',
      type: 'text',
      required: true,
      helpText:
        'NIMC integration vendor (e.g. "Smile Identity", "Dojah", "Verified.Africa", direct NIMC API).',
    },
    {
      key: 'bvn_verification_provider',
      label: 'BVN verification provider',
      type: 'text',
      required: true,
      helpText: 'NIBSS / BVN data provider used to verify customer BVNs.',
    },
    {
      key: 'edd_triggers',
      label: 'EDD trigger criteria',
      type: 'textarea',
      required: true,
      helpText:
        'Briefly list the conditions that escalate a customer to Enhanced Due Diligence (e.g. PEP match, sanctions hit, single transaction > NGN 5m, high-risk jurisdiction).',
    },
    {
      key: 'compliance_officer_name',
      label: 'Compliance officer owner',
      type: 'text',
      required: true,
      helpText: 'Owner of this framework.',
      prefilledFrom: 'user.name',
    },
    {
      key: 'effective_date',
      label: 'Effective date',
      type: 'date',
      required: true,
      helpText: 'Date the framework comes into force.',
      prefilledFrom: 'today',
    },
  ],
  systemPrompt: `You are generating a KYC Tiering Framework for a Nigerian VASP / fintech.
Anchor the framework in:
  * NFIU Guidelines — specifically the NFIU AML/CFT Compliance Framework
    for VASPs (December 2024).
  * CBN KYC Tiered Regulations (3-tier model: Tier 1 / Tier 2 / Tier 3).
  * MLPPA 2022 (record-keeping + CDD obligations).
  * FATF Recommendation 10 (Customer Due Diligence).

The 3-tier model is canonical for Nigerian regulated entities. Use the
user-supplied caps verbatim. If the supplied caps are obviously
malformed (e.g. blank, non-numeric where a number is expected), use
sensible defaults: T1 NGN 50,000 / T2 NGN 200,000 / T3 Unlimited.

Required document structure:

  ## 1. Purpose
     Why the tiered model exists, who it applies to.

  ## 2. Regulatory Basis
     Cite NFIU framework, CBN KYC Tiered Regulations, MLPPA 2022
     Section 4 (CDD obligations) and Section 14 (PEP/EDD). Cite FATF
     Recommendation 10.

  ## 3. Tier 1 — Light KYC
     ### Customer scope
     ### Information collected (must include: legal name, phone, NIN —
         cite NIMC Act 2007).
     ### Verification method (cite the supplied NIN provider).
     ### Transaction limits (daily cap: NGN <tier1_daily_limit_ngn>).
     ### Permitted activities.
     ### Restrictions (e.g. no cross-border, no high-risk asset trading).

  ## 4. Tier 2 — Standard KYC
     ### Customer scope
     ### Additional information (BVN, residential address, source of funds
         declaration).
     ### Verification method (cite the supplied BVN provider).
     ### Transaction limits (daily cap: NGN <tier2_daily_limit_ngn>).
     ### Permitted activities.

  ## 5. Tier 3 — Full KYC
     ### Customer scope (institutional, HNW, cross-border, high-volume).
     ### Documentary requirements (passport / government-issued photo ID,
         proof of address < 90 days, tax ID, source of funds and source
         of wealth evidence).
     ### Beneficial ownership identification — for legal-entity customers,
         cite CAMA 2020 + the beneficial ownership register requirement.
     ### Verification (manual review + provider validation).
     ### Transaction limits (daily cap: <tier3_daily_limit_ngn>).
     ### Permitted activities (typically unrestricted, subject to
         transaction monitoring).

  ## 6. Tier Matrix
     A markdown table with columns: | Tier | Information | Verification |
     Daily cap | Restrictions |. One row per tier with concise data.

  ## 7. Enhanced Due Diligence (EDD)
     Restate the user-supplied trigger criteria. Add the standard
     triggers from the NFIU framework: PEP, sanctions hit, high-risk
     jurisdiction, structuring patterns. Describe the additional
     procedures (senior management approval, source-of-wealth
     verification, ongoing enhanced monitoring).

  ## 8. Ongoing Monitoring
     Periodic refresh cadence per tier. Trigger-based refresh (large
     transaction, change of profile, regulatory development).

  ## 9. Customer Risk Rating
     Map customer attributes to a Low / Medium / High risk rating that
     overlays the tiers. High-risk customers receive tier-equivalent
     scrutiny PLUS EDD regardless of nominal tier.

  ## 10. Governance
      <compliance_officer_name> owns the framework. Annual review or
      ad-hoc on regulatory change. Effective from <effective_date>.

  ## Disclaimer
      (Standard Klarify disclaimer — see output instructions.)`,
  outputInstructions: STANDARD_OUTPUT_INSTRUCTIONS,
};
