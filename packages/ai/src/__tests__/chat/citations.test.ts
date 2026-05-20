import { describe, it, expect } from 'vitest';
import {
  extractCitations,
  resolveCitationUrl,
} from '../../chat/citations.js';

describe('resolveCitationUrl', () => {
  it('exact match (case-insensitive)', () => {
    expect(resolveCitationUrl('ISA 2025')).toContain('sec.gov.ng');
    expect(resolveCitationUrl('isa 2025')).toContain('sec.gov.ng');
    expect(resolveCitationUrl('MLPPA 2022')).toContain('nfiu.gov.ng');
  });

  it('prefix-matches longer canonical names', () => {
    // The string in a real chat response often carries trailing context.
    expect(resolveCitationUrl('SEC Digital Asset Rules 2024 amendment')).toContain(
      'sec.gov.ng',
    );
  });

  it('prefers the longest matching key', () => {
    // "SEC DAR" and "SEC Digital Asset Rules 2024" both prefix-match
    // "SEC Digital Asset Rules 2024..." — longer key must win.
    const url = resolveCitationUrl('SEC Digital Asset Rules 2024');
    expect(url).toBeTruthy();
    expect(url).toContain('sec.gov.ng');
  });

  it('returns null when no canonical URL is known', () => {
    expect(resolveCitationUrl('Some Fake Regulation 1999')).toBeNull();
  });
});

describe('extractCitations', () => {
  it('extracts a single citation from a sentence', () => {
    const text =
      'Under [ISA 2025, Section 357], digital assets are securities.';
    const cites = extractCitations(text);
    expect(cites).toHaveLength(1);
    expect(cites[0]).toMatchObject({
      regulation: 'ISA 2025',
      section: 'Section 357',
    });
    expect(cites[0]?.url).toContain('sec.gov.ng');
  });

  it('extracts multiple citations in order', () => {
    const text =
      'See [MLPPA 2022, Section 4] and [NFIU Framework, Part III].';
    const cites = extractCitations(text);
    expect(cites.map((c) => c.regulation)).toEqual([
      'MLPPA 2022',
      'NFIU Framework',
    ]);
  });

  it('de-duplicates repeated citations', () => {
    const text =
      'Both [ISA 2025, Section 357] and again [ISA 2025, Section 357] apply.';
    expect(extractCitations(text)).toHaveLength(1);
  });

  it('returns empty array when nothing matches', () => {
    expect(extractCitations('No citations here. Just prose.')).toEqual([]);
  });

  it('ignores markdown footnotes / TODO markers', () => {
    const text =
      'Not a citation [TODO] or [^1] but this is: [ISA 2025, Section 1].';
    const cites = extractCitations(text);
    expect(cites).toHaveLength(1);
    expect(cites[0]?.regulation).toBe('ISA 2025');
  });

  it('captures rule references with parentheses', () => {
    const text = 'Under [SEC Digital Asset Rules 2024, Rule 5.2(a)] ...';
    const cites = extractCitations(text);
    expect(cites).toHaveLength(1);
    expect(cites[0]?.section).toBe('Rule 5.2(a)');
  });

  it('returns null url for unknown regulation but still extracts', () => {
    const text = '[Unknown Act 2099, Section 1] is referenced.';
    const cites = extractCitations(text);
    expect(cites).toHaveLength(1);
    expect(cites[0]?.url).toBeNull();
  });

  it('handles citations across multiple paragraphs', () => {
    const text =
      'Paragraph one mentions [ISA 2025, Section 357].\n\n' +
      'Paragraph two adds [MLPPA 2022, Section 4(1)].\n\n' +
      'Closing [Founders Guide 2026, Chapter 3].';
    const cites = extractCitations(text);
    expect(cites).toHaveLength(3);
  });

  it('stateless across calls (no lingering regex state)', () => {
    const text = '[ISA 2025, Section 357]';
    // Call twice — second call must still find the citation, not 0.
    expect(extractCitations(text)).toHaveLength(1);
    expect(extractCitations(text)).toHaveLength(1);
  });
});
