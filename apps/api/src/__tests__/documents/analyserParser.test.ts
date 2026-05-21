// =============================================================================
// Analyser output parser — the §6 section-headed format → structured JSON.
//
// We use the CLAUDE.md §6 verbatim format. Tests pin down:
//   * Section splitting tolerates Claude's small format variations.
//   * Urgency detection works across the 4 levels.
//   * Deadline parser handles the date formats Nigerian regulators actually use.
//   * Citation extraction picks up bracketed regulation references.
//   * The disclaimer is always attached (never lost).
// =============================================================================
import { describe, expect, it } from 'vitest';
import {
  parseAnalyserOutput,
  parseDeadline,
  extractCitations,
} from '../../services/documentAnalysis.js';

const SAMPLE_SEC_NOTICE = `PLAIN LANGUAGE SUMMARY: SEC Nigeria has issued a formal enforcement notice alleging that your platform has been operating as a Digital Asset Exchange without registration under ISA 2025, Section 357. They require a response within 21 days.

ISSUING REGULATOR: Securities and Exchange Commission Nigeria — Department of Registration and Regulation

URGENCY LEVEL: CRITICAL
This is a formal enforcement action that threatens licence revocation and references criminal liability under ISA 2025, Section 392 [ISA 2025, Section 357].

WHAT THE REGULATOR IS ASKING FOR:
- Cease offering trading services to Nigerian residents within 7 days
- Submit a sworn affidavit detailing all transactions since January 2026
- Identify the natural persons exercising control over the platform

RESPONSE DEADLINE: 21 June 2026

72-HOUR ACTION PLAN:
1. Today: Engage a Nigerian digital asset regulatory specialist before any communication with SEC.
2. Today: Pause new user signups and large withdrawals while you assess exposure.
3. This week: Compile transaction ledger covering 1 January 2026 to date.
4. Submit acknowledgement to SEC confirming receipt and intent to cooperate.

DRAFT ACKNOWLEDGMENT RESPONSE:
Dear Sir/Ma,

We are in receipt of your notice dated 30 May 2026. We are taking it with the seriousness it deserves and have engaged regulatory counsel to assist us in preparing a full response within the stipulated 21-day window. We respectfully request a brief meeting with your Department to clarify the scope of the information requested.

Yours sincerely,
Compliance Officer
On behalf of Acme Crypto Ltd

This draft was prepared with AI assistance. Review with a qualified Nigerian digital asset regulatory specialist before submission.

DISCLAIMER: This analysis is not legal advice. Review this with a qualified Nigerian digital asset regulatory specialist before submitting any response to the regulator.`;

describe('parseAnalyserOutput — happy path with the SEC sample', () => {
  const result = parseAnalyserOutput(SAMPLE_SEC_NOTICE);

  it('extracts the plain language summary', () => {
    expect(result.plain_language_summary).toMatch(/SEC Nigeria has issued/);
  });

  it('identifies the regulator + department + code', () => {
    expect(result.issuing_regulator.name).toBe(
      'Securities and Exchange Commission Nigeria',
    );
    expect(result.issuing_regulator.department).toBe(
      'Department of Registration and Regulation',
    );
    expect(result.issuing_regulator.code).toBe('SEC_NIGERIA');
  });

  it('classifies urgency as CRITICAL', () => {
    expect(result.urgency_level).toBe('CRITICAL');
    expect(result.urgency_reasoning).toMatch(/formal enforcement/);
  });

  it('parses the bulleted regulatory ask into a list', () => {
    expect(result.regulatory_ask).toHaveLength(3);
    expect(result.regulatory_ask[0]).toMatch(/Cease offering trading services/);
  });

  it('parses the response deadline date', () => {
    expect(result.response_deadline.is_specified).toBe(true);
    expect(result.response_deadline.date_string).toBe('21 June 2026');
    expect(typeof result.response_deadline.days_remaining).toBe('number');
  });

  it('parses the action plan with sequential step numbers', () => {
    expect(result.action_plan.length).toBeGreaterThanOrEqual(3);
    expect(result.action_plan[0]!.step).toBe(1);
    expect(result.action_plan[1]!.step).toBe(2);
  });

  it('assigns IMMEDIATE urgency to the first step', () => {
    expect(result.action_plan[0]!.urgency).toBe('IMMEDIATE');
  });

  it('keeps the full draft response intact', () => {
    expect(result.draft_response).toMatch(/Dear Sir\/Ma/);
    expect(result.draft_response).toMatch(/Acme Crypto Ltd/);
  });

  it('extracts inline citations', () => {
    expect(result.citations.length).toBeGreaterThanOrEqual(1);
    expect(result.citations[0]!.regulation).toMatch(/ISA 2025/);
    expect(result.citations[0]!.section).toMatch(/Section 357/);
  });

  it('always attaches the legal disclaimer', () => {
    expect(result.disclaimer.length).toBeGreaterThan(0);
    expect(result.disclaimer).toMatch(/regulatory information|legal advice/i);
  });
});

