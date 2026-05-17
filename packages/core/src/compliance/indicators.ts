// Indicator state management — builds on top of DIMENSION_INDICATORS from readinessScore.ts.
// CLAUDE.md §8 — Do not redefine DIMENSION_WEIGHTS or DIMENSION_INDICATORS here.

import {
  DIMENSION_INDICATORS,
  DIMENSION_WEIGHTS,
  type DimensionKey,
  type DimensionScores,
  calculateDimensionScore,
} from './readinessScore.js';

/**
 * Full indicator state — every indicator keyed by dimension, value is true/false.
 */
export type IndicatorState = {
  [D in DimensionKey]: Record<(typeof DIMENSION_INDICATORS)[D][number], boolean>;
};

/**
 * Factory — creates an all-false initial IndicatorState.
 */
export function createEmptyIndicatorState(): IndicatorState {
  const dimensionKeys = Object.keys(DIMENSION_WEIGHTS) as DimensionKey[];
  const result = {} as IndicatorState;
  for (const dim of dimensionKeys) {
    const indicators = DIMENSION_INDICATORS[dim] as readonly string[];
    const dimRecord = {} as Record<string, boolean>;
    for (const ind of indicators) {
      dimRecord[ind] = false;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result as any)[dim] = dimRecord;
  }
  return result;
}

/**
 * Update a single indicator and return a new state (immutable).
 */
export function setIndicator<D extends DimensionKey>(
  state: IndicatorState,
  dimension: D,
  indicator: (typeof DIMENSION_INDICATORS)[D][number],
  value: boolean,
): IndicatorState {
  return {
    ...state,
    [dimension]: {
      ...state[dimension],
      [indicator]: value,
    },
  };
}

/**
 * Apply a list of "dimension.indicator_key" strings (format from onboarding step 5)
 * and return a new state with those indicators set to true.
 */
export function applyExistingInfrastructure(
  state: IndicatorState,
  existingKeys: string[],
): IndicatorState {
  let current = state;
  for (const key of existingKeys) {
    const dotIndex = key.indexOf('.');
    if (dotIndex === -1) continue;
    const dim = key.slice(0, dotIndex) as DimensionKey;
    const ind = key.slice(dotIndex + 1);
    const dimensionKeys = Object.keys(DIMENSION_WEIGHTS) as DimensionKey[];
    if (!dimensionKeys.includes(dim)) continue;
    const validIndicators = DIMENSION_INDICATORS[dim] as readonly string[];
    if (!validIndicators.includes(ind)) continue;
    current = setIndicator(
      current,
      dim,
      ind as (typeof DIMENSION_INDICATORS)[typeof dim][number],
      true,
    );
  }
  return current;
}

/**
 * Compute DimensionScores from IndicatorState — ready to pass to calculateReadinessScore().
 * CLAUDE.md §16 Rule 6: score must reflect current state in real time.
 */
export function indicatorsToDimensionScores(state: IndicatorState): DimensionScores {
  const dimensionKeys = Object.keys(DIMENSION_WEIGHTS) as DimensionKey[];
  const result = {} as DimensionScores;
  for (const dim of dimensionKeys) {
    result[dim] = calculateDimensionScore(
      dim,
      state[dim] as Partial<Record<(typeof DIMENSION_INDICATORS)[typeof dim][number], boolean>>,
    );
  }
  return result;
}
