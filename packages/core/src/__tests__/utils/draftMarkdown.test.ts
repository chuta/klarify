// =============================================================================
// Draft-letter markdown helpers — used by the .docx exporter and the web
// preview. Tests pin down the practical behaviour we need:
//
//   * `**bold**` runs survive into a structured segment list.
//   * `---` horizontal rules disappear (they're visual-only).
//   * Address-style blocks keep their line breaks (sender / recipient).
//   * Prose paragraphs are folded onto a single line.
//   * `Dear ... / Yours sincerely` is the canonical complete-letter signal.
//   * Clipboard strip leaves no markdown markers behind.
// =============================================================================
import { describe, expect, it } from 'vitest';
import {
  parseInlineMarkdown,
  isHorizontalRule,
  stripHeadingMarker,
  parseDraftBody,
  draftIncludesLetterhead,
  stripMarkdownToPlainText,
  markdownToHtml,
  htmlToMarkdown,
} from '../../utils/draftMarkdown.js';

describe('parseInlineMarkdown', () => {
  it('returns a single plain segment for unmarked text', () => {
    expect(parseInlineMarkdown('Plain text')).toEqual([
      { text: 'Plain text' },
    ]);
  });

  it('extracts a single `**bold**` run', () => {
    expect(parseInlineMarkdown('Hello **world**!')).toEqual([
      { text: 'Hello ' },
      { text: 'world', bold: true },
      { text: '!' },
    ]);
  });

  it('handles multiple bold runs on one line', () => {
    expect(parseInlineMarkdown('**A** and **B** and **C**')).toEqual([
      { text: 'A', bold: true },
      { text: ' and ' },
      { text: 'B', bold: true },
      { text: ' and ' },
      { text: 'C', bold: true },
    ]);
  });

  it('handles bold-only line', () => {
    expect(parseInlineMarkdown('**BlockEX Trade Limited**')).toEqual([
      { text: 'BlockEX Trade Limited', bold: true },
    ]);
  });

  it('handles bold prefix with plain suffix (label: value pattern)', () => {
    expect(parseInlineMarkdown('**Date:** [Insert Date]')).toEqual([
      { text: 'Date:', bold: true },
      { text: ' [Insert Date]' },
    ]);
  });

  it('leaves dangling `**` as literal text', () => {
    // Opus occasionally truncates mid-bold. Don't lose the asterisks.
    const segments = parseInlineMarkdown('Hello **world');
    const text = segments.map((s) => s.text).join('');
    expect(text).toContain('Hello');
    expect(text).toContain('world');
  });

  it('returns empty array for empty input', () => {
    expect(parseInlineMarkdown('')).toEqual([]);
  });
});

describe('isHorizontalRule', () => {
  it.each([
    ['---', true],
    ['***', true],
    ['___', true],
    ['- - -', true],
    ['  ---  ', true],
    ['------', true],
    ['--', false], // only two dashes
    ['some text', false],
    ['---text', false],
    ['', false],
  ])('classifies %p as %p', (input, expected) => {
    expect(isHorizontalRule(input)).toBe(expected);
  });
});

describe('stripHeadingMarker', () => {
  it('strips `# Heading`', () => {
    expect(stripHeadingMarker('# Big')).toEqual({ text: 'Big', isHeading: true });
  });
  it('strips `### Heading`', () => {
    expect(stripHeadingMarker('### Smaller')).toEqual({
      text: 'Smaller',
      isHeading: true,
    });
  });
  it('leaves non-heading lines untouched', () => {
    expect(stripHeadingMarker('Just text')).toEqual({
      text: 'Just text',
      isHeading: false,
    });
  });
  it('does NOT match `#hashtag` (no space)', () => {
    expect(stripHeadingMarker('#tag')).toEqual({
      text: '#tag',
      isHeading: false,
    });
  });
});

