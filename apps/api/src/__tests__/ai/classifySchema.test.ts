// =============================================================================
// Classification schema regression tests.
//
// These exercise the *result-parsing* layer of POST /api/ai/classify with
// hand-crafted Claude-style outputs that mirror the four fixtures called out
// in the Sprint 2 plan:
//
//   (a) BTC/USDT vs naira exchange   → DAX, SEC primary, CBN secondary, CRITICAL
//   (b) Tokenised real estate        → DAOP + dual_licence DAC, CRITICAL
//   (c) USDT P2P wallet (no trading) → PAYMENT/DAC, CBN, HIGH
//   (d) DeFi DAO governance token    → DAOP-likely, uncertainty language
//
// We do not call the live Claude API here — that's a Sprint Close manual
// verification step. The point of this suite is to lock the *contract*
// between Claude and our persistence layer, so a future prompt drift can't
// silently break the parse step without us noticing.
// =============================================================================
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Re-declare the schema locally — must stay in sync with apps/api/src/routes/ai/classify.ts.
const RequiredLicenceSchema = z.object({
  name: z.string(),
  regulator: z.string(),
  url: z.string().url().nullable().optional(),
  urgency: z.enum(['CRITICAL', 'HIGH', 'MEDIUM']),
});

const CitationSchema = z.object({
  regulation: z.string(),
  section: z.string(),
  relevance: z.string().optional(),
});

const ClassificationResultSchema = z.object({
  primary_category: z.enum(['DAX', 'DAOP', 'DAC', 'DAI', 'PAYMENT', 'HYBRID']),
  secondary_categories: z.array(z.string()).default([]),
  primary_regulator: z.enum(['SEC_NIGERIA', 'CBN', 'BOTH']),
  secondary_regulators: z.array(z.string()).default([]),
  required_licences: z.array(RequiredLicenceSchema).default([]),
  risk_if_unlicensed: z.enum(['CRITICAL', 'HIGH', 'MEDIUM']),
  dual_licence_required: z.boolean().default(false),
  reasoning: z.string().min(1),
  citations: z.array(CitationSchema).default([]),
});

// Inline the JSON extractor — copy-paste from classify.ts. If the algorithm
// changes there, change it here too.
function extractJsonObject(raw: string): unknown {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenced && fenced[1]) text = fenced[1].trim();
  if (!text.startsWith('{')) {
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first >= 0 && last > first) text = text.slice(first, last + 1);
  }
  return JSON.parse(text);
}

