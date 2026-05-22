// =============================================================================
// scoreRecalculation.ts — full resync of the readiness score from persistent
// state (CLAUDE.md §16 Rule 6: score must update in real time).
//
// Unlike flipIndicatorAndRecalc (a single indicator flip inside a WithRls
// transaction), recalculateScore is a standalone, fire-and-forget rebuild that:
//   1. Loads the latest snapshot to get the current indicator state.
//   2. Overlays all completed roadmap tasks whose indicatorKey is set
//      (tasks are authoritative — if the task is done, the indicator is true).
//   3. Recomputes dimension scores and the weighted total.
//   4. Persists a new readiness_scores row (history point).
//
// Call sites: document analysis completion, ARIP stage changes, and any
// event that changes compliance state without going through flipIndicatorAndRecalc.
// =============================================================================

import type { ReadinessScore } from '@prisma/client';
import {
  DIMENSION_INDICATORS,
  DIMENSION_WEIGHTS,
  calculateReadinessScore,
  indicatorsToDimensionScores,
  setIndicator,
  type DimensionKey,
  type IndicatorState,
} from '@klarify/core';
import { prisma } from '../db.js';
import { parseSnapshotToIndicatorState } from './roadmapService.js';

/**
 * Rebuild the readiness score from scratch for the given org and persist
 * a new snapshot row. Safe to call fire-and-forget:
 *   void recalculateScore(orgId).catch((e) => console.error('[recalc]', e));
 */
export async function recalculateScore(orgId: string): Promise<ReadinessScore> {
  // 1. Load current indicator state from latest score snapshot.
  const latestScore = await prisma.readinessScore.findFirst({
    where: { orgId },
    orderBy: { calculatedAt: 'desc' },
  });
  let state: IndicatorState = parseSnapshotToIndicatorState(latestScore?.snapshot ?? null);

  // 2. Load all completed tasks with a linked indicatorKey and set them true.
  //    Tasks are authoritative: if a founder marked it done, the indicator fires.
  const completedTasks = await prisma.roadmapTask.findMany({
    where: { orgId, status: 'complete', indicatorKey: { not: null }, deletedAt: null },
    select: { indicatorKey: true },
  });

  const validDims = Object.keys(DIMENSION_WEIGHTS) as DimensionKey[];
  for (const task of completedTasks) {
    const key = task.indicatorKey!;
    const dotIdx = key.indexOf('.');
    if (dotIdx === -1) continue;
    const dim = key.slice(0, dotIdx) as DimensionKey;
    const ind = key.slice(dotIdx + 1);
    if (!validDims.includes(dim)) continue;
    if (!(DIMENSION_INDICATORS[dim] as readonly string[]).includes(ind)) continue;
    state = setIndicator(
      state,
      dim,
      ind as Parameters<typeof setIndicator>[2],
      true,
    );
  }

  // 3. Compute per-dimension scores (0–100) and weighted total.
  const dims = indicatorsToDimensionScores(state);
  const totalScore = calculateReadinessScore(dims);

  // 4. Persist a new history snapshot row.
  const record = await prisma.readinessScore.create({
    data: {
      orgId,
      totalScore,
      corporateStructure:       dims.corporate_structure,
      capitalLicensing:         dims.capital_licensing,
      kycInfrastructure:        dims.kyc_infrastructure,
      amlCftProgramme:          dims.aml_cft_programme,
      transactionMonitoring:    dims.transaction_monitoring,
      regulatoryReporting:      dims.regulatory_reporting,
      regulatoryRelationships:  dims.regulatory_relationships,
      productClassification:    dims.product_classification,
      snapshot: state,
    },
  });

  return record;
}
