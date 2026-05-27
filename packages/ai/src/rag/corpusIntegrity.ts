// =============================================================================
// Corpus integrity rules — detect mis-filed PDFs (e.g. MCR circular as DAR 2022).
// Used by scripts/verify-corpus.ts and ingest pre-flight checks.
// =============================================================================

/** Text that must never appear under a SEC Digital Asset Rules * source. */
export const MCR_CIRCULAR_SENTINELS = [
  'CIRCULAR Number 26-1',
  'REVISED MINIMUM CAPITAL (MC) FOR REGULATED CAPITAL MARKET ENTITIES',
] as const;

export const MCR_SOURCE_DOCUMENT =
  'SEC Circular No. 26-1 — Minimum Capital Requirements 2026';

export const MCR_SOURCE_FILE = 'NG_SEC_MCR_CIRCULAR_2026.pdf';

export function contentHasMcrCircularSentinel(text: string): boolean {
  return MCR_CIRCULAR_SENTINELS.some((s) => text.includes(s));
}

/** Normalised substring expected in the MCR VASP table for DAX. */
export const DAX_MCR_TABLE_SNIPPET = 'Digital Assets Exchange (DAX)';

export function contentHasDaxMcrThreshold(text: string): boolean {
  return (
    text.includes(DAX_MCR_TABLE_SNIPPET) &&
    /2\.00 billion/i.test(text)
  );
}