describe('extractJsonObject', () => {
  it('parses naked JSON', () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });
  it('strips ```json fences', () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('strips bare ``` fences', () => {
    expect(extractJsonObject('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('locates JSON inside chatter', () => {
    expect(
      extractJsonObject('Here is the result:\n\n{"a":1}\n\nLet me know.'),
    ).toEqual({ a: 1 });
  });
});

describe('ClassificationResultSchema — Sprint 2 fixtures', () => {
  it('(a) BTC/USDT naira exchange → DAX / SEC + CBN / CRITICAL', () => {
    const result = ClassificationResultSchema.parse({
      primary_category: 'DAX',
      secondary_categories: [],
      primary_regulator: 'SEC_NIGERIA',
      secondary_regulators: ['CBN'],
      required_licences: [
        {
          name: 'SEC Digital Asset Exchange Registration',
          regulator: 'SEC_NIGERIA',
          url: 'https://sec.gov.ng',
          urgency: 'CRITICAL',
        },
      ],
      risk_if_unlicensed: 'CRITICAL',
      dual_licence_required: false,
      reasoning:
        'The product enables secondary market trading between buyers and sellers of digital assets paired with naira, which is the functional definition of a DAX under SEC Digital Asset Rules. CBN engagement is required for naira on/off-ramps.',
      citations: [
        {
          regulation: 'SEC Digital Asset Rules 2024',
          section: 'Rule 1.2',
          relevance: 'Defines DAX as platforms facilitating secondary trading.',
        },
      ],
    });
    expect(result.primary_category).toBe('DAX');
    expect(result.primary_regulator).toBe('SEC_NIGERIA');
    expect(result.secondary_regulators).toContain('CBN');
    expect(result.risk_if_unlicensed).toBe('CRITICAL');
  });

  it('(b) Tokenised real estate → DAOP + dual_licence DAC', () => {
    const result = ClassificationResultSchema.parse({
      primary_category: 'DAOP',
      secondary_categories: ['DAC'],
      primary_regulator: 'SEC_NIGERIA',
      secondary_regulators: [],
      required_licences: [
        {
          name: 'SEC Digital Asset Offering Platform Registration',
          regulator: 'SEC_NIGERIA',
          url: 'https://sec.gov.ng',
          urgency: 'CRITICAL',
        },
        {
          name: 'SEC Digital Asset Custodian Registration',
          regulator: 'SEC_NIGERIA',
          url: 'https://sec.gov.ng',
          urgency: 'CRITICAL',
        },
      ],
      risk_if_unlicensed: 'CRITICAL',
      dual_licence_required: true,
      reasoning:
        'Tokenising real estate is a primary issuance of investment products (DAOP). Holding the tokens on behalf of investors is custody (DAC). Both registrations are required.',
      citations: [],
    });
    expect(result.primary_category).toBe('DAOP');
    expect(result.secondary_categories).toContain('DAC');
    expect(result.dual_licence_required).toBe(true);
    expect(result.required_licences).toHaveLength(2);
  });

  it('(c) USDT P2P wallet → PAYMENT or DAC, CBN primary, HIGH', () => {
    const result = ClassificationResultSchema.parse({
      primary_category: 'PAYMENT',
      secondary_categories: ['DAC'],
      primary_regulator: 'CBN',
      secondary_regulators: [],
      required_licences: [
        {
          name: 'CBN Payment Service Engagement',
          regulator: 'CBN',
          url: 'https://cbn.gov.ng',
          urgency: 'HIGH',
        },
      ],
      risk_if_unlicensed: 'HIGH',
      dual_licence_required: false,
      reasoning:
        'A pure P2P stablecoin wallet without exchange or investment features falls under payment infrastructure. CBN engagement is required because the product touches naira on/off-ramps.',
      citations: [],
    });
    expect(['PAYMENT', 'DAC']).toContain(result.primary_category);
    expect(result.primary_regulator).toBe('CBN');
    expect(result.risk_if_unlicensed).toBe('HIGH');
  });

  it('(d) DeFi DAO governance token → DAOP-likely with uncertainty in reasoning', () => {
    const result = ClassificationResultSchema.parse({
      primary_category: 'DAOP',
      secondary_categories: [],
      primary_regulator: 'SEC_NIGERIA',
      secondary_regulators: [],
      required_licences: [
        {
          name: 'SEC Engagement — Token Classification Review',
          regulator: 'SEC_NIGERIA',
          url: null,
          urgency: 'HIGH',
        },
      ],
      risk_if_unlicensed: 'HIGH',
      dual_licence_required: false,
      reasoning:
        "Note: this area is still developing. DAO governance tokens that carry economic return rights are likely DAOP under ISA 2025's broad securities definition, but case-specific facts matter. I am not certain — engage SEC directly before launch.",
      citations: [
        {
          regulation: 'ISA 2025',
          section: 'Section 357',
          relevance: 'Defines securities to include digital assets with investment characteristics.',
        },
      ],
    });
    expect(result.primary_category).toBe('DAOP');
    expect(result.reasoning.toLowerCase()).toMatch(/not certain|still developing|likely/);
  });

  it('rejects unknown primary_category', () => {
    const bad = ClassificationResultSchema.safeParse({
      primary_category: 'UNKNOWN',
      primary_regulator: 'SEC_NIGERIA',
      risk_if_unlicensed: 'HIGH',
      reasoning: 'x',
    });
    expect(bad.success).toBe(false);
  });

  it('rejects unknown risk level', () => {
    const bad = ClassificationResultSchema.safeParse({
      primary_category: 'DAX',
      primary_regulator: 'SEC_NIGERIA',
      risk_if_unlicensed: 'LOW',
      reasoning: 'x',
    });
    expect(bad.success).toBe(false);
  });

  it('rejects empty reasoning', () => {
    const bad = ClassificationResultSchema.safeParse({
      primary_category: 'DAX',
      primary_regulator: 'SEC_NIGERIA',
      risk_if_unlicensed: 'HIGH',
      reasoning: '',
    });
    expect(bad.success).toBe(false);
  });
});
