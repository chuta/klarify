import type { DocumentTemplate } from './types.js';
import { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/**
 * ARIP Sworn Undertaking template — Sprint 5 S5-E1.
 * Regulatory basis: SEC Nigeria ARIP Framework (June 2024), Section 15(a).
 * Required plan: Compass+ (Compass or Flagship).
 *
 * This is a formal legal document sworn before a Commissioner for Oaths.
 * It covers all 6 sub-clauses of Section 15(a) and all 8 fitness and
 * propriety criteria from Section 15(a)(v)(a-h) for each named person.
 */
export const ARIP_SWORN_UNDERTAKING_TEMPLATE: DocumentTemplate = {
  templateId: 'ARIP_SWORN_UNDERTAKING',
  documentName: 'Sworn Undertaking — ARIP Application',
  regulatoryBasis: 'SEC Nigeria ARIP Framework (June 2024), Section 15(a)',
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
      key: 'cac_number',
      label: 'CAC registration number',
      type: 'text',
      required: true,
      helpText: 'Your company\'s Corporate Affairs Commission registration number (RC number).',
    },
    {
      key: 'registered_address',
      label: 'Registered office address',
      type: 'textarea',
      required: true,
      helpText:
        'Full registered office address as appearing on your CAC certificate and correspondence with SEC Nigeria.',
    },
    {
      key: 'directors',
      label: 'Directors',
      type: 'dynamic_list',
      required: true,
      minItems: 1,
      helpText:
        'List all directors of the company. Each director must be individually named in the sworn undertaking ' +
        'as required by Section 15(a). Include full name, title/role, and NIN for each.',
      itemFields: [
        {
          key: 'full_name',
          label: 'Full legal name',
          type: 'text',
          required: true,
          helpText: 'Director\'s full name as on their national ID.',
        },
        {
          key: 'role',
          label: 'Role / title',
          type: 'text',
          required: true,
          helpText: 'e.g. Executive Director, Non-Executive Director, Managing Director.',
        },
        {
          key: 'nin',
          label: 'NIN',
          type: 'text',
          required: true,
          helpText: 'National Identification Number.',
        },
      ],
    },
    {
      key: 'ceo_name',
      label: 'CEO / Managing Director name',
      type: 'text',
      required: true,
      helpText: 'Full legal name of the Chief Executive Officer or Managing Director.',
      prefilledFrom: 'user.name',
    },
    {
      key: 'compliance_officer_name',
      label: 'Compliance officer name',
      type: 'text',
      required: true,
      helpText:
        'Full legal name of the appointed Chief Compliance Officer / MLRO. ' +
        'This person must hold a relevant qualification per MLPPA 2022 Section 12.',
    },
    {
      key: 'other_officers',
      label: 'Other key officers (optional)',
      type: 'dynamic_list',
      required: false,
      minItems: 0,
      helpText:
        'Any additional key officers to be named in the undertaking (e.g. CTO, CFO). ' +
        'These individuals will also be subject to fitness and propriety declarations.',
      itemFields: [
        {
          key: 'full_name',
          label: 'Full legal name',
          type: 'text',
          required: true,
          helpText: 'Full name as on national ID.',
        },
        {
          key: 'role',
          label: 'Role / title',
          type: 'text',
          required: true,
          helpText: 'e.g. Chief Technology Officer, Chief Financial Officer.',
        },
      ],
    },
    {
      key: 'declaration_date',
      label: 'Date of declaration',
      type: 'date',
      required: true,
      helpText:
        'Date this sworn undertaking is being executed. Must be the actual date of swearing before the Commissioner for Oaths.',
      prefilledFrom: 'today',
    },
    {
      key: 'commissioner_name',
      label: 'Commissioner for Oaths name (optional)',
      type: 'text',
      required: false,
      helpText:
        'Name of the Commissioner for Oaths before whom the document will be sworn. ' +
        'Leave blank to generate a placeholder — to be completed before execution.',
    },
  ],
  systemPrompt: `You are generating a Sworn Undertaking for submission to the Securities and Exchange Commission Nigeria under the ARIP Framework (June 2024), Section 15(a).

This is a formal legal document that must be sworn before a Commissioner for Oaths in Nigeria. It covers all 6 sub-clauses of Section 15(a) of the ARIP Framework, and must include fitness and propriety declarations for each named director and key officer covering all 8 criteria from Section 15(a)(v)(a-h).

Generate the sworn undertaking as a formal Nigerian legal document:

---

# SWORN UNDERTAKING

**IN THE MATTER OF AN APPLICATION FOR ACCELERATED REGULATORY INCUBATION PROGRAMME (ARIP)**

**BY:**

**[Company Name]**
*(RC Number: [CAC Number])*
*[Registered Address]*

---

## RECITALS

WHEREAS [Company Name] (the "Applicant") is a company duly incorporated under the Companies and Allied Matters Act 2020 (CAMA 2020) with CAC registration number [CAC Number], having its registered office at [Registered Address];

AND WHEREAS the Applicant desires to apply for admission into the Accelerated Regulatory Incubation Programme (ARIP) administered by the Securities and Exchange Commission Nigeria ("SEC Nigeria") pursuant to the ARIP Framework published by SEC Nigeria in June 2024;

AND WHEREAS SEC Nigeria requires the Applicant to provide this Sworn Undertaking as a condition of the ARIP application pursuant to Section 15(a) of the ARIP Framework;

NOW THEREFORE, the undersigned, being the duly authorised directors, officers, and controllers of the Applicant, being of full legal capacity and duly sworn, hereby make the following declarations and undertakings:

---

## PART I: CORPORATE UNDERTAKINGS

### Section 15(a)(i) — Accuracy and Completeness of Application

The Applicant hereby warrants and undertakes that:

1.1 The Applicant is duly incorporated and validly existing under the laws of the Federal Republic of Nigeria pursuant to the Companies and Allied Matters Act 2020, with CAC registration number [CAC Number].

1.2 All information provided in the ARIP application, including all supporting documents, is true, accurate, and complete in all material respects as at the date of this undertaking.

1.3 The Applicant will notify SEC Nigeria immediately and in writing if any information provided in the application becomes materially inaccurate or incomplete after the date of this undertaking.

1.4 The Applicant acknowledges that SEC Nigeria may rely on the information provided in the application and that any material misrepresentation may result in rejection of the application, revocation of any AIP granted, and potential criminal liability under the Investments and Securities Act 2025 (ISA 2025) and CAMA 2020.

### Section 15(a)(ii) — Fitness and Propriety of Directors and Officers

Each director, officer, and controller named in this undertaking individually warrants that they are a fit and proper person as defined under Section 18 of the ARIP Framework, and meets all the criteria set out in Section 15(a)(v) below.

### Section 15(a)(iii) — Compliance with AIP Operational Restrictions

The Applicant undertakes to comply strictly with all operational restrictions applicable during the AIP period, including but not limited to:

3.1 The Applicant will not onboard more than fifty (50) customers at any time during the AIP period.

3.2 The Applicant will not facilitate transactions exceeding NGN 2,000,000 per customer per transaction.

3.3 The Applicant will not permit any individual customer's assets under management to exceed NGN 5,000,000 at any time.

3.4 The Applicant will not engage in any promotional activities of any nature during the AIP period, including but not limited to advertising, social media promotion, referral programmes, or any other customer acquisition activity beyond the permitted operational scope.

3.5 The Applicant will not conduct any business activities outside the scope of the operational plan submitted as part of this ARIP application.

3.6 The Applicant will not permit customer growth to exceed ten percent (10%) above the baseline customer count recorded on the date of receipt of the AIP notification letter from SEC Nigeria.

3.7 The Applicant will submit all required reports to SEC Nigeria as specified in Section 21 of the ARIP Framework: weekly trading statistics, monthly trading statistics, and quarterly financial and compliance reports.

### Section 15(a)(iv) — Notification of Material Changes

The Applicant undertakes to notify SEC Nigeria in writing within five (5) business days of any material change to any of the following:

4.1 The Applicant's business activities, product features, or operational model.

4.2 The Applicant's beneficial ownership structure or shareholders holding five percent (5%) or more of the issued share capital.

4.3 The appointment, resignation, or dismissal of any director, key officer, or controller named in this undertaking.

4.4 The Applicant's technology infrastructure, including changes to the custody architecture, trading engine, or KYC/AML systems.

4.5 The Applicant's financial position, including any material deterioration in capital adequacy, the occurrence of any insolvency event, or the cessation of fidelity bond cover.

4.6 Any regulatory action, investigation, court proceedings, or law enforcement inquiry involving the Applicant or any named individual in any jurisdiction.

### Section 15(a)(v) — Fitness and Propriety Declarations

Each named individual set out below makes the following personal declarations, covering all criteria set out in Section 15(a)(v)(a-h) of the ARIP Framework:

**[CEO/MD name] — [Role]**

I, [CEO Name], hereby declare that:

(a) I have not been convicted of, or charged with, any offence involving dishonesty, fraud, financial crime, market manipulation, insider dealing, or any related criminal offence in Nigeria or any other jurisdiction.

(b) I have not been subject to any regulatory sanction, prohibition order, withdrawal of approval, or disqualification from holding a position of responsibility by any financial services regulator, securities commission, central bank, or professional licensing body in Nigeria or internationally.

(c) I have not been subject to personal bankruptcy proceedings, individual voluntary arrangements, or any equivalent insolvency proceeding in Nigeria or any other jurisdiction.

(d) I possess the competence, knowledge, professional experience, and qualifications appropriate to my role as [Role] at [Company Name] in the context of this ARIP application.

(e) I am in sound financial standing and have no material unresolved financial obligations or debts that would impair my ability to fulfil my responsibilities or that represent a conflict of interest.

(f) I have no conflict of interest — actual, potential, or perceived — that would impair my independent judgment or ability to act in the best interests of customers, the company, and regulatory compliance.

(g) I commit to comply with all applicable laws, regulations, and rules of SEC Nigeria, including the ISA 2025, SEC Digital Asset Rules (as amended), the ARIP Framework, MLPPA 2022, and all other applicable Nigerian regulatory requirements, throughout the ARIP period and thereafter.

(h) I have read, understood, and have the necessary knowledge of the Nigerian digital asset regulatory framework, including the ISA 2025, SEC Digital Asset Rules, the ARIP Framework (June 2024), and my obligations as a key officer of a VASP under Nigerian law.

[REPEAT THE ABOVE FITNESS AND PROPRIETY DECLARATION FOR EACH ADDITIONAL DIRECTOR AND KEY OFFICER NAMED IN THE FORM DATA, SUBSTITUTING THEIR NAME AND ROLE. EACH DECLARATION MUST COVER ALL 8 CRITERIA (a) THROUGH (h).]

[COMPLIANCE OFFICER NAME — Compliance Officer]

I, [Compliance Officer Name], hereby declare that: [SAME 8 DECLARATIONS AS ABOVE, ADAPTED FOR THE COMPLIANCE OFFICER ROLE]

[IF OTHER KEY OFFICERS ARE PROVIDED, INCLUDE THEIR DECLARATIONS HERE]

### Section 15(a)(vi) — Acknowledgement of Consequences

The Applicant and each named individual acknowledge that:

6.1 Providing false, misleading, or incomplete information in this sworn undertaking or in the ARIP application is a serious regulatory violation and may constitute an offence under the ISA 2025, the Companies and Allied Matters Act 2020, and other applicable laws of the Federal Republic of Nigeria.

6.2 SEC Nigeria reserves the right to revoke any AIP granted on the basis of information that is subsequently found to be materially inaccurate or false.

6.3 This undertaking is made voluntarily and with full knowledge of its legal effect and consequences.

---

## SIGNATURES

**On behalf of [Company Name]:**

[CEO/MD NAME]
Chief Executive Officer / Managing Director
Date: [Declaration Date]
NIN: [NIN if provided]

_________________________________
Signature

[COMPLIANCE OFFICER NAME]
Chief Compliance Officer
Date: [Declaration Date]

_________________________________
Signature

[REPEAT SIGNATURE BLOCK FOR EACH DIRECTOR AND KEY OFFICER]

---

## ATTESTATION

**SWORN AND SIGNED** before me at __________________ this ______ day of _____________, [Year].

Commissioner for Oaths: [Commissioner Name or ___________________________]

Seal / Stamp of Commissioner for Oaths

---

## Disclaimer

This Sworn Undertaking was drafted with AI assistance using Klarify. It must be reviewed by a qualified Nigerian solicitor, completed with accurate information for all named individuals, and sworn before a Commissioner for Oaths in Nigeria before submission to SEC Nigeria. This document is not legal advice. The ARIP application MUST be filed through a registered solicitor or adviser under Section 16 of the ARIP Framework.`,
  outputInstructions: STANDARD_OUTPUT_INSTRUCTIONS,
};
