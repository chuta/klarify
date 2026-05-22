import type { DocumentTemplate } from './types.js';
import { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/**
 * Sponsored Individual Profile template — Sprint 5 S5-E1.
 * Regulatory basis: SEC Nigeria ARIP Framework (June 2024), Section 18(i).
 * Required plan: Compass+ (Compass or Flagship).
 *
 * Generates one profile sheet per sponsored individual.
 * Minimum 4 individuals required per Section 18(i).
 * Each profile includes identity, role, experience, and fitness
 * declarations covering all 8 criteria from Section 18(i)(a-h).
 */
export const SPONSORED_INDIVIDUAL_TEMPLATE: DocumentTemplate = {
  templateId: 'SPONSORED_INDIVIDUAL',
  documentName: 'Sponsored Individual Profile — ARIP',
  regulatoryBasis: 'SEC Nigeria ARIP Framework (June 2024), Section 18(i)',
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
      key: 'individuals',
      label: 'Sponsored individuals',
      type: 'dynamic_list',
      required: true,
      minItems: 4,
      helpText:
        'Minimum 4 individuals required by Section 18(i) of the ARIP Framework. ' +
        'Include all directors, the CEO/MD, the Chief Compliance Officer, and any other ' +
        'key officers and controllers. Each person must complete and individually sign ' +
        'their profile sheet before submission.',
      itemFields: [
        {
          key: 'full_name',
          label: 'Full legal name',
          type: 'text',
          required: true,
          helpText: 'Full name exactly as appearing on national ID (NIN card / international passport).',
        },
        {
          key: 'role',
          label: 'Role',
          type: 'select',
          required: true,
          helpText: 'Select the individual\'s role. Choose "Other" and specify below if not listed.',
          options: [
            'Managing Director',
            'Chief Executive Officer',
            'Chief Compliance Officer',
            'Chief Technology Officer',
            'Chief Financial Officer',
            'Chief Operating Officer',
            'Executive Director',
            'Non-Executive Director',
            'Controller',
            'Other',
          ],
        },
        {
          key: 'other_role',
          label: 'Specify role (if Other)',
          type: 'text',
          required: false,
          helpText: 'Specify the exact role title if "Other" was selected above.',
        },
        {
          key: 'nin',
          label: 'NIN (National Identification Number)',
          type: 'text',
          required: true,
          helpText: '11-digit National Identification Number.',
        },
        {
          key: 'bvn',
          label: 'BVN (Bank Verification Number)',
          type: 'text',
          required: true,
          helpText: '11-digit Bank Verification Number.',
        },
        {
          key: 'responsibilities',
          label: 'Responsibilities and authority',
          type: 'textarea',
          required: true,
          helpText:
            'Describe this individual\'s specific responsibilities and decision-making authority. ' +
            'Include: areas of oversight, limits of authority, reporting lines (who they report to ' +
            'and who reports to them), and key regulatory obligations they are personally accountable for.',
        },
        {
          key: 'experience',
          label: 'Relevant experience and track record',
          type: 'textarea',
          required: true,
          helpText:
            'Summarise professional experience relevant to this role. Include: total years of experience, ' +
            'specific experience in financial services or digital assets, key positions held, ' +
            'qualifications or certifications, and notable achievements relevant to this role.',
        },
        {
          key: 'no_criminal_convictions',
          label:
            'I declare that I have no criminal convictions for dishonesty, fraud, or financial crime in any jurisdiction',
          type: 'boolean',
          required: true,
          helpText: 'This declaration must be true. Individuals who cannot make this declaration should not be included.',
        },
        {
          key: 'no_sanctions',
          label:
            'I declare that I am not subject to any regulatory sanctions, prohibition, or disqualification by any financial regulator',
          type: 'boolean',
          required: true,
          helpText:
            'Covers: SEC Nigeria, CBN, NFIU, FCA, SEC US, any financial regulator or professional body in any jurisdiction.',
        },
        {
          key: 'no_misconduct',
          label:
            'I declare that there has been no finding of professional misconduct against me by any professional body',
          type: 'boolean',
          required: true,
          helpText: 'Covers legal, accounting, financial services, and any other professional body.',
        },
        {
          key: 'no_bankruptcy',
          label:
            'I declare that I have no history of personal bankruptcy or individual insolvency proceedings',
          type: 'boolean',
          required: true,
          helpText: 'Covers bankruptcy, IVA, or any equivalent insolvency proceeding in Nigeria or internationally.',
        },
      ],
    },
  ],
  systemPrompt: `You are generating Sponsored Individual Profile Sheets for submission to the Securities and Exchange Commission Nigeria under the ARIP Framework (June 2024), Section 18(i).

Generate a SEPARATE, COMPLETE profile sheet for EACH individual listed in the form data. Each profile sheet must be comprehensive, professionally formatted, and ready for individual review and signing.

Separate each individual's profile sheet with a clear horizontal rule (---) and "PAGE BREAK" marker to indicate they should be printed on separate pages.

For EACH individual, generate the following complete profile sheet:

---

# SPONSORED INDIVIDUAL PROFILE SHEET

**ARIP Application — [Company Name]**
*SEC Nigeria ARIP Framework (June 2024), Section 18(i)*

---

## Individual [Number]: [Full Name]

**Role at [Company Name]:** [Role / Other Role if applicable]
**NIN:** [NIN Number]
**BVN:** [BVN Number]

---

## Section 1: Responsibilities and Authority

**Role Description:**
[Expand the responsibilities provided into a well-structured description covering:]
- Formal title and position within the company hierarchy
- Areas of primary responsibility and oversight
- Decision-making authority and limits
- Key regulatory obligations this individual is personally accountable for
- Reporting lines: reports to [X], has [Y] direct reports

---

## Section 2: Professional Experience and Qualifications

[Expand the experience provided into a professional narrative covering:]
- Total years of relevant professional experience
- Career history relevant to this role (positions held, organisations, durations)
- Specific experience in financial services, digital assets, or regulatory compliance
- Professional qualifications, certifications, or educational credentials
- Key achievements relevant to the responsibilities at [Company Name]

---

## Section 3: Fitness and Propriety Declaration

**I, [Full Name], in my capacity as [Role] at [Company Name], being of full legal capacity and duly sworn, hereby make the following declarations under Section 18(i) of the ARIP Framework (June 2024):**

**(a) No Criminal Convictions:**
I have not been convicted of, or charged with, any offence involving dishonesty, fraud, financial crime, market manipulation, insider dealing, cybercrime, or any related criminal offence in the Federal Republic of Nigeria or any other jurisdiction at any time. I have no pending criminal proceedings against me in any jurisdiction.

**(b) No Regulatory Sanctions:**
I have not been subject to any regulatory sanction, prohibition order, withdrawal of approval, or disqualification from holding a position of responsibility by any financial services regulator, securities commission, central bank, or professional licensing body in Nigeria or internationally, including but not limited to SEC Nigeria, the Central Bank of Nigeria, the NFIU, the UK Financial Conduct Authority, the US Securities and Exchange Commission, or any equivalent body.

**(c) No Bankruptcy or Insolvency:**
I have not been subject to personal bankruptcy proceedings, individual voluntary arrangements, debt restructuring orders, or any equivalent insolvency or debt relief proceeding in Nigeria or any other jurisdiction. I have no material unresolved debts or financial obligations that would impair my ability to fulfil my responsibilities or that represent a material conflict of interest.

**(d) Competence and Experience:**
I possess the competence, professional knowledge, practical experience, and qualifications appropriate to discharge my responsibilities as [Role] at [Company Name] in the context of the ARIP application and the proposed digital asset business. I have demonstrated capability in [key area from experience section].

**(e) Sound Financial Standing:**
I am in sound financial standing. I have no material unresolved financial obligations, undisclosed debts, or financial commitments that would impair my independent judgment or my ability to act in the best interests of customers and the company.

**(f) No Conflict of Interest:**
I have no conflict of interest — actual, potential, or perceived — that would impair my independent judgment or my ability to act in the best interests of customers, [Company Name], and regulatory compliance. I commit to disclose any conflict of interest that may arise to the Board and, where required, to SEC Nigeria.

**(g) Commitment to Regulatory Compliance:**
I commit to comply, and to ensure [Company Name] complies, with all applicable laws, regulations, and rules of SEC Nigeria and all Nigerian financial regulatory authorities, including the Investments and Securities Act 2025, SEC Digital Asset Rules (as amended), the ARIP Framework (June 2024), the Money Laundering (Prevention and Prohibition) Act 2022, the Nigeria Data Protection Act 2023, and all other applicable Nigerian regulatory requirements, throughout the ARIP period and beyond.

**(h) Knowledge of Digital Asset Regulatory Framework:**
I have read, understood, and have the necessary knowledge of the Nigerian digital asset regulatory framework, including the ISA 2025, SEC Digital Asset Rules (2022, 2023, 2024 amendments), the ARIP Framework (June 2024), and my obligations as a sponsored individual of a VASP under Nigerian law. I understand the restrictions applicable during the AIP period and the consequences of non-compliance.

---

## Section 4: Declaration and Signature

I, [Full Name], declare that the information provided in this profile sheet is true, accurate, and complete. I understand that providing false information is a criminal offence and may result in prosecution under Nigerian law.

**Signed:** ___________________________
**Full Name:** [Full Name]
**Role:** [Role]
**Date:** ___________________________
**NIN:** [NIN Number]

---

**SWORN** before me at ___________________________

this ______ day of _____________________, [Year].

**Commissioner for Oaths:** ___________________________

Seal / Stamp of Commissioner for Oaths

---

[REPEAT THE ABOVE COMPLETE PROFILE SHEET FOR EACH SUBSEQUENT INDIVIDUAL, CLEARLY NUMBERED AND SEPARATED]

---

## Disclaimer

These Sponsored Individual Profile Sheets were prepared with AI assistance using Klarify. Each individual must personally review their profile sheet, ensure all information is accurate and complete, and have it sworn before a Commissioner for Oaths in Nigeria. These profiles are regulatory information, not legal advice. Consult a qualified Nigerian solicitor before submission to SEC Nigeria. The ARIP application MUST be filed through a registered solicitor or adviser under Section 16 of the ARIP Framework.`,
  outputInstructions: STANDARD_OUTPUT_INSTRUCTIONS,
};
