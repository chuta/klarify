import type { DocumentTemplate } from './types.js';
import { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/**
 * ARIP Entity Rules and Governance template — Sprint 5 S5-E1.
 * Regulatory basis: SEC Nigeria ARIP Framework (June 2024), Section 15(c).
 * Required plan: Compass+ (Compass or Flagship).
 *
 * Covers all 8 mandatory provisions of Section 15(c)(i-viii):
 * (i) Membership criteria, (ii) Prohibited activities,
 * (iii) Fee schedule, (iv) Member reporting rights,
 * (v) Suspension grounds, (vi) Expulsion grounds,
 * (vii) Appeals process, (viii) Amendment procedure.
 */
export const ARIP_ENTITY_RULES_TEMPLATE: DocumentTemplate = {
  templateId: 'ARIP_ENTITY_RULES',
  documentName: 'Entity Rules & Governance — ARIP',
  regulatoryBasis: 'SEC Nigeria ARIP Framework (June 2024), Section 15(c)',
  category: 'ARIP_FRAMEWORK',
  requiredPlan: 'compass',
  requiredFields: [
    {
      key: 'company_name',
      label: 'Company name',
      type: 'text',
      required: true,
      helpText: 'Full registered company name as on your CAC certificate.',
      prefilledFrom: 'org.name',
    },
    {
      key: 'platform_name',
      label: 'Platform / product name',
      type: 'text',
      required: true,
      helpText: 'The trading name of the platform or product (may differ from company name).',
    },
    {
      key: 'platform_description',
      label: 'Platform description',
      type: 'textarea',
      required: true,
      helpText:
        'Describe what the platform does, the types of digital assets it handles, and the core ' +
        'services it provides to users. This forms the context for all the rules below.',
    },
    {
      key: 'user_types',
      label: 'User types',
      type: 'select',
      required: true,
      helpText: 'Select who will be permitted to access and use the platform.',
      options: [
        'Retail investors only',
        'Institutional investors only',
        'Both retail and institutional investors',
      ],
    },
    {
      key: 'membership_criteria',
      label: 'Membership / participation criteria',
      type: 'textarea',
      required: true,
      helpText:
        'What criteria must users meet to access the platform? Include: minimum age, Nigerian residency ' +
        'requirement, KYC tier thresholds, identity verification requirements, ' +
        'restricted persons (PEPs, sanctioned persons, minors), and any suitability requirements.',
    },
    {
      key: 'prohibited_activities',
      label: 'Prohibited activities',
      type: 'textarea',
      required: true,
      helpText:
        'List specific activities that users are prohibited from engaging in on the platform. ' +
        'Include: market manipulation, wash trading, front-running, money laundering, ' +
        'use of platform for unlawful purposes, misrepresentation, and any platform-specific restrictions.',
    },
    {
      key: 'suspension_criteria',
      label: 'Grounds for account suspension',
      type: 'textarea',
      required: true,
      helpText:
        'List specific grounds that would lead to account suspension (temporary restriction). ' +
        'Examples: suspicious AML activity, policy violations, failed KYC re-verification, ' +
        'outstanding complaint under investigation, regulatory direction.',
    },
    {
      key: 'expulsion_criteria',
      label: 'Grounds for account termination / expulsion',
      type: 'textarea',
      required: true,
      helpText:
        'List grounds for permanent termination of access to the platform. ' +
        'Examples: criminal conviction, confirmed fraud, confirmed AML breach, ' +
        'severe or repeated regulatory violations, regulatory direction to close account.',
    },
    {
      key: 'appeals_process',
      label: 'Appeals process',
      type: 'textarea',
      required: true,
      helpText:
        'Describe the step-by-step process a user can follow to appeal a suspension or expulsion. ' +
        'Include: how to submit an appeal, timelines for internal review, ' +
        'who reviews the appeal, and what outcomes are possible.',
    },
    {
      key: 'dispute_resolution',
      label: 'Dispute resolution mechanism',
      type: 'textarea',
      required: true,
      helpText:
        'How are user disputes and complaints resolved? Include: complaint submission channels, ' +
        'acknowledgement timeline, investigation and resolution timeline, ' +
        'escalation path (senior management, board), and external referral options.',
    },
    {
      key: 'fee_schedule',
      label: 'Fee schedule and charges',
      type: 'textarea',
      required: true,
      helpText:
        'List all fees charged to users: trading/exchange fees, withdrawal fees, custody fees, ' +
        'account maintenance fees, conversion fees, etc. Include: amount or basis of calculation, ' +
        'when charged, and how fees are disclosed to users before transactions.',
    },
    {
      key: 'reporting_to_users',
      label: 'User reporting obligations',
      type: 'textarea',
      required: true,
      helpText:
        'What reports, statements, and confirmations do you provide to users? ' +
        'Include: transaction confirmations, monthly or periodic account statements, ' +
        'tax-related documents, and access to transaction history. Specify frequency and format.',
    },
    {
      key: 'effective_date',
      label: 'Effective date',
      type: 'date',
      required: true,
      helpText: 'Date these Entity Rules come into effect.',
      prefilledFrom: 'today',
    },
  ],
  systemPrompt: `You are generating Entity Rules and Governance Framework for submission to the Securities and Exchange Commission Nigeria under the ARIP Framework (June 2024), Section 15(c).

This document establishes the legally binding rules governing the relationship between [Company Name] (operating as [Platform Name]) and all users of the platform. It must comprehensively cover ALL 8 mandatory provisions from Section 15(c)(i-viii) of the ARIP Framework.

Generate the complete Entity Rules document using the following structure:

---

# ENTITY RULES AND GOVERNANCE FRAMEWORK

**[Company Name]**
*(Operating the [Platform Name] platform)*

**SEC Nigeria ARIP Framework (June 2024) — Section 15(c) Compliant Entity Rules**

**Version 1.0 | Effective Date: [Effective Date]**

---

## PREAMBLE

[Company Name] ("the Company") is incorporated under the Companies and Allied Matters Act 2020 in the Federal Republic of Nigeria. The Company operates [Platform Name] ("the Platform"), [Platform Description — describe what the platform does and the digital assets it handles].

These Entity Rules ("the Rules") govern the relationship between the Company and all users of the Platform ("Members"). These Rules are issued pursuant to and in compliance with Section 15(c) of the ARIP Framework published by the Securities and Exchange Commission Nigeria ("SEC Nigeria") in June 2024, as a condition of the Company's Accelerated Regulatory Incubation Programme (ARIP) application.

All Members are bound by these Rules from the date of their acceptance of the Platform's Terms of Service. These Rules form part of the agreement between the Company and each Member.

---

## SECTION 1: MEMBERSHIP AND PARTICIPATION CRITERIA
*[Section 15(c)(i) of the ARIP Framework]*

**1.1 Eligibility Requirements**

To access and use the Platform, all Members must meet the following eligibility criteria:

[Expand the membership_criteria into specific, numbered requirements covering:]
- Minimum age: 18 years and above
- Nigerian residency or citizenship requirements (if applicable)
- KYC requirements: Tier 1, Tier 2, Tier 3 criteria and corresponding access levels
- Identity verification: NIN and BVN verification mandatory for all Members
- Suitability assessment requirements (if applicable)

**1.2 Restricted Persons**

The following persons are NOT eligible to become or remain Members:
- Politically Exposed Persons (PEPs) who have not completed Enhanced Due Diligence
- Persons subject to UN, OFAC, EU, or Nigerian government sanctions
- Persons under 18 years of age
- Non-natural persons without appropriate corporate KYC documentation
- Persons previously expelled from the Platform
- Any other category specified in the Company's AML/CFT Policy

**1.3 AIP Period Restrictions**

During the ARIP AIP period, the total number of Members shall not exceed fifty (50) at any time, as required by Section 29 of the ARIP Framework. The Company will maintain a waiting list for prospective Members during the AIP period.

**1.4 KYC Tiers and Access Levels**

[Describe the tiered KYC framework applicable to the platform, including what each tier permits in terms of transaction limits and services]

---

## SECTION 2: PROHIBITED ACTIVITIES
*[Section 15(c)(ii) of the ARIP Framework]*

**2.1 Prohibited Activities**

Members are strictly prohibited from engaging in any of the following activities on the Platform:

[Expand the prohibited_activities into a numbered list including:]
1. Market manipulation of any kind, including wash trading, spoofing, layering, or any form of artificial price inflation or deflation
2. Insider trading or use of material non-public information
3. Any activity constituting money laundering, terrorist financing, or proliferation financing under MLPPA 2022 and the Terrorism (Prevention and Prohibition) Act 2022
4. Providing false, misleading, or fraudulent information during onboarding or at any time during the membership relationship
5. Circumventing KYC or AML controls
6. Using the Platform for purposes prohibited under Nigerian law
7. Any other specific prohibitions based on the platform_description

**2.2 Consequences**

Breach of any prohibition in Section 2.1 may result in immediate account suspension, account termination, reversal of transactions, and referral to the Nigerian Financial Intelligence Unit (NFIU), the Economic and Financial Crimes Commission (EFCC), or other relevant law enforcement authorities.

---

## SECTION 3: FEE SCHEDULE AND CHARGES
*[Section 15(c)(iii) of the ARIP Framework]*

**3.1 Applicable Fees**

[Expand the fee_schedule into a structured fee table covering all fee types:]

| Fee Type | Rate / Amount | When Charged | Notes |
|---|---|---|---|
[Generate appropriate rows based on the fee_schedule provided]

**3.2 Fee Disclosure**

All applicable fees are disclosed to Members:
- Before the execution of any transaction (pre-trade disclosure)
- In the transaction confirmation sent to the Member immediately after each transaction
- In the monthly account statement provided to each Member

**3.3 Fee Changes**

The Company will provide a minimum of thirty (30) days' advance written notice to all affected Members before implementing any increase in fees or introduction of new fee types.

---

## SECTION 4: MEMBER RIGHTS AND REPORTING
*[Section 15(c)(iv) of the ARIP Framework]*

**4.1 Transaction Confirmations**

[Expand the reporting_to_users section]

Members will receive:
- Immediate transaction confirmation for every completed transaction, delivered via [email/in-app notification/SMS]
- Details included in each confirmation: transaction reference, asset type, quantity, price, total value, fees charged, and timestamp

**4.2 Account Statements**

Members will receive [frequency] account statements containing:
- Complete transaction history for the period
- Opening and closing balances
- All fees charged during the period
- Tax-related information where applicable

**4.3 Right to Information**

Members have the right to:
- Access their complete transaction history at any time through the Platform
- Request a statement of all fees charged in any given period
- Receive a copy of these Entity Rules and all amendments

**4.4 Privacy and Data Protection Rights**

In compliance with the Nigeria Data Protection Act 2023 (NDPA 2023), Members have the right to:
- Access their personal data held by the Company
- Request correction of inaccurate personal data
- Request deletion of their personal data (subject to regulatory retention requirements under MLPPA 2022)
- Data portability for their transaction data
- Lodge a complaint with the National Data Protection Commission (NDPC)

---

## SECTION 5: GROUNDS FOR ACCOUNT SUSPENSION
*[Section 15(c)(v) of the ARIP Framework]*

**5.1 Grounds for Suspension**

The Company may suspend a Member's account temporarily in the following circumstances:

[Expand the suspension_criteria into numbered specific grounds:]
1. [Specific suspension grounds from the form data]
2. Pending investigation of a suspicious activity report filed with the NFIU under MLPPA 2022
3. Failure to complete KYC re-verification within the required timeframe
4. Direction from SEC Nigeria, NFIU, or other competent authority
5. Reasonable grounds to suspect fraudulent activity on the account
6. Technical security breach affecting the Member's account

**5.2 Suspension Procedure**

Upon deciding to suspend an account, the Company shall:
1. Immediately restrict all trading and withdrawal activities
2. Notify the Member in writing within 24 hours (unless prohibited by law or regulatory direction)
3. State the grounds for suspension and the expected duration
4. Initiate an investigation within 3 business days

**5.3 Duration and Review**

Suspensions shall be reviewed within 10 business days. If the matter is resolved in the Member's favour, restrictions shall be lifted promptly. If unresolved, the account may be extended suspension pending further investigation.

---

## SECTION 6: GROUNDS FOR ACCOUNT TERMINATION / EXPULSION
*[Section 15(c)(vi) of the ARIP Framework]*

**6.1 Grounds for Expulsion**

The Company may permanently terminate a Member's account in the following circumstances:

[Expand the expulsion_criteria into numbered specific grounds:]
1. [Specific expulsion grounds from the form data]
2. Confirmed engagement in money laundering or financial crime
3. Criminal conviction relevant to financial services or digital assets
4. Repeated or severe breaches of these Entity Rules
5. Direction from SEC Nigeria, NFIU, EFCC, or court order
6. Provision of materially false or fraudulent information during onboarding

**6.2 Expulsion Procedure**

The Company shall:
1. Provide 10 business days' written notice of proposed expulsion, except where immediate termination is required by law or regulatory direction
2. Allow the Member to respond to the proposed expulsion during the notice period
3. Review any response before making a final decision
4. Notify the Member of the final decision in writing

**6.3 Asset Withdrawal Rights on Expulsion**

Upon expulsion, the Member shall have 30 days to withdraw all digital assets and fiat balances to their designated external wallet/account, subject to any legal or regulatory restrictions (including AML/CFT holds) that may apply. After 30 days, unclaimed assets shall be handled in accordance with the Company's dormant account procedure.

**6.4 Regulatory Reporting**

The Company will file a Suspicious Activity Report with the NFIU and notify SEC Nigeria where an expulsion results from or relates to suspected financial crime, as required by MLPPA 2022.

---

## SECTION 7: APPEALS PROCESS
*[Section 15(c)(vii) of the ARIP Framework]*

**7.1 Right to Appeal**

Any Member subject to account suspension or expulsion has the right to appeal the Company's decision.

**7.2 Step-by-Step Appeal Procedure**

[Expand the appeals_process into a structured procedure:]

**Step 1 — Internal Appeal to Compliance Officer (5 business days)**
- The Member submits a written appeal to compliance@[platform.domain] within 10 business days of the suspension/expulsion notification
- The appeal must state the grounds for appeal and include any supporting evidence
- The Compliance Officer reviews the appeal and responds in writing within 5 business days of receipt

**Step 2 — Board Review Panel (10 business days)**
- If the Member is unsatisfied with the Compliance Officer's decision, they may escalate to the Board Review Panel within 5 business days of the Compliance Officer's response
- The Board Review Panel consists of at least 2 directors not involved in the original decision
- The Panel responds in writing within 10 business days

**Step 3 — External Dispute Resolution / SEC Nigeria Referral**
- If the Member remains unsatisfied after Step 2, they may refer the matter to SEC Nigeria's Consumer Protection Department or seek independent dispute resolution
- The Company will cooperate fully with any SEC Nigeria or external dispute resolution process

**7.3 Appeal Outcomes**

Possible outcomes are:
- Decision upheld (suspension/expulsion confirmed)
- Decision partially overturned (modified outcome)
- Decision reversed (suspension lifted or expulsion revoked)

All appeal outcomes are communicated in writing within 5 business days of the final decision.

---

## SECTION 8: AMENDMENT AND NOTIFICATION PROCEDURE
*[Section 15(c)(viii) of the ARIP Framework]*

**8.1 Company's Right to Amend**

The Company reserves the right to amend these Entity Rules from time to time to reflect changes in applicable law, regulatory requirements, operational changes, or risk management requirements.

**8.2 Notice of Material Amendments**

For any material amendment to these Entity Rules (including changes to fees, membership criteria, prohibited activities, or suspension/expulsion grounds), the Company shall:
1. Provide a minimum of thirty (30) days' advance written notice to all Members
2. Clearly explain the nature of the changes and why they are being made
3. Provide a copy of the amended Rules

**8.3 Member Consent for Material Amendments**

Where a material amendment would adversely affect Members' rights, the Company shall obtain Members' express consent before the amendment takes effect. Members who do not consent within the notice period may close their accounts without penalty.

**8.4 Notification to SEC Nigeria**

The Company shall notify SEC Nigeria of any material amendments to these Entity Rules within 5 business days of the amendment taking effect, in accordance with the Company's ARIP reporting obligations.

---

## DISPUTE RESOLUTION

[Expand the dispute_resolution into a complete procedure]

Members who have a complaint or dispute should follow this procedure:
1. **First contact:** Submit a formal complaint via [complaints channel] stating the nature of the complaint and the outcome sought
2. **Acknowledgement:** The Company will acknowledge all complaints within 24 hours
3. **Resolution target:** The Company aims to resolve all complaints within 10 business days; complex matters may take up to 30 business days with the Member notified at each stage
4. **Escalation:** Unresolved complaints may be escalated as described in Section 7 above
5. **External referral:** Members may also contact SEC Nigeria's Consumer and Investor Protection Department at [sec.gov.ng]

---

## GOVERNING LAW AND JURISDICTION

These Entity Rules are governed by the laws of the Federal Republic of Nigeria. Any dispute arising from or in connection with these Rules that cannot be resolved by the internal process above shall be subject to the jurisdiction of the competent courts of the Federal Republic of Nigeria.

---

## EFFECTIVE DATE AND REVIEW

These Entity Rules are effective from [Effective Date].

These Rules will be reviewed:
- Annually, as part of the Company's regulatory compliance review
- Immediately upon any change in applicable Nigerian law or SEC Nigeria rules
- At the direction of SEC Nigeria

The Company shall provide Members with the current version of these Rules on request and will publish any amendments as described in Section 8.

---

## Disclaimer

These Entity Rules were drafted with AI assistance using Klarify. They must be reviewed by a qualified Nigerian digital asset regulatory practitioner before adoption and before being presented to users. These Rules are regulatory information, not legal advice. Consult a qualified solicitor before submission to SEC Nigeria as part of the ARIP application. The ARIP application MUST be filed through a registered solicitor or adviser under Section 16 of the ARIP Framework.`,
  outputInstructions: STANDARD_OUTPUT_INSTRUCTIONS,
};
