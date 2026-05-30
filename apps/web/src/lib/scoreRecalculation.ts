// Mirror of apps/api/src/services/scoreRecalculation.ts — Netlify Route Handlers
// use the same RLS-scoped rebuild logic as the Fly API.

import type { Prisma, ReadinessScore } from '@prisma/client';
import {
  DIMENSION_INDICATORS,
  DIMENSION_WEIGHTS,
  applyExistingInfrastructure,
  calculateReadinessScore,
  createEmptyIndicatorState,
  indicatorsToDimensionScores,
  setIndicator,
  type DimensionKey,
  type IndicatorState,
  type ReadinessReassessmentInput,
} from '@klarify/core';
import { prisma, withRls } from '@/lib/db';
import { parseSnapshotToIndicatorState } from '@/lib/roadmapService';

function copySnapshotValues(base: IndicatorState, snap: IndicatorState): IndicatorState {
  let state = base;
  for (const dim of Object.keys(DIMENSION_WEIGHTS) as DimensionKey[]) {
    for (const ind of DIMENSION_INDICATORS[dim] as readonly string[]) {
      const value = (snap[dim] as Record<string, boolean>)[ind] ?? false;
      state = setIndicator(
        state,
        dim,
        ind as Parameters<typeof setIndicator>[2],
        value,
      );
    }
  }
  return state;
}

function countTrueIndicators(state: IndicatorState): number {
  let n = 0;
  for (const dim of Object.keys(DIMENSION_WEIGHTS) as DimensionKey[]) {
    for (const ind of DIMENSION_INDICATORS[dim] as readonly string[]) {
      if ((state[dim] as Record<string, boolean>)[ind]) n += 1;
    }
  }
  return n;
}

async function resolveActorUserId(orgId: string, actorUserId?: string): Promise<string | null> {
  if (actorUserId) return actorUserId;
  const owner = await prisma.orgMember.findFirst({
    where: { orgId, role: 'owner' },
    select: { userId: true },
  });
  return owner?.userId ?? null;
}

async function overlayCompletedRoadmapTasks(
  tx: Prisma.TransactionClient,
  orgId: string,
  state: IndicatorState,
): Promise<IndicatorState> {
  const completedTasks = await tx.roadmapTask.findMany({
    where: { orgId, status: 'complete', indicatorKey: { not: null }, deletedAt: null },
    select: { indicatorKey: true },
  });

  const validDims = Object.keys(DIMENSION_WEIGHTS) as DimensionKey[];
  let current = state;
  for (const task of completedTasks) {
    const key = task.indicatorKey!;
    const dotIdx = key.indexOf('.');
    if (dotIdx === -1) continue;
    const dim = key.slice(0, dotIdx) as DimensionKey;
    const ind = key.slice(dotIdx + 1);
    if (!validDims.includes(dim)) continue;
    if (!(DIMENSION_INDICATORS[dim] as readonly string[]).includes(ind)) continue;
    current = setIndicator(
      current,
      dim,
      ind as Parameters<typeof setIndicator>[2],
      true,
    );
  }
  return current;
}

async function persistReadinessScore(
  tx: Prisma.TransactionClient,
  orgId: string,
  state: IndicatorState,
): Promise<ReadinessScore> {
  const dims = indicatorsToDimensionScores(state);
  const totalScore = calculateReadinessScore(dims);

  return tx.readinessScore.create({
    data: {
      orgId,
      totalScore,
      corporateStructure: dims.corporate_structure,
      capitalLicensing: dims.capital_licensing,
      kycInfrastructure: dims.kyc_infrastructure,
      amlCftProgramme: dims.aml_cft_programme,
      transactionMonitoring: dims.transaction_monitoring,
      regulatoryReporting: dims.regulatory_reporting,
      regulatoryRelationships: dims.regulatory_relationships,
      productClassification: dims.product_classification,
      snapshot: state as unknown as Prisma.JsonObject,
    },
  });
}

async function resolveOrgOwnerUserId(
  tx: Prisma.TransactionClient,
  orgId: string,
  fallbackUserId: string,
): Promise<string> {
  const owner = await tx.orgMember.findFirst({
    where: { orgId, role: 'owner' },
    select: { userId: true },
  });
  return owner?.userId ?? fallbackUserId;
}

async function buildIndicatorState(
  tx: Prisma.TransactionClient,
  orgId: string,
  actorUserId: string,
): Promise<IndicatorState> {
  const profile = await tx.userProfile.findUnique({
    where: { userId: actorUserId },
    select: { existingInfrastructure: true },
  });

  let state = createEmptyIndicatorState();
  state = applyExistingInfrastructure(state, profile?.existingInfrastructure ?? []);

  const latestScore = await tx.readinessScore.findFirst({
    where: { orgId },
    orderBy: { calculatedAt: 'desc' },
  });

  let snapshotState = parseSnapshotToIndicatorState(latestScore?.snapshot ?? null);

  if (countTrueIndicators(snapshotState) === 0 && latestScore?.totalScore === 0) {
    const prior = await tx.readinessScore.findFirst({
      where: { orgId, totalScore: { gt: 0 } },
      orderBy: { calculatedAt: 'desc' },
    });
    if (prior) {
      snapshotState = parseSnapshotToIndicatorState(prior.snapshot);
    }
  }

  state = copySnapshotValues(state, snapshotState);

  return overlayCompletedRoadmapTasks(tx, orgId, state);
}

export async function recalculateScore(
  orgId: string,
  actorUserId?: string,
): Promise<ReadinessScore | null> {
  const userId = await resolveActorUserId(orgId, actorUserId);
  if (!userId) return null;

  return withRls({ userId, orgId }, async (tx) => {
    const state = await buildIndicatorState(tx, orgId, userId);
    return persistReadinessScore(tx, orgId, state);
  });
}

export async function reassessReadinessScore(
  orgId: string,
  actorUserId: string,
  input: ReadinessReassessmentInput,
): Promise<ReadinessScore | null> {
  return withRls({ userId: actorUserId, orgId }, async (tx) => {
    const profileUserId = await resolveOrgOwnerUserId(tx, orgId, actorUserId);

    const profile = await tx.userProfile.findUnique({
      where: { userId: profileUserId },
      select: { userId: true },
    });
    if (profile === null) {
      return null;
    }

    await tx.userProfile.update({
      where: { userId: profileUserId },
      data: {
        stage: input.stage,
        teamSize: input.team_size,
        hasComplianceOfficer: input.has_compliance_officer,
        existingInfrastructure: input.existing_infrastructure,
      },
    });

    let state = createEmptyIndicatorState();
    state = applyExistingInfrastructure(state, input.existing_infrastructure);
    state = await overlayCompletedRoadmapTasks(tx, orgId, state);

    return persistReadinessScore(tx, orgId, state);
  });
}