describe('parseAnalyserOutput — urgency level variants', () => {
  const make = (level: string): string =>
    `PLAIN LANGUAGE SUMMARY: ok\n\nURGENCY LEVEL: ${level}\nreasoning here`;

  it('classifies HIGH', () => {
    expect(parseAnalyserOutput(make('HIGH')).urgency_level).toBe('HIGH');
  });
  it('classifies MEDIUM', () => {
    expect(parseAnalyserOutput(make('MEDIUM')).urgency_level).toBe('MEDIUM');
  });
  it('classifies LOW', () => {
    expect(parseAnalyserOutput(make('LOW')).urgency_level).toBe('LOW');
  });
  it('handles lower-case from Claude', () => {
    expect(parseAnalyserOutput(make('critical')).urgency_level).toBe('CRITICAL');
  });
  it('falls back to MEDIUM on unrecognised input', () => {
    expect(parseAnalyserOutput(make('moderate')).urgency_level).toBe('MEDIUM');
  });
});

describe('parseAnalyserOutput — required summary', () => {
  it('throws when PLAIN LANGUAGE SUMMARY is missing', () => {
    expect(() =>
      parseAnalyserOutput('URGENCY LEVEL: HIGH\n\nDRAFT ACKNOWLEDGMENT RESPONSE: foo'),
    ).toThrow(/PLAIN LANGUAGE SUMMARY/);
  });
});

// Regression: Opus drifts into markdown roughly 1 in 3 generations even when
// the §6 prompt explicitly demands "LABEL:". The 2026-05-21 BlockEX paste-text
// smoke test reproduced this when the live response began with
// `# REGULATORY DOCUMENT ANALYSIS\n## PLAIN LANGUAGE SUMMARY\n...` and our
// parser threw "PLAIN LANGUAGE SUMMARY is missing." Lock the markdown form in.
const SAMPLE_MARKDOWN_DRIFT = `# REGULATORY DOCUMENT ANALYSIS

## PLAIN LANGUAGE SUMMARY

The Central Bank of Nigeria is telling BlockEX Trade Limited to immediately stop all its core business operations because the company is operating without the required CBN licences [CBN VASP Guidelines 2023, Section 4.2].

## ISSUING REGULATOR

Central Bank of Nigeria — Payments System Management Department

## URGENCY LEVEL

**CRITICAL**

The notice threatens immediate account freezing and references criminal liability under BOFIA 2020.

## WHAT THE REGULATOR IS ASKING FOR

- Immediate cessation of all Naira-to-stablecoin conversion services
- Submission of full transaction records covering the past 12 months
- Identification of all bank accounts used by the platform

## RESPONSE DEADLINE

**21 June 2026**

## 72-HOUR ACTION PLAN

1. Today: Stop accepting new Naira deposits and notify users via in-app banner.
2. Today: Engage a CBN-experienced regulatory counsel before any written response.
3. This week: Prepare the full transaction ledger requested by the CBN.

## DRAFT ACKNOWLEDGMENT RESPONSE

Dear Sir/Ma,

We acknowledge receipt of your notice and have engaged regulatory counsel to assist us in preparing a full response within the stipulated window.

Yours sincerely,
Compliance Officer
On behalf of BlockEX Trade Limited

## DISCLAIMER

This analysis is not legal advice.`;

