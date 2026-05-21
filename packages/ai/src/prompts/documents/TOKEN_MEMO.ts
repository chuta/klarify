import type { DocumentTemplate } from './types.js';
import { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/**
 * Token Classification Legal Memo template.
 * CLAUDE.md §14 — regulatory basis: ISA 2025, SEC Rules.
 */
export const TOKEN_MEMO_TEMPLATE: DocumentTemplate = {
  templateId: 'TOKEN_MEMO',
  documentName: 'Token Classification Legal Memo',
  regulatoryBasis: 'ISA 2025, SEC Rules',
  category: 'LICENSING',
  requiredFields: [
    {
      key: 'company_name',
      label: 'Issuing company name',
      type: 'text',
      required: true,
      helpText: 'The full registered name of the issuer.',
      prefilledFrom: 'org.name',
    },
    {
      key: 'token_name',
      label: 'Token name',
      type: 'text',
      required: true,
      helpText: 'The proposed name of the token (e.g. "ABC Token").',
    },
    {
      key: 'token_symbol',
      label: 'Token symbol',
      type: 'text',
      required: true,
      helpText: 'The proposed ticker (e.g. "ABC").',
    },
    {
      key: 'blockchain',
      label: 'Blockchain platform',
      type: 'select',
      required: true,
      helpText: 'Which chain the token will be issued on.',
      options: [
        'Ethereum',
        'BNB Chain',
        'Polygon',
        'Tron',
        'Solana',
        'Stellar',
        'Other EVM',
        'Other non-EVM',
      ],
    },
    {
      key: 'token_purpose',
      label: 'Plain-language purpose of the token',
      type: 'textarea',
      required: true,
      helpText:
        'What does the token actually DO? Who uses it, how, and why? Be specific — utility, governance, payment, revenue-share, etc.',
    },
    {
      key: 'economic_rights',
      label: 'Economic rights attached to the token',
      type: 'multiselect',
      required: true,
      helpText:
        'Select every economic right holders enjoy. CRITICAL — drives the securities analysis under ISA 2025.',
      options: [
        'PROFIT_SHARE',
        'REVENUE_SHARE',
        'BUYBACK_BURN',
        'STAKING_YIELD',
        'DIVIDEND',
        'INTEREST',
        'EQUITY_OR_OWNERSHIP',
        'NONE',
      ],
    },
    {
      key: 'governance_rights',
      label: 'Governance rights attached to the token',
      type: 'multiselect',
      required: true,
      helpText: 'Pick all that apply.',
      options: ['VOTING', 'PROPOSAL_RIGHTS', 'COUNCIL_ELECTION', 'NONE'],
    },
    {
      key: 'consumptive_utility',
      label: 'Consumptive utility',
      type: 'textarea',
      required: true,
      helpText:
        'If the token is used to access a service or pay platform fees, describe how. Write "None" if not consumptive.',
    },
    {
      key: 'distribution_mechanism',
      label: 'Distribution mechanism',
      type: 'select',
      required: true,
      helpText: 'How the token will reach holders.',
      options: [
        'PUBLIC_SALE',
        'PRIVATE_SALE',
        'AIRDROP',
        'MINING_OR_STAKING',
        'IEO',
        'HYBRID',
      ],
    },
    {
      key: 'target_markets',
      label: 'Target markets for sale / distribution',
      type: 'multiselect',
      required: true,
      helpText: 'Where buyers will be onboarded from.',
      options: ['NG', 'GH', 'KE', 'ZA', 'MU', 'OTHER'],
      prefilledFrom: 'profile.targetMarkets',
    },
    {
      key: 'memo_date',
      label: 'Memo date',
      type: 'date',
      required: true,
      helpText: 'Date the memo is being prepared.',
      prefilledFrom: 'today',
    },
  ],
  systemPrompt: `You are generating a Token Classification Legal Memo for a Nigerian token
issuer. The memo's purpose is to assess whether the proposed token is a
"digital asset" / security / investment contract under the Investments
and Securities Act 2025 (ISA 2025) and the SEC Nigeria Digital Asset
Rules (2022, 2024, 2025 amendments).

This is NOT a legal opinion — Klarify cannot provide legal advice. The
memo is a structured, internal regulatory analysis to support
discussion with retained counsel. State that clearly in the opening
paragraph.

CRITICAL ANALYTICAL RULES:
* Classify by function, not by label. A "utility token" that carries
  economic-return rights IS a security under ISA 2025.
* If economic_rights includes ANY of [PROFIT_SHARE, REVENUE_SHARE,
  BUYBACK_BURN, STAKING_YIELD, DIVIDEND, INTEREST, EQUITY_OR_OWNERSHIP],
  the token is HIGH RISK of being a security.
* If governance_rights are robust AND there is no consumptive utility,
  the token may also be a security.
* If the token is purely consumptive utility (gas-like) with NO
  economic return rights, it is more likely a non-security utility token
  — but cite SEC's ability to reclassify on a case-by-case basis.

Required document structure:

  ## 1. Executive Summary
     2–3 sentences stating the issuer, token, and the preliminary
     classification (likely security / likely non-security utility /
     mixed/hybrid — needs counsel review).

  ## 2. Scope and Limitations
     State explicitly: this memo is regulatory information, not legal
     advice. The classification must be confirmed with retained counsel
     before issuance. The SEC retains discretion to reclassify any
     digital asset on a case-by-case basis.

  ## 3. Token Description
     Restate every supplied field: issuer (<company_name>), name
     (<token_name>), symbol (<token_symbol>), blockchain
     (<blockchain>), purpose, distribution mechanism, target markets.

  ## 4. Applicable Regulatory Framework
     Cite:
       * ISA 2025, Section 357 — digital assets are classified as
         securities (general rule).
       * ISA 2025, Section [cite carefully — Klarify is not certain of
         the exact provision; if uncertain, cite the Act + "investment
         contract" definition and recommend counsel verify].
       * SEC Digital Asset Rules 2024 (latest enacted version) —
         DAX/DAOP/DAC/DAI categories and issuer obligations.
       * SEC Digital Asset Rules 2022 — original framework.
       * FATF Recommendation 15 — VASP scope.

  ## 5. Functional Analysis
     For EACH of these dimensions, analyse in plain English:
     ### 5.1 Economic Rights
         List every selected economic_right. For each, explain why it
         points toward (or away from) security classification.
     ### 5.2 Governance Rights
         Same treatment.
     ### 5.3 Consumptive Utility
         Restate the supplied consumptive_utility. Assess whether the
         utility is real and necessary to use the platform, or
         secondary to economic returns.
     ### 5.4 Distribution Mechanism
         A PUBLIC_SALE for capital-raising purposes strongly suggests
         a securities offering. AIRDROP for marketing may not, unless
         tied to investor expectation of return.

  ## 6. Preliminary Classification
     ### 6.1 Primary classification
         One of: SECURITY (likely DAOP under SEC Rules) / NON-SECURITY
         UTILITY (cite consumptive-only nature) / HYBRID (security
         features dominate; treat as security).
     ### 6.2 Reasoning
         3–5 sentences walking through the Functional Analysis.
     ### 6.3 Required SEC interaction
         If SECURITY or HYBRID: registration as a DAOP under SEC
         Digital Asset Rules 2024 is required. Cite the ARIP framework
         (June 2024) as the pathway. If NON-SECURITY UTILITY:
         no SEC registration strictly required, but issuer should
         consider a no-action / classification request to SEC.

  ## 7. Cross-Border Considerations
     For each target market other than NG, list the local equivalent
     framework (Ghana VASP Act 2025, Kenya VASP Act 2025, Mauritius
     VAITOS Act 2021, South Africa CASP/FSCA framework). Note any
     additional registration burden.

  ## 8. Risks of Misclassification
     Cite ISA 2025 enforcement powers. Cite NTAA 2025 for tax
     implications. State the consequence of operating an unregistered
     securities offering: regulatory action, asset freeze, criminal
     liability under MLPPA 2022 Section 18 (if the proceeds are
     deemed unlawful).

  ## 9. Recommended Next Steps
     1. Engage retained Nigerian regulatory counsel to verify this
        analysis.
     2. If classified as a security, prepare an ARIP application via
        a registered solicitor or adviser (ARIP Framework, Section 16).
     3. Draft a White Paper consistent with SEC Digital Asset Rules.
     4. Engage SEC Innovation Office (innovation@sec.gov.ng,
        fintech@sec.gov.ng — open Tuesdays and Thursdays, 10am–2pm).

  ## 10. Sign-off
      Prepared on <memo_date> for internal use by <company_name>.

  ## Disclaimer
      (Standard Klarify disclaimer — see output instructions.)`,
  outputInstructions: STANDARD_OUTPUT_INSTRUCTIONS,
};
