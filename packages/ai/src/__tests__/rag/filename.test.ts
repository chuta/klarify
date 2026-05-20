import { describe, it, expect } from 'vitest';
import { parseFilename, tryParseFilename } from '../../rag/filename.js';

describe('parseFilename', () => {
  it('parses Nigerian filenames', () => {
    expect(parseFilename('NG_ISA_2025.pdf')).toMatchObject({
      jurisdiction: 'NG',
      regulationKey: 'ISA',
      year: 2025,
      documentName: 'Investments and Securities Act 2025',
    });
    expect(parseFilename('NG_MLPPA_2022.pdf').documentName).toContain('Money Laundering');
    expect(parseFilename('NG_SEC_DAR_2024.pdf').regulationKey).toBe('SEC_DAR');
  });

  it('appends year to SEC_DAR display names so amendments are distinct', () => {
    // Critical regression test — without the year suffix, ingesting
    // NG_SEC_DAR_2024 deletes NG_SEC_DAR_2023 chunks (same source_document
    // value). This MUST stay year-distinct.
    expect(parseFilename('NG_SEC_DAR_2022.pdf').documentName).toBe(
      'SEC Digital Asset Rules 2022',
    );
    expect(parseFilename('NG_SEC_DAR_2023.pdf').documentName).toBe(
      'SEC Digital Asset Rules 2023',
    );
    expect(parseFilename('NG_SEC_DAR_2024.pdf').documentName).toBe(
      'SEC Digital Asset Rules 2024',
    );
  });

  it('keeps single-year NAME_MAP entries untouched (year already inside the value)', () => {
    // ISA 2025 NAME_MAP value already contains "2025" — don't double-suffix.
    expect(parseFilename('NG_ISA_2025.pdf').documentName).toBe(
      'Investments and Securities Act 2025',
    );
    expect(parseFilename('NG_BOFIA_2020.pdf').documentName).toBe(
      'Banks and Other Financial Institutions Act 2020',
    );
  });

  it('handles FATF year-range filename', () => {
    const p = parseFilename('FATF_UPDATES_2019_2025.pdf');
    expect(p.jurisdiction).toBe('FATF');
    expect(p.regulationKey).toBe('UPDATES_2019');
    expect(p.year).toBe(2025);
    expect(p.documentName).toBe('FATF Virtual Assets Guidance 2019–2025');
  });

  it('handles ZA files without year suffix', () => {
    expect(parseFilename('ZA_FICA.pdf')).toMatchObject({
      jurisdiction: 'ZA',
      regulationKey: 'FICA',
      year: null,
    });
  });

  it('special-cases FOUNDERS_GUIDE as REF jurisdiction', () => {
    const p = parseFilename('FOUNDERS_GUIDE_2026.pdf');
    expect(p.jurisdiction).toBe('REF');
    expect(p.regulationKey).toBe('FOUNDERS_GUIDE');
    expect(p.year).toBe(2026);
    // After the SEC_DAR fix, NAME_MAP entries that don't include a year now
    // get the year appended. Founder's Guide is an edition'd reference book,
    // so suffixing the year is correct and matches how readers cite it.
    expect(p.documentName).toBe(
      "The Founder's Guide to Building in Regulated Markets 2026",
    );
  });

  it('rejects non-pdf extension', () => {
    expect(() => parseFilename('NG_ISA_2025.txt')).toThrow(/\.pdf extension/);
  });

  it('rejects unknown jurisdiction prefix', () => {
    expect(() => parseFilename('XX_FOO_2024.pdf')).toThrow(/unknown jurisdiction/);
  });

  it('rejects illegal characters', () => {
    expect(() => parseFilename('NG ISA 2025.pdf')).toThrow(/outside/);
  });
});

describe('tryParseFilename', () => {
  it('returns parsed result on success', () => {
    const p = tryParseFilename('NG_ISA_2025.pdf');
    expect(p).not.toBeNull();
    expect(p?.jurisdiction).toBe('NG');
  });

  it('returns null on parse failure', () => {
    expect(tryParseFilename('not-a-corpus-file.pdf')).toBeNull();
    expect(tryParseFilename('garbage')).toBeNull();
  });
});