describe('parseDraftBody', () => {
  it('removes horizontal rule blocks entirely', () => {
    const result = parseDraftBody('First paragraph.\n\n---\n\nSecond paragraph.');
    expect(result).toHaveLength(2);
    expect(result[0]!.segments[0]!.text).toMatch(/First/);
    expect(result[1]!.segments[0]!.text).toMatch(/Second/);
  });

  it('preserves address-block line breaks', () => {
    // Multi-line sender header — each line should become its own paragraph.
    const block = `**BlockEX Trade Limited**
14 Admiralty Way, Lekki Phase 1, Lagos
chimeziechuta@gmail.com`;
    const result = parseDraftBody(block);
    expect(result).toHaveLength(3);
    expect(result[0]!.segments[0]!.bold).toBe(true);
    expect(result[1]!.segments[0]!.text).toMatch(/Admiralty Way/);
  });

  it('folds prose paragraphs onto a single line', () => {
    const prose = `We acknowledge receipt of your notice and have engaged regulatory counsel.
We are committed to a full response within the stipulated 30-day window.`;
    const result = parseDraftBody(prose);
    // Prose lines end in `.` → not an address block → folded.
    expect(result).toHaveLength(1);
    const joined = result[0]!.segments.map((s) => s.text).join('');
    expect(joined).toMatch(/acknowledge receipt/);
    expect(joined).toMatch(/30-day window/);
  });

  it('parses the BlockEX live-API output without crashing', () => {
    const blockex = `---

**BlockEX Trade Limited**
14 Admiralty Way, Lekki Phase 1, Lagos

**Date:** [Insert Date]

**The Director**
Digital Assets & Emerging Technologies Division
Securities and Exchange Commission Nigeria
SEC Tower, Plot 272, Samuel Adesujo Ademulegun Street
Central Business District, Abuja

**Via Email:** daet@sec.gov.ng

**Re: SEC/DAET/VAS/2026/INQ/0213 — Acknowledgment of Regulatory Inquiry**

Dear Mrs. F.A. Okonkwo,

We write to acknowledge receipt of the Commission's Regulatory Inquiry Notice.

Yours sincerely,
Compliance Officer
On behalf of BlockEX Trade Limited`;
    const result = parseDraftBody(blockex);
    // No `---` paragraph should survive.
    for (const p of result) {
      const flat = p.segments.map((s) => s.text).join('');
      expect(isHorizontalRule(flat)).toBe(false);
    }
    // Company name renders bold.
    const companyPara = result.find((p) =>
      p.segments.some((s) => s.text === 'BlockEX Trade Limited' && s.bold),
    );
    expect(companyPara).toBeDefined();
    // The "Re:" line keeps its bold formatting.
    const reLine = result.find((p) =>
      p.segments.some((s) =>
        s.text.startsWith('Re: SEC/DAET') && s.bold === true,
      ),
    );
    expect(reLine).toBeDefined();
  });
});

describe('draftIncludesLetterhead', () => {
  it('returns true for a complete letter (greeting + sign-off)', () => {
    const letter = `**BlockEX Trade Limited**

Dear Mrs. Okonkwo,

We acknowledge receipt.

Yours sincerely,
Compliance Officer`;
    expect(draftIncludesLetterhead(letter)).toBe(true);
  });

  it('accepts "Sincerely yours" / "Best regards" variants', () => {
    expect(
      draftIncludesLetterhead('Dear Sir/Ma,\nbody.\n\nSincerely yours,\nA.B.'),
    ).toBe(true);
    expect(
      draftIncludesLetterhead('Dear Director,\nbody.\n\nBest regards,\nA.B.'),
    ).toBe(true);
  });

  it('returns false when sign-off is missing', () => {
    const partial = 'Dear Sir/Ma,\n\nbody only.';
    expect(draftIncludesLetterhead(partial)).toBe(false);
  });

  it('returns false when greeting is missing', () => {
    const partial = 'body only.\n\nYours sincerely,\nA.B.';
    expect(draftIncludesLetterhead(partial)).toBe(false);
  });

  it('returns false for an empty draft', () => {
    expect(draftIncludesLetterhead('')).toBe(false);
  });
});

describe('markdownToHtml', () => {
  it('wraps plain prose in <p>', () => {
    expect(markdownToHtml('Hello world.')).toBe('<p>Hello world.</p>');
  });

  it('renders **bold** as <strong>', () => {
    expect(markdownToHtml('Hello **world**.')).toBe(
      '<p>Hello <strong>world</strong>.</p>',
    );
  });

  it('renders headings as <h2>', () => {
    expect(markdownToHtml('## Section')).toBe('<h2>Section</h2>');
  });

  it('produces one <p> per address-block line', () => {
    const md = `**BlockEX Trade Limited**
14 Admiralty Way, Lagos
chimezie@blockex.ng`;
    const html = markdownToHtml(md);
    expect(html).toContain('<p><strong>BlockEX Trade Limited</strong></p>');
    expect(html).toContain('<p>14 Admiralty Way, Lagos</p>');
    expect(html).toContain('<p>chimezie@blockex.ng</p>');
  });

  it('escapes HTML special chars in the source', () => {
    expect(markdownToHtml('5 < 10 & 6 > 2')).toContain('5 &lt; 10 &amp; 6 &gt; 2');
  });

  it('drops `---` horizontal rules cleanly', () => {
    const html = markdownToHtml('Paragraph A.\n\n---\n\nParagraph B.');
    expect(html).not.toContain('---');
    expect(html).toContain('Paragraph A');
    expect(html).toContain('Paragraph B');
  });

  it('returns a single empty <p> for empty input', () => {
    expect(markdownToHtml('')).toBe('<p></p>');
  });
});