describe('parseAnalyserOutput — markdown heading drift (BlockEX repro)', () => {
  const result = parseAnalyserOutput(SAMPLE_MARKDOWN_DRIFT);

  it('extracts the summary despite the `## PLAIN LANGUAGE SUMMARY` heading', () => {
    expect(result.plain_language_summary).toMatch(
      /Central Bank of Nigeria is telling BlockEX/,
    );
  });

  it('identifies the regulator under `## ISSUING REGULATOR`', () => {
    expect(result.issuing_regulator.code).toBe('CBN');
    expect(result.issuing_regulator.name).toBe('Central Bank of Nigeria');
    expect(result.issuing_regulator.department).toBe(
      'Payments System Management Department',
    );
  });

  it('strips `**CRITICAL**` bold markers from urgency', () => {
    expect(result.urgency_level).toBe('CRITICAL');
    expect(result.urgency_reasoning).toMatch(/threatens immediate account freezing/);
    expect(result.urgency_reasoning).not.toMatch(/\*\*/);
  });

  it('strips `**21 June 2026**` bold markers from the deadline', () => {
    expect(result.response_deadline.is_specified).toBe(true);
    expect(result.response_deadline.date_string).toBe('21 June 2026');
    expect(result.response_deadline.days_remaining).not.toBeNull();
  });

  it('parses the bullet ask list', () => {
    expect(result.regulatory_ask.length).toBeGreaterThanOrEqual(3);
    expect(result.regulatory_ask[0]).toMatch(/cessation of all Naira/i);
  });

  it('parses the numbered action plan', () => {
    expect(result.action_plan.length).toBeGreaterThanOrEqual(3);
    expect(result.action_plan[0]!.urgency).toBe('IMMEDIATE');
  });

  it('keeps the draft response (bold preserved for formal emphasis)', () => {
    expect(result.draft_response).toMatch(/Dear Sir\/Ma/);
    expect(result.draft_response).toMatch(/BlockEX Trade Limited/);
  });

  it('still extracts inline citations from the markdown body', () => {
    expect(result.citations.length).toBeGreaterThanOrEqual(1);
    expect(result.citations[0]!.regulation).toMatch(/CBN VASP Guidelines 2023/);
  });
});

describe('parseAnalyserOutput — bold-wrapped headers (`**LABEL:**`)', () => {
  it('accepts headers wrapped entirely in bold markers', () => {
    const raw = `**PLAIN LANGUAGE SUMMARY:** A short summary.

**URGENCY LEVEL:** HIGH
reasoning text.`;
    const result = parseAnalyserOutput(raw);
    expect(result.plain_language_summary).toMatch(/A short summary/);
    expect(result.urgency_level).toBe('HIGH');
  });
});

describe('parseDeadline', () => {
  it('parses "21 June 2026" format', () => {
    const r = parseDeadline('21 June 2026');
    expect(r.is_specified).toBe(true);
    expect(r.date_string).toBe('21 June 2026');
    expect(r.days_remaining).not.toBeNull();
  });

  it('parses ISO 2026-06-21', () => {
    const r = parseDeadline('2026-06-21');
    expect(r.is_specified).toBe(true);
  });

  it('parses Nigerian DD/MM/YYYY', () => {
    const r = parseDeadline('21/06/2026');
    expect(r.is_specified).toBe(true);
    expect(r.days_remaining).not.toBeNull();
  });

  it('handles "Not specified"', () => {
    const r = parseDeadline('Not specified');
    expect(r.is_specified).toBe(false);
    expect(r.days_remaining).toBeNull();
    expect(r.date_string).toBeNull();
  });

  it('handles "not stated"', () => {
    const r = parseDeadline('Not stated in the notice');
    expect(r.is_specified).toBe(false);
  });

  it('keeps the raw string when date cannot be parsed', () => {
    const r = parseDeadline('Within a reasonable time');
    expect(r.is_specified).toBe(true);
    expect(r.date_string).toBe('Within a reasonable time');
    expect(r.days_remaining).toBeNull();
  });

  it('returns negative days_remaining for past deadlines', () => {
    const r = parseDeadline('2020-01-01');
    expect(r.days_remaining).toBeLessThan(0);
  });
});

describe('extractCitations', () => {
  it('captures multiple distinct citations', () => {
    const raw = `
      The platform is captured by [ISA 2025, Section 357].
      The minimum capital is set at [SEC Digital Asset Rules 2024, Rule 5.2].
      Filing obligations under [MLPPA 2022, Section 9] apply.
    `;
    const citations = extractCitations(raw);
    expect(citations).toHaveLength(3);
    expect(citations[0]!.regulation).toBe('ISA 2025');
    expect(citations[0]!.section).toBe('Section 357');
    expect(citations[2]!.regulation).toBe('MLPPA 2022');
  });

  it('de-duplicates repeated citations', () => {
    const raw = '[ISA 2025, Section 357] ... again [ISA 2025, Section 357]';
    expect(extractCitations(raw)).toHaveLength(1);
  });

  it('returns an empty array when nothing matches', () => {
    expect(extractCitations('plain text with no brackets')).toEqual([]);
  });

  it('ignores bracketed text that does not look like a citation', () => {
    // Lowercase first word — not a regulation name.
    expect(extractCitations('[note, this is just a footnote]')).toEqual([]);
  });
});
