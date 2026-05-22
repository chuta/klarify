import type { DocumentTemplate } from './types.js';
import { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/**
 * ARIP Operational Plan template — Sprint 5 S5-E1.
 * Regulatory basis: SEC Nigeria ARIP Framework (June 2024), Sections 15(b) and 36.
 * Required plan: Compass+ (Compass or Flagship).
 */
export const ARIP_OPERATIONAL_PLAN_TEMPLATE: DocumentTemplate = {
  templateId: 'ARIP_OPERATIONAL_PLAN',
  documentName: 'ARIP Operational Plan',
  regulatoryBasis: 'SEC Nigeria ARIP Framework (June 2024), Sections 15(b) and 36',
  category: 'ARIP_FRAMEWORK',
  requiredPlan: 'compass',
  requiredFields: [
    {
      key: 'company_name',
      label: 'Company name',
      type: 'text',
      required: true,
      helpText: 'Full registered name as on your CAC certificate.',
      prefilledFrom: 'org.name',
    },
    {
      key: 'product_description',
      label: 'Product / service description',
      type: 'textarea',
      required: true,
      helpText:
        'Describe what your platform does, how it operates, and the digital assets involved. ' +
        'Be specific — SEC Nigeria reviewers must understand the product fully.',
    },
    {
      key: 'technology_stack',
      label: 'Technology stack and infrastructure',
      type: 'textarea',
      required: true,
      helpText:
        'Describe your technical architecture: cloud hosting, blockchain integration, ' +
        'security controls, custody architecture (hot/cold split), and key technology partners.',
    },
    {
      key: 'target_customer_profile',
      label: 'Target customer profile',
      type: 'textarea',
      required: true,
      helpText:
        'Describe your target customers — retail investors, institutional, or both. ' +
        'Include onboarding criteria, residency requirements, and expected customer count during AIP.',
    },
    {
      key: 'key_risks',
      label: 'Key risk areas',
      type: 'multiselect',
      required: true,
      helpText:
        'Select all risk types relevant to your product. The operational plan will ' +
        'address each one with specific controls and mitigations.',
      options: [
        'AML/CFT risk',
        'Fraud risk',
        'Cyber/IT risk',
        'Market risk',
        'Operational risk',
        'Legal/regulatory risk',
        'Reputational risk',
        'Liquidity risk',
      ],
    },
    {
      key: 'risk_mitigations',
      label: 'Risk mitigation measures',
      type: 'textarea',
      required: true,
      helpText:
        'For each risk selected above, describe specific controls, limits, and monitoring ' +
        'processes in place. Include transaction limits, alert thresholds, and escalation procedures.',
    },
    {
      key: 'insurance_cover',
      label: 'Insurance cover details',
      type: 'textarea',
      required: true,
      helpText:
        'Describe your fidelity bond coverage (ARIP Framework requires minimum 25%), ' +
        'professional indemnity insurance, cyber insurance, and any other relevant cover. ' +
        'Include insurer names and coverage amounts where known.',
    },
    {
      key: 'investor_protection',
      label: 'Investor / customer protection measures',
      type: 'textarea',
      required: true,
      helpText:
        'How do you protect customer assets, funds, and data? Include: asset segregation ' +
        'arrangements, custody architecture, complaints handling procedure, dispute resolution, ' +
        'and client money protection mechanisms.',
    },
    {
      key: 'data_protection',
      label: 'Data protection measures',
      type: 'textarea',
      required: true,
      helpText:
        'Describe your Nigeria Data Protection Act 2023 (NDPA) compliance measures: ' +
        'data storage and jurisdiction, retention periods, breach response procedures, ' +
        'and data subject rights handling.',
    },
    {
      key: 'customer_communication',
      label: 'Customer communication strategy',
      type: 'textarea',
      required: true,
      helpText:
        'How will you communicate material changes, incidents, and operational updates to ' +
        'customers during the ARIP period? Include channels, timelines, and approval procedures.',
    },
    {
      key: 'risk_disclosure_plan',
      label: 'Customer risk disclosure plan',
      type: 'textarea',
      required: true,
      helpText:
        'How do you disclose digital asset risks to customers before onboarding and on an ' +
        'ongoing basis? Include risk warnings, suitability assessments, and disclosure documentation.',
    },
    {
      key: 'exit_plan',
      label: 'Exit plan (MANDATORY — Section 36)',
      type: 'textarea',
      required: true,
      helpText:
        'REQUIRED by Section 36 of the ARIP Framework. Describe the detailed plan for ' +
        'fulfilling all customer obligations if full registration is not achieved after the ARIP ' +
        'period. Must cover: asset return procedures and timeline, customer notification plan, ' +
        'data deletion and portability, regulatory notification requirements, and third-party ' +
        'obligations (custodians, banking partners). This section cannot be left blank.',
    },
    {
      key: 'plan_date',
      label: 'Operational plan date',
      type: 'date',
      required: true,
      helpText: 'Date this operational plan is being prepared.',
      prefilledFrom: 'today',
    },
  ],
  systemPrompt: `You are generating an ARIP Operational Plan for submission to the Securities and Exchange Commission Nigeria under the ARIP Framework (June 2024), Sections 15(b) and 36.

This document will be reviewed by the SEC Nigeria Digital Assets and Fintech Unit as part of a formal ARIP application. It must be professional, precise, and demonstrate that the applicant has thoroughly considered every operational dimension of their business.

Generate a comprehensive ARIP Operational Plan using the following structure:

## 1. Executive Summary

Provide a 2-paragraph executive summary:
- Paragraph 1: Overview of the company, product, and the licence category being sought under the ARIP Framework.
- Paragraph 2: Summary of the key operational commitments being made during the AIP period, and the applicant's readiness for full registration.

## 2. Business Overview

### 2.1 Company Details
Describe the company's incorporation status (CAMA 2020), registered address, beneficial ownership structure, and the CAC registration details.

### 2.2 Product Description
Provide a detailed description of the product or service, the digital assets involved, the platform's operational model, and how revenue is generated.

### 2.3 Technology Infrastructure
Detail the technical architecture. Cover: cloud hosting and jurisdiction, blockchain integration (consensus mechanism, smart contracts), custody architecture (hot/cold wallet split, multi-signature arrangements), security controls (penetration testing, ISO 27001, SOC2), KYC vendor integrations, and key technology partners.

### 2.4 Target Market and Customer Segments
Define the target customer profile. Address: retail vs. institutional, Nigerian-resident requirement, expected customer count during the AIP period, maximum customers permitted (50 under ARIP Framework Section 29), and KYC tier allocation.

## 3. Risk Management Framework

### 3.1 Risk Appetite Statement
State the company's risk appetite in clear terms.

### 3.2 Risk Identification and Assessment
For each risk area identified, provide:
- Risk description
- Why this risk is relevant to the specific product
- Likelihood rating (Low / Medium / High) with brief justification
- Impact rating (Low / Medium / High) with brief justification
- Inherent risk level

### 3.3 Risk Controls and Mitigations
For each risk, describe the specific controls implemented. Reference MLPPA 2022 and the NFIU AML/CFT Compliance Framework for VASPs (December 2024) where applicable for AML/CFT risks.

### 3.4 Residual Risk Assessment
Summarise the residual risk levels after controls are applied.

## 4. Investor and Customer Protection

### 4.1 Asset Segregation and Custody
Describe how customer assets are held separately from company assets. Specify the custody model (self-custody, third-party custodian) and the legal basis for segregation.

### 4.2 Insurance Cover
Detail the fidelity bond (confirming minimum 25% coverage as required by the ARIP Framework), professional indemnity insurance, cyber insurance, and any other relevant cover. Include insurer names and coverage amounts.

### 4.3 Customer Fund Protection
Describe mechanisms for protecting customer funds: bank account segregation, cold storage allocation, daily reconciliation procedures.

### 4.4 Complaints Handling
Set out the complaints handling procedure: submission channels, acknowledgement timelines (24 hours), resolution targets (10 business days), escalation path, and reference to the Nigerian Financial Services Ombudsman where applicable.

## 5. Regulatory Compliance Framework

### 5.1 AML/CFT Programme Summary
Summarise the AML/CFT programme: Business-Wide Risk Assessment (BWRA), AML/CFT Policy Manual, MLRO accountability, NFIU goAML registration, STR/CTR filing workflow. Reference MLPPA 2022 and the NFIU AML/CFT Compliance Framework for VASPs.

### 5.2 KYC/KYB Procedures
Describe the tiered KYC framework: Tier 1 (basic), Tier 2 (enhanced), Tier 3 (institutional). Confirm NIN and BVN verification integration per NFIU requirements.

### 5.3 Data Protection Compliance
Describe Nigeria Data Protection Act 2023 (NDPA) compliance measures. Cover: lawful basis for data processing, data storage jurisdiction, retention schedules, breach response (72-hour notification to NDPC), data subject rights handling.

### 5.4 Regulatory Reporting Obligations
Set out the reporting obligations during the AIP period per Section 21 of the ARIP Framework:
- Weekly trading statistics to SEC Nigeria
- Monthly trading statistics to SEC Nigeria
- Quarterly financial and compliance reports to SEC Nigeria

## 6. Customer Communications

### 6.1 Communication Strategy During ARIP
Describe how material changes, incidents, and operational updates will be communicated to customers. Include channels (email, in-app, SMS), approval procedures for material changes, and minimum notice periods.

### 6.2 Risk Disclosure Methodology
Describe the risk disclosure programme: pre-onboarding risk warnings, suitability questionnaire (if applicable), ongoing risk reminders, and documentation of acknowledgements.

## 7. AIP Operational Restrictions Acknowledgement

The applicant confirms it will operate within the following restrictions during the AIP period, as required by Section 29 of the ARIP Framework:
- Maximum 50 customers at any time during the AIP period
- Maximum NGN 2,000,000 per customer per transaction
- Maximum NGN 5,000,000 assets under management per customer
- 6-month AIP operational period (extendable by SEC Nigeria)
- Customer growth capped at 10% above the baseline count as at AIP receipt date
- No promotional activities of any kind during the AIP period
- No business activities outside those described in this operational plan

## 8. Exit Plan (Section 36 — MANDATORY)

This section is non-negotiable. The ARIP Framework Section 36 requires a detailed exit plan describing how all customer obligations will be fulfilled if full registration is not granted.

### 8.1 Exit Trigger Conditions
Define the conditions that would activate the exit plan: rejection of full registration application, voluntary withdrawal, SEC Nigeria direction to cease operations.

### 8.2 Customer Asset Return
Detail the asset return procedure:
- Timeline for notifying customers (minimum 30 days' notice)
- Process for returning digital assets to customer-designated wallets
- Process for returning fiat funds to customer bank accounts
- Reconciliation and confirmation procedures
- Handling of unclaimed assets (dormant account procedure)

### 8.3 Customer Notification Plan
Describe the communication programme: initial notification of cessation, regular updates, FAQ publication, dedicated customer support for exit queries.

### 8.4 Data Deletion and Portability
Describe the data deletion and portability procedures in compliance with NDPA 2023: customer data export option, deletion timeline (within 30 days of account closure), NDPC notification where required.

### 8.5 Regulatory and Third-Party Obligations
Detail the obligations to SEC Nigeria, NFIU, banking partners, and technology providers that must be wound down. Include data retention obligations under MLPPA 2022 (5-year minimum).

## 9. Sign-off

Prepared by: [Company Name]
Compliance Officer: [Name]
Date: [Plan date]

This operational plan has been prepared for submission to the Securities and Exchange Commission Nigeria as part of the ARIP application process. It is subject to review and update as required by SEC Nigeria.

## Disclaimer

This document was generated with AI assistance and reflects Klarify's regulatory information service. It is not legal advice. Review and finalise this operational plan with a qualified Nigerian digital asset regulatory practitioner before submission to SEC Nigeria. The ARIP application MUST be filed through a registered solicitor or adviser under Section 16 of the ARIP Framework.`,
  outputInstructions: STANDARD_OUTPUT_INSTRUCTIONS,
};
