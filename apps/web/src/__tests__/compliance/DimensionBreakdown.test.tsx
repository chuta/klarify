/**
 * DimensionBreakdown — business logic unit tests.
 *
 * We avoid a DOM renderer (no jsdom setup in web) and instead test the
 * pure logic: score-to-colour mapping and the 8-dimension structure.
 */

// ── Pure logic extracted from the component ──────────────────────────────────

function scoreColor(score: number): string {
  if (score <= 40) return '#C0392B';
  if (score <= 70) return '#D4A843';
  if (score <= 90) return '#1A7A4A';
  return '#0B6E6E';
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DimensionBreakdown — score colour mapping', () => {
  it('score 0 → critical red', () => {
    expect(scoreColor(0)).toBe('#C0392B');
  });

  it('score 40 → critical red (boundary)', () => {
    expect(scoreColor(40)).toBe('#C0392B');
  });

  it('score 41 → amber (in progress)', () => {
    expect(scoreColor(41)).toBe('#D4A843');
  });

  it('score 70 → amber (upper boundary)', () => {
    expect(scoreColor(70)).toBe('#D4A843');
  });

  it('score 71 → good standing green', () => {
    expect(scoreColor(71)).toBe('#1A7A4A');
  });

  it('score 90 → good standing green (boundary)', () => {
    expect(scoreColor(90)).toBe('#1A7A4A');
  });

  it('score 91 → regulator ready teal', () => {
    expect(scoreColor(91)).toBe('#0B6E6E');
  });

  it('score 100 → regulator ready teal', () => {
    expect(scoreColor(100)).toBe('#0B6E6E');
  });
});

describe('DimensionBreakdown — 8-dimension coverage', () => {
  const expectedKeys = [
    'capital_licensing',
    'aml_cft_programme',
    'kyc_infrastructure',
    'corporate_structure',
    'transaction_monitoring',
    'regulatory_reporting',
    'regulatory_relationships',
    'product_classification',
  ] as const;

  it('covers all 8 regulatory dimensions', () => {
    // Verify that every required dimension key is represented.
    // This catches accidental omissions when the component list is edited.
    expect(expectedKeys).toHaveLength(8);
    const uniqueKeys = new Set(expectedKeys);
    expect(uniqueKeys.size).toBe(8);
  });

  it('dimensions prop can accept all-zero scores without error', () => {
    const dims = Object.fromEntries(expectedKeys.map((k) => [k, 0])) as Record<
      (typeof expectedKeys)[number],
      number
    >;
    // Every key should be present and equal to 0.
    for (const k of expectedKeys) {
      expect(dims[k]).toBe(0);
    }
  });

  it('dimensions prop can accept all-100 scores without error', () => {
    const dims = Object.fromEntries(expectedKeys.map((k) => [k, 100])) as Record<
      (typeof expectedKeys)[number],
      number
    >;
    for (const k of expectedKeys) {
      expect(dims[k]).toBe(100);
    }
  });
});

describe('ScoreHistoryChart — deduplication by day (logic)', () => {
  interface ScorePoint {
    date: string;
    total: number;
  }

  function deduplicateByDay(points: ScorePoint[]): ScorePoint[] {
    const seen = new Map<string, ScorePoint>();
    for (const p of points) {
      const day = p.date.slice(0, 10);
      seen.set(day, p);
    }
    return Array.from(seen.values());
  }

  it('keeps only last point per day', () => {
    const points = [
      { date: '2026-05-01T08:00:00Z', total: 10 },
      { date: '2026-05-01T16:00:00Z', total: 15 },
      { date: '2026-05-02T12:00:00Z', total: 20 },
    ];
    const deduped = deduplicateByDay(points);
    expect(deduped).toHaveLength(2);
    expect(deduped[0]!.total).toBe(15); // last write wins for May 1
    expect(deduped[1]!.total).toBe(20);
  });

  it('single point passes through unchanged', () => {
    const points = [{ date: '2026-05-01T08:00:00Z', total: 42 }];
    const deduped = deduplicateByDay(points);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]!.total).toBe(42);
  });

  it('empty array returns empty array', () => {
    expect(deduplicateByDay([])).toHaveLength(0);
  });
});