describe('htmlToMarkdown', () => {
  it('unwraps a single paragraph', () => {
    expect(htmlToMarkdown('<p>Hello world.</p>')).toBe('Hello world.');
  });

  it('converts <strong> to **bold**', () => {
    expect(htmlToMarkdown('<p>Hello <strong>world</strong>.</p>')).toBe(
      'Hello **world**.',
    );
  });

  it('also handles <b>', () => {
    expect(htmlToMarkdown('<p>Hello <b>world</b>.</p>')).toBe(
      'Hello **world**.',
    );
  });

  it('converts <em>/<i> to single-asterisk italic', () => {
    expect(htmlToMarkdown('<p>Note <em>well</em>.</p>')).toBe('Note *well*.');
    expect(htmlToMarkdown('<p>Note <i>well</i>.</p>')).toBe('Note *well*.');
  });

  it('separates paragraphs with blank lines', () => {
    expect(htmlToMarkdown('<p>A</p><p>B</p>')).toBe('A\n\nB');
  });

  it('converts <h1>–<h6> all to `## `', () => {
    expect(htmlToMarkdown('<h1>Title</h1>')).toBe('## Title');
    expect(htmlToMarkdown('<h3>Title</h3>')).toBe('## Title');
    expect(htmlToMarkdown('<h6>Title</h6>')).toBe('## Title');
  });

  it('converts <hr> to ---', () => {
    expect(htmlToMarkdown('<p>A</p><hr><p>B</p>')).toBe('A\n\n---\n\nB');
  });

  it('converts list items to dash bullets', () => {
    const html = '<ul><li>First</li><li>Second</li></ul>';
    const md = htmlToMarkdown(html);
    expect(md).toMatch(/- First/);
    expect(md).toMatch(/- Second/);
  });

  it('decodes &nbsp; / &amp; / &lt; entities', () => {
    expect(htmlToMarkdown('<p>5 &lt; 10 &amp; 6 &gt; 2</p>')).toBe(
      '5 < 10 & 6 > 2',
    );
  });

  it('drops empty paragraphs cleanly', () => {
    expect(htmlToMarkdown('<p>A</p><p>&nbsp;</p><p>B</p>')).toMatch(/A[\s\S]*B/);
    expect(htmlToMarkdown('<p>A</p><p>&nbsp;</p><p>B</p>')).not.toMatch(
      /\n\n\n/,
    );
  });

  it('strips unknown tags but keeps their text', () => {
    expect(htmlToMarkdown('<p><span class="x">Hello</span></p>')).toBe('Hello');
  });

  it('returns empty string for empty/whitespace input', () => {
    expect(htmlToMarkdown('')).toBe('');
    expect(htmlToMarkdown('   ')).toBe('');
  });
});

describe('markdown ↔ HTML round-trip stability', () => {
  it('preserves the BlockEX letter through md → html → md', () => {
    const md = `**BlockEX Trade Limited**

Dear Mrs. Okonkwo,

We **acknowledge receipt** of your notice and have engaged regulatory counsel to assist us in preparing a full response.

Yours sincerely,

Compliance Officer`;
    const html = markdownToHtml(md);
    const roundTrip = htmlToMarkdown(html);
    // All key content survives.
    expect(roundTrip).toMatch(/\*\*BlockEX Trade Limited\*\*/);
    expect(roundTrip).toMatch(/Dear Mrs\. Okonkwo,/);
    expect(roundTrip).toMatch(/\*\*acknowledge receipt\*\*/);
    expect(roundTrip).toMatch(/Yours sincerely,/);
    expect(roundTrip).toMatch(/Compliance Officer/);
    // No HTML leaks into the markdown result.
    expect(roundTrip).not.toMatch(/<[a-z]/i);
  });

  it('lets the AI draft round-trip without losing bold runs', () => {
    const md = `**Re: Acknowledgment of Regulatory Inquiry**

Dear Sir,

Body.

Yours sincerely,`;
    expect(htmlToMarkdown(markdownToHtml(md))).toMatch(
      /\*\*Re: Acknowledgment of Regulatory Inquiry\*\*/,
    );
  });
});

describe('stripMarkdownToPlainText', () => {
  it('strips `**` bold markers', () => {
    expect(stripMarkdownToPlainText('Hello **world**!')).toBe('Hello world!');
  });
  it('strips heading prefixes', () => {
    expect(stripMarkdownToPlainText('## Section')).toBe('Section');
  });
  it('drops horizontal-rule lines', () => {
    expect(stripMarkdownToPlainText('a\n---\nb')).toBe('a\nb');
  });
  it('collapses 3+ newlines to a paragraph break', () => {
    expect(stripMarkdownToPlainText('a\n\n\n\nb')).toBe('a\n\nb');
  });
  it('handles the BlockEX letter end-to-end with no asterisks in output', () => {
    const input = `**BlockEX Trade Limited**\n14 Admiralty Way\n\n---\n\nDear Sir/Ma,\n\nBody.\n\nYours sincerely,\nA.B.`;
    const output = stripMarkdownToPlainText(input);
    expect(output).not.toContain('**');
    expect(output).not.toContain('---');
    expect(output).toMatch(/BlockEX Trade Limited/);
    expect(output).toMatch(/Yours sincerely,/);
  });
});
