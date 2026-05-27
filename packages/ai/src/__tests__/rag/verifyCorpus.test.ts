import { describe, expect, it } from 'vitest';
import {
  contentHasDaxMcrThreshold,
  contentHasMcrCircularSentinel,
  DAX_MCR_TABLE_SNIPPET,
  MCR_CIRCULAR_SENTINELS,
} from '../../rag/corpusIntegrity.js';

describe('corpusIntegrity', () => {
  it('detects MCR circular fingerprint text', () => {
    expect(contentHasMcrCircularSentinel(MCR_CIRCULAR_SENTINELS[0]!)).toBe(true);
    expect(contentHasMcrCircularSentinel('SEC Digital Asset Rules 6.0 DAX')).toBe(false);
  });

  it('detects DAX ₦2.00 billion in VASP table text', () => {
    const row = `${DAX_MCR_TABLE_SNIPPET} 500.00 million 2.00 billion`;
    expect(contentHasDaxMcrThreshold(row)).toBe(true);
    expect(contentHasDaxMcrThreshold('Digital Assets Exchange (DAX) only')).toBe(false);
  });
});
