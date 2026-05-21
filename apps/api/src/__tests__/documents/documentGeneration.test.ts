// =============================================================================
// Sprint 4 — Document Generator service tests.
//
// Covers PURE units (no DB / no Claude / no S3):
//   * requireTemplate — 404s on unknown id, returns template on known id.
//   * buildFormSchema — required-field validation + multiselect option set.
//   * resolvePrefill / validatePrefillPath — synthetic-shape resolver.
//   * parseSections — markdown → structured sections.
//   * renderTemplateDocx — produces a valid .docx ZIP buffer that contains
//     the regulatory basis + the disclaimer text.
//   * docx contains the org name.
// =============================================================================
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';

/**
 * Extract the concatenated text content of a generated .docx by unzipping
 * the archive and stripping XML tags from word/document.xml. Returns the
 * lower-cased concatenation so substring assertions are case-insensitive.
 */
async function extractDocxText(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  let text = '';
  for (const name of Object.keys(zip.files)) {
    if (!name.endsWith('.xml')) continue;
    const raw = await zip.files[name]!.async('string');
    text += raw.replace(/<[^>]+>/g, ' ');
  }
  return text.toLowerCase();
}
import {
  DocumentGenerationError,
  buildFormSchema,
  parseSections,
  renderTemplateDocx,
  requireTemplate,
  resolvePrefill,
  validatePrefillPath,
} from '../../services/documentGeneration.js';
import { DOCUMENT_TEMPLATES } from '@klarify/ai/prompts/documents';

// =============================================================================
// requireTemplate
// =============================================================================
describe('requireTemplate', () => {
  it('returns template on valid id', () => {
    const t = requireTemplate('BWRA');
    expect(t.templateId).toBe('BWRA');
  });

  it('throws TEMPLATE_NOT_FOUND on unknown id', () => {
    try {
      requireTemplate('NOT_A_TEMPLATE');
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(DocumentGenerationError);
      expect((err as DocumentGenerationError).code).toBe('TEMPLATE_NOT_FOUND');
      expect((err as DocumentGenerationError).httpStatus).toBe(404);
    }
  });
});

