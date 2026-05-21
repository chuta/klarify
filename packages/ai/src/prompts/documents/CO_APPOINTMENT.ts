import type { DocumentTemplate } from './types.js';
import { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/**
 * Compliance Officer Appointment Letter template.
 * CLAUDE.md §14 — regulatory basis: MLPPA 2022.
 */
export const CO_APPOINTMENT_TEMPLATE: DocumentTemplate = {
  templateId: 'CO_APPOINTMENT',
  documentName: 'Compliance Officer Appointment Letter',
  regulatoryBasis: 'MLPPA 2022',
  category: 'AML_CFT',
  requiredFields: [
    {
      key: 'company_name',
      label: 'Appointing company',
      type: 'text',
      required: true,
      helpText: 'The full registered name on your CAC certificate.',
      prefilledFrom: 'org.name',
    },
    {
      key: 'appointee_name',
      label: 'Appointee full name',
      type: 'text',
      required: true,
      helpText: 'Full legal name of the individual being appointed.',
    },
    {
      key: 'appointee_title',
      label: 'Appointee job title',
      type: 'select',
      required: true,
      helpText: 'The compliance role being formally established.',
      options: [
        'Chief Compliance Officer',
        'Money Laundering Reporting Officer (MLRO)',
        'Compliance Officer',
        'Head of Compliance',
      ],
    },
    {
      key: 'reporting_line',
      label: 'Reporting line',
      type: 'text',
      required: true,
      helpText:
        'To whom the compliance function reports for AML/CFT matters — typically the CEO or the board Risk & Compliance Committee.',
    },
    {
      key: 'appointee_qualifications',
      label: 'Appointee qualifications',
      type: 'textarea',
      required: true,
      helpText:
        'Brief summary of the appointee\'s relevant qualifications, certifications (CAMS, ICA, ACAMS, etc.) and years of compliance experience.',
    },
    {
      key: 'effective_date',
      label: 'Effective date of appointment',
      type: 'date',
      required: true,
      helpText: 'Date the appointment takes effect.',
      prefilledFrom: 'today',
    },
    {
      key: 'signatory_name',
      label: 'Signatory name (CEO / Chair)',
      type: 'text',
      required: true,
      helpText: 'Name of the executive signing the appointment letter on behalf of the company.',
    },
    {
      key: 'signatory_title',
      label: 'Signatory title',
      type: 'select',
      required: true,
      helpText: 'Role of the signatory.',
      options: ['Chief Executive Officer', 'Managing Director', 'Board Chair'],
    },
  ],
  systemPrompt: `You are generating a formal Compliance Officer Appointment Letter for a
Nigerian VASP / fintech. The letter establishes the appointee's formal
accountability under Section 12 of the Money Laundering (Prevention and
Prohibition) Act 2022 (MLPPA 2022), which requires every reporting
institution to designate a compliance officer with adequate seniority,
independence, and authority.

Anchor in:
  * MLPPA 2022, Section 12 — designation of compliance officer.
  * NFIU AML/CFT Compliance Framework for VASPs (December 2024) —
    MLRO independence and reporting line.
  * FATF Recommendation 18 — internal controls.
  * SEC Digital Asset Rules 2024 — compliance officer accountability
    for VASPs.

Tone: formal corporate letter. Plain Nigerian English. No placeholder
text. Use the supplied values verbatim. The document is intended to be
counter-signed by the appointee — include a sign-off block for them.

Required document structure (this is a LETTER format, not a numbered
report — use ## headings sparingly, mostly as section markers):

  ## <company_name>

  <effective_date>

  Private and Confidential

  <appointee_name>

  Dear <appointee_name>,

  ## RE: APPOINTMENT AS <appointee_title>

  ### 1. Appointment
     We are pleased to confirm your appointment as <appointee_title>
     of <company_name>, effective from <effective_date>.

  ### 2. Statutory Basis
     This appointment is made pursuant to Section 12 of the Money
     Laundering (Prevention and Prohibition) Act 2022 (MLPPA 2022),
     which requires every reporting institution to designate a
     compliance officer with adequate seniority, independence, and
     authority to ensure compliance with applicable AML/CFT
     obligations. This appointment also fulfils Section 12's
     requirement that the officer be of fit and proper standing.

  ### 3. Responsibilities
     In your capacity as <appointee_title> you will be responsible for:
     * Oversight of the company's AML/CFT compliance programme,
       including the AML/CFT Policy Manual, KYC Tiering Framework,
       transaction monitoring framework, and Business-Wide Risk
       Assessment.
     * Filing Suspicious Transaction Reports (STRs) and Currency
       Transaction Reports (CTRs) to the Nigerian Financial
       Intelligence Unit (NFIU) via the goAML portal within the
       statutory window (cite MLPPA 2022 Section 6).
     * Maintaining the PEP register and ensuring monthly submissions
       to NFIU (cite MLPPA 2022 Section 14).
     * Liaising with regulators including SEC Nigeria, CBN, NFIU,
       NDPC, and EFCC as required.
     * Convening regular compliance training for all staff
       (cite NFIU framework — minimum annual).
     * Reporting to <reporting_line> on AML/CFT matters, with direct
       and unimpeded access to the board where required.

  ### 4. Independence and Authority
     You are granted full authority to:
     * Investigate any internal transaction, customer relationship, or
       employee activity that gives rise to AML/CFT concern.
     * File STRs / CTRs to NFIU without prior management approval,
       and without notifying the subject (the no-tipping-off rule —
       MLPPA 2022 Section 8).
     * Recommend termination of customer relationships on AML/CFT
       grounds; recommendations may only be overruled by the board
       with documented reasoning.
     * Engage external counsel or technical specialists as required,
       within an annually approved compliance budget.

  ### 5. Fit and Proper
     Your qualifications and experience for this role include:
     <appointee_qualifications>
     You are required to disclose immediately any matter that may
     affect your fit-and-proper standing under MLPPA 2022 or the SEC
     Digital Asset Rules 2024 — including any criminal proceedings,
     sanctions findings, or regulatory investigation.

  ### 6. Confidentiality
     All compliance work product, customer screening output, STRs,
     and internal investigations are confidential. You are bound by
     the no-tipping-off obligation under MLPPA 2022 Section 8 even
     after this appointment ends.

  ### 7. Continuing Obligations
     You shall:
     * Maintain current professional development in AML/CFT and
       Nigerian regulatory frameworks.
     * Confirm in writing, annually, that the AML/CFT programme is
       fit for purpose and that any material gaps have been escalated.

  ### 8. Term
     This appointment continues until terminated by either party with
     reasonable written notice, subject to the company's HR policies.

  Yours sincerely,

  <signatory_name>
  <signatory_title>
  <company_name>

  ## Acceptance

  I, <appointee_name>, accept the appointment as <appointee_title> of
  <company_name> on the terms set out in this letter, with effect from
  <effective_date>. I confirm I am fit and proper to hold this role
  and am aware of no matter that would impair my appointment.

  Signature: ______________________________

  Date: ______________________________

  ## Disclaimer
     (Standard Klarify disclaimer — see output instructions.)`,
  outputInstructions: STANDARD_OUTPUT_INSTRUCTIONS,
};
