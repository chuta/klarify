// =============================================================================
// Security contract: sanitiseDisplayFilename
//
// The S3 key is uuid-only and never derived from this string — see
// documentUpload.ts — but the value still ends up in:
//   * uploaded_documents.filename (rendered in the dashboard)
//   * Content-Disposition headers on signed downloads
//   * email subject lines (DocumentAnalysisCritical template)
//
// So defence-in-depth matters: nothing in the returned string may help
// a malicious filename pivot into path traversal, header injection, or
// XSS in our React renders.
// =============================================================================
import { describe, expect, it } from 'vitest';
import { sanitiseDisplayFilename } from '../../services/documentUpload.js';

describe('sanitiseDisplayFilename — path traversal', () => {
  it('strips ../ at the start', () => {
    expect(sanitiseDisplayFilename('../etc/passwd')).toBe('passwd');
  });

  it('strips nested ../../../', () => {
    expect(sanitiseDisplayFilename('../../../../../etc/passwd')).toBe('passwd');
  });

  it('strips Windows-style backslashes', () => {
    expect(sanitiseDisplayFilename('..\\..\\windows\\system32\\config.txt')).toBe(
      'config.txt',
    );
  });

  it('strips absolute paths', () => {
    expect(sanitiseDisplayFilename('/etc/shadow')).toBe('shadow');
  });

  it('strips C:-style absolute paths', () => {
    expect(sanitiseDisplayFilename('C:\\Users\\Admin\\NTUSER.DAT')).toBe(
      'NTUSER.DAT',
    );
  });
});

describe('sanitiseDisplayFilename — injection vectors', () => {
  it('strips NUL bytes', () => {
    expect(sanitiseDisplayFilename('report.pdf\u0000.exe')).toBe('report.pdf.exe');
  });

  it('strips CR/LF (Content-Disposition header injection)', () => {
    const out = sanitiseDisplayFilename(
      'doc.pdf\r\nContent-Type: text/html\r\n\r\n<script>alert(1)</script>',
    );
    expect(out).not.toContain('\r');
    expect(out).not.toContain('\n');
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
  });

  it('strips control characters generally', () => {
    expect(sanitiseDisplayFilename('a\u0001b\u0007c.pdf')).toBe('abc.pdf');
  });

  it('strips HTML / quote characters that could break the DOM', () => {
    const out = sanitiseDisplayFilename('<img src=x onerror="alert(1)">.pdf');
    expect(out).not.toContain('<');
    expect(out).not.toContain('>');
    expect(out).not.toContain('"');
  });

  it('strips leading dots so dotfiles are never produced', () => {
    expect(sanitiseDisplayFilename('.htaccess')).toBe('htaccess');
    expect(sanitiseDisplayFilename('....pwd')).toBe('pwd');
  });
});

describe('sanitiseDisplayFilename — normalisation', () => {
  it('preserves a normal filename', () => {
    expect(sanitiseDisplayFilename('SEC_Notice_2026-05-20.pdf')).toBe(
      'SEC_Notice_2026-05-20.pdf',
    );
  });

  it('preserves spaces', () => {
    expect(sanitiseDisplayFilename('CBN Letter 2026.pdf')).toBe('CBN Letter 2026.pdf');
  });

  it('collapses runs of underscores', () => {
    expect(sanitiseDisplayFilename('a___b___c.pdf')).toBe('a_b_c.pdf');
  });

  it('replaces disallowed characters with underscore', () => {
    expect(sanitiseDisplayFilename('crypto@$%&exchange notice!.pdf')).toBe(
      'crypto_exchange notice_.pdf',
    );
  });

  it('truncates to 120 characters', () => {
    const long = 'a'.repeat(500);
    expect(sanitiseDisplayFilename(long).length).toBeLessThanOrEqual(120);
  });
});

describe('sanitiseDisplayFilename — invalid inputs', () => {
  it('returns empty for non-string input', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitiseDisplayFilename(undefined as any)).toBe('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitiseDisplayFilename(null as any)).toBe('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(sanitiseDisplayFilename(42 as any)).toBe('');
  });

  it('returns empty for an all-stripped input', () => {
    expect(sanitiseDisplayFilename('/../../')).toBe('');
    expect(sanitiseDisplayFilename('....')).toBe('');
  });
});
