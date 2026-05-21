import type { DocumentTemplate } from './types.js';
import { STANDARD_OUTPUT_INSTRUCTIONS } from './types.js';

/**
 * Regulator Engagement Brief template.
 * CLAUDE.md §14 — regulatory basis: Best practice.
 */
export const REG_BRIEF_TEMPLATE: DocumentTemplate = {
  templateId: 'REG_BRIEF',
  documentName: 'Regulator Engagement Brief',
  regulatoryBasis: 'Best practice',
  category: 'OTHER',
  requiredFields: [
    {
      key: 'company_name',
      label: 'Your company',
      type: 'text',
      required: true,
      helpText: 'The full registered name on your CAC certificate.',
      prefilledFrom: 'org.name',
    },
    {
      key: 'regulator_code',
      label: 'Target regulator',
      type: 'select',
      required: true,
      helpText: 'Which regulatory body you are engaging.',
      options: [
        'SEC_NIGERIA',
        'CBN',
        'NFIU',
        'NITDA',
        'CAC',
        'EFCC',
        'NAICOM',
        'OTHER',
      ],
    },
    {
      key: 'meeting_purpose',
      label: 'Purpose of engagement',
      type: 'select',
      required: true,
      helpText: 'What type of engagement is this?',
      options: [
        'PRE_APPLICATION_BRIEFING',
        'INNOVATION_OFFICE_INTRO',
        'ARIP_PROGRESS_UPDATE',
        'PRODUCT_NOTIFICATION',
        'RESPONSE_TO_QUERY',
        'INDUSTRY_CONSULTATION',
        'OTHER',
      ],
    },
    {
      key: 'product_summary',
      label: 'Product summary (1–2 sentences)',
      type: 'textarea',
      required: true,
      helpText:
        'Tightest possible description of what you do. The regulator may only read this paragraph — make it count.',
    },
    {
      key: 'regulatory_position',
      label: 'Your current regulatory position',
      type: 'textarea',
      required: true,
      helpText:
        'Plain statement of where you are: pre-registration, in ARIP, holding AIP, licensed, etc. Mention any prior engagement with the regulator.',
    },
    {
      key: 'key_points',
      label: 'Key points to make in the meeting',
      type: 'textarea',
      required: true,
      helpText:
        'Bullet-style list of the 3–5 things you want the regulator to walk away knowing. The brief will format these into a structured Talking Points section.',
    },
    {
      key: 'asks',
      label: 'Specific asks of the regulator',
      type: 'textarea',
      required: true,
      helpText:
        'What do you want from this engagement? Confirmation of category? Approval to proceed? Feedback on a draft? Be specific.',
    },
    {
      key: 'attendees',
      label: 'Your attendees',
      type: 'textarea',
      required: true,
      helpText:
        'Names and titles of your team attending the engagement, e.g. "Jane Doe — CEO, John Smith — Head of Compliance".',
    },
    {
      key: 'meeting_date',
      label: 'Meeting / submission date',
      type: 'date',
      required: true,
      helpText: 'Date of the meeting or the date the brief is submitted.',
      prefilledFrom: 'today',
    },
  ],
  systemPrompt: `You are generating a Regulator Engagement Brief for a Nigerian VASP /
fintech preparing to meet with — or formally write to — a Nigerian
regulator. Anchor in best practice for regulator engagement:
  * Cooperative tone, never adversarial.
  * Lead with regulatory category and your understanding of it.
  * Volunteer information; do not hide structure.
  * Pre-emptively address the obvious risk question.
  * Close with explicit asks, never ambiguous next steps.

This brief is an INTERNAL document for the company's attending team. It
is NOT a letter to the regulator — though it should be high enough
quality that excerpts can be lifted into a follow-up letter.

Tailor the content to the selected regulator:
  * SEC_NIGERIA — focus on ISA 2025, Digital Asset Rules, ARIP. Use
    the formal "Director General" address style.
  * CBN — focus on CBN VASP Guidelines 2023, payment systems
    framework, BOFIA 2020.
  * NFIU — focus on MLPPA 2022, AML/CFT framework, goAML.
  * NITDA — focus on NDPA 2023, blockchain policy.
  * CAC — focus on CAMA 2020, beneficial ownership, share structure.
  * EFCC — focus on financial-crime preparedness, AML cooperation.
  * NAICOM — focus on fidelity bond cover for VASPs.
  * OTHER — generic professional brief.

Required document structure:

  ## 1. Engagement Header
     Company: <company_name>
     Regulator: <regulator_code>
     Purpose: <meeting_purpose>
     Date: <meeting_date>
     Our attendees: <attendees>

  ## 2. One-Paragraph Snapshot
     The single most important paragraph of the brief. Restate
     <product_summary> with regulator-relevant framing. Pre-empt the
     classification question by stating how the company classifies
     its product under the regulator's framework, with a single
     citation.

  ## 3. Our Regulatory Position
     Restate <regulatory_position> in structured paragraph form. Add
     specific citations to the relevant frameworks (ISA 2025, SEC
     Digital Asset Rules, CBN VASP Guidelines, MLPPA 2022, NDPA 2023,
     CAMA 2020) as applicable to the regulator.

  ## 4. Talking Points
     Format <key_points> as a numbered list. For each point, write
     2–3 sentences with the supporting context and a relevant
     regulatory citation where helpful.

  ## 5. Anticipated Questions and Suggested Answers
     Generate 4–6 questions the regulator is likely to ask given the
     <meeting_purpose>, the <regulator_code>, and the <product_summary>.
     For each question, draft a one-paragraph suggested answer.
     Examples (adapt to context):
     * Q: "How do you classify your product under our framework?"
     * Q: "What customer-protection measures are in place?"
     * Q: "What is your AML/CFT programme?" (for SEC, CBN, NFIU)
     * Q: "What is your capital position?"
     * Q: "How are customer assets segregated?"

  ## 6. Explicit Asks
     Format <asks> as a numbered list. Be specific. For each ask,
     state the timeline you would like the regulator to commit to.

  ## 7. Materials to Leave Behind
     A short list of attachments / leave-behind documents that should
     accompany the engagement. Choose intelligently from this list
     based on regulator + purpose:
     * White Paper (for SEC product notifications)
     * BWRA and AML/CFT Policy Manual (for SEC, CBN, NFIU)
     * KYC Tiering Framework (for CBN, NFIU)
     * Token Classification Memo (for SEC token-related discussions)
     * Compliance Officer Appointment Letter (for SEC, CBN, NFIU)
     * Capital adequacy summary (for SEC, CBN)
     * Beneficial Ownership disclosure (for CAC, SEC)

  ## 8. Engagement Logistics
     Standard SEC Innovation Office hours: Tuesdays and Thursdays,
     10:00–14:00 (only). Primary email: innovation@sec.gov.ng,
     fintech@sec.gov.ng. Plan to arrive 30 minutes early. Bring
     business cards. Confirm the meeting in writing 48 hours in
     advance.
     (Adapt this section to the chosen <regulator_code> — for
     non-SEC regulators, replace with the regulator's published
     engagement protocols or generic best practice.)

  ## 9. Post-Engagement
     Within 48 hours of the engagement: send a written summary of
     what was discussed and any agreed next steps to the regulator's
     office. Log the interaction in the Klarify Regulator CRM.
     Update internal records.

  ## 10. Sign-off
      Brief owner: <attendees> (lead)
      Date: <meeting_date>

  ## Disclaimer
     (Standard Klarify disclaimer — see output instructions.)`,
  outputInstructions: STANDARD_OUTPUT_INSTRUCTIONS,
};