// =============================================================================
// buildFormSchema
// =============================================================================
describe('buildFormSchema', () => {
  it('rejects payload missing a required text field', () => {
    const t = DOCUMENT_TEMPLATES.BWRA;
    const schema = buildFormSchema(t);
    const result = schema.safeParse({}); // empty
    expect(result.success).toBe(false);
  });

  it('rejects multiselect with no values when required', () => {
    const t = DOCUMENT_TEMPLATES.BWRA;
    const schema = buildFormSchema(t);
    const result = schema.safeParse({
      company_name: 'Acme Crypto',
      product_types: [], // empty — fails min(1)
      target_markets: ['NG'],
      business_description: 'A short description.',
      key_risk_areas: ['MONEY_LAUNDERING'],
      customer_base_size: '0-100',
      existing_controls: 'None yet',
      compliance_officer_name: 'Officer One',
      assessment_date: '2026-05-21',
    });
    expect(result.success).toBe(false);
  });

  it('rejects multiselect with out-of-range option', () => {
    const t = DOCUMENT_TEMPLATES.BWRA;
    const schema = buildFormSchema(t);
    const result = schema.safeParse({
      company_name: 'Acme Crypto',
      product_types: ['NOT_A_REAL_OPTION'],
      target_markets: ['NG'],
      business_description: 'desc desc desc',
      key_risk_areas: ['MONEY_LAUNDERING'],
      customer_base_size: '0-100',
      existing_controls: 'None',
      compliance_officer_name: 'Officer',
      assessment_date: '2026-05-21',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid BWRA payload', () => {
    const t = DOCUMENT_TEMPLATES.BWRA;
    const schema = buildFormSchema(t);
    const result = schema.safeParse({
      company_name: 'Acme Crypto Limited',
      product_types: ['DAX'],
      target_markets: ['NG'],
      business_description: 'We run a crypto exchange.',
      key_risk_areas: ['MONEY_LAUNDERING', 'SANCTIONS'],
      customer_base_size: '101-1000',
      existing_controls: 'NIN + BVN verification.',
      compliance_officer_name: 'Compliance Officer',
      assessment_date: '2026-05-21',
    });
    expect(result.success).toBe(true);
  });

  it('rejects bad select value', () => {
    const t = DOCUMENT_TEMPLATES.BWRA;
    const schema = buildFormSchema(t);
    const result = schema.safeParse({
      company_name: 'Acme',
      product_types: ['DAX'],
      target_markets: ['NG'],
      business_description: 'desc',
      key_risk_areas: ['MONEY_LAUNDERING'],
      customer_base_size: 'NOT_A_BUCKET',
      existing_controls: 'x',
      compliance_officer_name: 'x',
      assessment_date: '2026-05-21',
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// resolvePrefill / validatePrefillPath
// =============================================================================
describe('resolvePrefill', () => {
  const ctx = {
    org: { name: 'Acme', plan: 'navigator' },
    user: { name: 'Jane', email: 'jane@example.com' },
    profile: {
      productTypes: ['DAX'],
      targetMarkets: ['NG'],
      stage: 'building',
      teamSize: 5,
    },
    today: '2026-05-21',
  };

  it('resolves a 2-segment path', () => {
    expect(resolvePrefill('org.name', ctx)).toBe('Acme');
  });
  it('resolves a scalar root (today)', () => {
    expect(resolvePrefill('today', ctx)).toBe('2026-05-21');
  });
  it('returns undefined for unknown path', () => {
    expect(resolvePrefill('org.notReal', ctx)).toBeUndefined();
  });
  it('returns undefined when path traverses through a non-object', () => {
    expect(resolvePrefill('today.something', ctx)).toBeUndefined();
  });
});

describe('validatePrefillPath', () => {
  it('accepts every prefillFrom path used across all 9 templates', () => {
    for (const t of Object.values(DOCUMENT_TEMPLATES)) {
      for (const f of t.requiredFields) {
        if (!f.prefilledFrom) continue;
        expect(
          validatePrefillPath(f.prefilledFrom),
          `Template ${t.templateId}.${f.key} prefilledFrom="${f.prefilledFrom}"`,
        ).toBe(true);
      }
    }
  });
  it('rejects an unknown path', () => {
    expect(validatePrefillPath('org.someOtherField')).toBe(false);
    expect(validatePrefillPath('foo.bar')).toBe(false);
    expect(validatePrefillPath('')).toBe(false);
  });
});

// =============================================================================
// parseSections
// =============================================================================
describe('parseSections', () => {
  it('extracts ## headings into separate sections', () => {
    const md =
      '## 1. Summary\nFirst section body.\n\n## 2. Methodology\nSecond section body.';
    const sections = parseSections(md, 'TEST BASIS');
    expect(sections).toHaveLength(2);
    expect(sections[0]!.title).toBe('1. Summary');
    expect(sections[1]!.title).toBe('2. Methodology');
    expect(sections.every((s) => s.regulatoryBasis === 'TEST BASIS')).toBe(true);
  });

  it('keeps ### sub-headings as body content of their parent', () => {
    const md =
      '## Section A\n### Sub-A1\nBody under sub.\n### Sub-A2\nMore body.\n\n## Section B\nB body.';
    const sections = parseSections(md, 'B');
    expect(sections).toHaveLength(2);
    expect(sections[0]!.title).toBe('Section A');
    expect(sections[0]!.content).toContain('Sub-A1');
    expect(sections[0]!.content).toContain('Sub-A2');
  });

  it('falls back to a single Document section when no ## headings', () => {
    const md = 'Plain paragraph with no headings at all.';
    const sections = parseSections(md, 'B');
    expect(sections).toHaveLength(1);
    expect(sections[0]!.title).toBe('Document');
  });
});

// =============================================================================
// renderTemplateDocx — produces a valid .docx ZIP containing required text.
// =============================================================================
describe('renderTemplateDocx', () => {
  it('returns a Buffer whose first bytes are the ZIP magic number', async () => {
    const buf = await renderTemplateDocx({
      template: DOCUMENT_TEMPLATES.BWRA,
      companyName: 'Acme Crypto Limited',
      markdown: '## 1. Summary\nThis is the summary.\n\n## 2. Body\nBody text.',
    });
    expect(buf.length).toBeGreaterThan(0);
    // .docx is a ZIP archive — first four bytes are PK\x03\x04.
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
    expect(buf[2]).toBe(0x03);
    expect(buf[3]).toBe(0x04);
  });

  it('includes the company name in the rendered document', async () => {
    const buf = await renderTemplateDocx({
      template: DOCUMENT_TEMPLATES.AML_POLICY,
      companyName: 'Bayse Markets Ltd',
      markdown: '## Policy Statement\nWe commit to AML/CFT.',
    });
    const text = await extractDocxText(buf);
    expect(text).toContain('bayse markets ltd');
  });

  it('includes the regulatory basis in the rendered document', async () => {
    const buf = await renderTemplateDocx({
      template: DOCUMENT_TEMPLATES.BWRA,
      companyName: 'Acme',
      markdown: '## A\nbody.',
    });
    const text = await extractDocxText(buf);
    expect(text).toContain('nfiu guidelines');
  });

  it('includes the disclaimer footer text', async () => {
    const buf = await renderTemplateDocx({
      template: DOCUMENT_TEMPLATES.KYC_TIERS,
      companyName: 'Acme',
      markdown: '## A\nbody.',
    });
    const text = await extractDocxText(buf);
    expect(text).toContain('not legal advice');
    expect(text).toContain('klarify');
  });
});
