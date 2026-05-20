// Pure unit tests for the chunker — no network, no DB, no PDF parsing.
import { describe, it, expect } from 'vitest';
import { chunkText, detectSectionHeader } from '../../rag/chunker.js';

describe('detectSectionHeader', () => {
  it('matches SECTION + number', () => {
    expect(detectSectionHeader('SECTION 357 — Definitions')).toBe('SECTION 357 — Definitions');
    expect(detectSectionHeader('Section 4(1) Application')).toBe('Section 4(1) Application');
  });

  it('matches RULE / PART / CHAPTER', () => {
    expect(detectSectionHeader('Rule 5.2(a)')).toBe('Rule 5.2(a)');
    expect(detectSectionHeader('PART III - General Provisions')).toBe(
      'PART III - General Provisions',
    );
    expect(detectSectionHeader('Chapter 2 Money Laundering')).toBe(
      'Chapter 2 Money Laundering',
    );
  });

  it('matches numeric subsection heading', () => {
    expect(detectSectionHeader('4.1 KYC Tiering Framework')).toBe(
      '4.1 KYC Tiering Framework',
    );
  });

  it('matches short ALL-CAPS line', () => {
    expect(detectSectionHeader('DEFINITIONS')).toBe('DEFINITIONS');
  });

  it('rejects body text', () => {
    expect(detectSectionHeader('A digital asset is defined as any tokenised representation.'))
      .toBeNull();
    // ends with punctuation — looks like a sentence, not a heading
    expect(detectSectionHeader('THIS IS THE END.')).toBeNull();
    // too long
    expect(detectSectionHeader('A'.repeat(200))).toBeNull();
    expect(detectSectionHeader('')).toBeNull();
  });
});

describe('chunkText', () => {
  it('returns empty array for empty input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n   ')).toEqual([]);
  });

  it('produces at least one chunk for short input', () => {
    const result = chunkText('This is a short document about Nigerian regulation.');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]?.chunkIndex).toBe(0);
  });

  it('honours section headings — header flush + prepend', () => {
    const text =
      `SECTION 357 — Definitions\n` +
      `A digital asset is any tokenised representation of value.\n\n` +
      `SECTION 358 — Classification\n` +
      `Digital assets are classified as securities under this Act.`;
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]?.sectionHeader).toBe('SECTION 357 — Definitions');
    expect(chunks[0]?.content).toContain('[Section: SECTION 357 — Definitions]');
    expect(chunks[1]?.sectionHeader).toBe('SECTION 358 — Classification');
    expect(chunks[1]?.content).toContain('[Section: SECTION 358 — Classification]');
  });

  it('chunk indices are 0-based and contiguous', () => {
    // Real PDF text has frequent line breaks; the chunker chunks across lines.
    // ~40 lines × ~30 tokens/line = ~1200 tokens → forces at least 2 chunks at default 512.
    const lines = Array.from(
      { length: 40 },
      () =>
        'Money Laundering (Prevention and Prohibition) Act 2022 requires every VASP to register with the NFIU within 30 days of incorporation.',
    );
    const text = lines.join('\n');
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i]?.chunkIndex).toBe(i);
    }
  });

  it('respects custom targetTokens', () => {
    const lines = Array.from(
      { length: 200 },
      (_, i) => `Lorem ipsum dolor sit amet ${i}, consectetur adipiscing elit.`,
    );
    const text = lines.join('\n');
    const small = chunkText(text, { targetTokens: 100, overlapTokens: 10 });
    const large = chunkText(text, { targetTokens: 500, overlapTokens: 10 });
    expect(small.length).toBeGreaterThan(large.length);
  });
});
