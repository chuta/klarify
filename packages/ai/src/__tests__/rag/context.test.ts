import { describe, it, expect } from 'vitest';
import { assembleContext } from '../../rag/context.js';
import type { RetrievedChunk } from '../../rag/search.js';

function chunk(
  partial: Partial<RetrievedChunk> & {
    content: string;
    sourceDocument: string;
    similarity: number;
  },
): RetrievedChunk {
  return {
    jurisdiction: 'NG',
    sectionReference: null,
    rankedScore: partial.similarity,
    metadata: {},
    ...partial,
  } as RetrievedChunk;
}

describe('assembleContext', () => {
  it('returns empty block for empty chunk list', () => {
    const result = assembleContext([], null);
    expect(result.text).toBe('');
    expect(result.chunksUsed).toBe(0);
    expect(result.tokenCount).toBe(0);
  });

  it('formats chunks with [SOURCE: doc, section] header', () => {
    const chunks = [
      chunk({
        content: 'A digital asset is defined as ...',
        sourceDocument: 'ISA 2025',
        sectionReference: 'Section 357',
        similarity: 0.92,
      }),
    ];
    const r = assembleContext(chunks, null);
    expect(r.text).toContain('[SOURCE: ISA 2025, Section 357]');
    expect(r.text).toContain('A digital asset is defined as');
    expect(r.chunksUsed).toBe(1);
  });

  it('omits section in header when null', () => {
    const chunks = [
      chunk({
        content: 'Generic provision text',
        sourceDocument: 'NDPA 2023',
        similarity: 0.88,
      }),
    ];
    const r = assembleContext(chunks, null);
    expect(r.text).toContain('[SOURCE: NDPA 2023]');
    expect(r.text).not.toContain(', null');
  });

  it('appends user profile sentence when provided', () => {
    const chunks = [
      chunk({
        content: 'Text',
        sourceDocument: 'ISA 2025',
        similarity: 0.9,
      }),
    ];
    const r = assembleContext(chunks, {
      productTypes: ['DAX'],
      targetMarkets: ['NG'],
      stage: 'building',
      readinessScore: 42,
    });
    expect(r.text).toContain('User context: Building a DAX product');
    expect(r.text).toContain('targeting NG');
    expect(r.text).toContain('at the building stage');
    expect(r.text).toContain('42/100');
  });

  it('drops profile line when profile has no useful fields', () => {
    const chunks = [
      chunk({ content: 'Text', sourceDocument: 'X', similarity: 0.9 }),
    ];
    const r = assembleContext(chunks, { productTypes: [], targetMarkets: [] });
    expect(r.text).not.toContain('User context:');
  });

  it('respects token budget but keeps top 3 chunks regardless', () => {
    const longContent = 'word '.repeat(1000); // ~1000 tokens
    const chunks = Array.from({ length: 10 }, (_, i) =>
      chunk({
        content: longContent,
        sourceDocument: `Doc ${i}`,
        similarity: 1 - i * 0.01,
      }),
    );
    // budget 800 tokens — none of the chunks would fit individually,
    // but the top 3 must still be present.
    const r = assembleContext(chunks, null, { tokenBudget: 800 });
    expect(r.chunksUsed).toBe(3);
  });

  it('over-budget overflow is bounded by chunk count', () => {
    const short = chunk({
      content: 'short snippet',
      sourceDocument: 'A',
      similarity: 0.9,
    });
    const r = assembleContext([short, short, short, short], null, {
      tokenBudget: 10_000,
    });
    expect(r.chunksUsed).toBe(4);
  });

  it('preserves rankedScore-based ordering', () => {
    const chunks = [
      chunk({
        content: 'X',
        sourceDocument: 'AlphaDoc',
        similarity: 0.6,
        rankedScore: 0.5,
      }),
      chunk({
        content: 'Y',
        sourceDocument: 'BetaDoc',
        similarity: 0.9,
        rankedScore: 0.95,
      }),
    ];
    const r = assembleContext(chunks, null);
    // BetaDoc has higher rankedScore so should appear before AlphaDoc.
    expect(r.text.indexOf('BetaDoc')).toBeLessThan(r.text.indexOf('AlphaDoc'));
  });
});
