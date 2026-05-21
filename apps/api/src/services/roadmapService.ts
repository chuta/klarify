// =============================================================================
// roadmapService — shared persistence layer for the Sprint 4 roadmap engine.
//
// Wraps three concerns that the route handlers all need:
//   1. Ensuring the org has a roadmap (lazy materialisation from
//      `roadmap_task_templates`).
//   2. Recomputing lock state after a status / indicator change
//      (CLAUDE.md §16 Rule 6 — score must update in real time).
//   3. Propagating a single task→indicator flip when a seed task
//      with a `linked_indicator_key` is marked complete.
//
// Pure DB I/O. No HTTP concerns. The Hono and Next.js mirror routes
// both delegate here.
// =============================================================================

import type { Prisma, PrismaClient } from '@prisma/client';
import {
  ALL_SEED_TEMPLATES,
  DIMENSION_INDICATORS,
  DIMENSION_WEIGHTS,
  calculateReadinessScore,
  checkAndUnlockPhases,
  computePhaseProgress,
  createEmptyIndicatorState,
  generateRoadmap,
  indicatorsToDimensionScores,
  setIndicator,
  type DimensionKey,
  type IndicatorState,
  type RoadmapTaskRow,
} from '@klarify/core';

/* -------------------------------------------------------------------------- */
/*  Snapshot helpers                                                           */
/* -------------------------------------------------------------------------- */

export function parseSnapshotToIndicatorState(snapshot: unknown): IndicatorState {
  const base = createEmptyIndicatorState();
  if (snapshot === null || typeof snapshot !== 'object') return base;
  for (const dim of Object.keys(DIMENSION_WEIGHTS) as DimensionKey[]) {
    const raw = (snapshot as Record<string, unknown>)[dim];
    if (raw !== null && typeof raw === 'object') {
      for (const ind of DIMENSION_INDICATORS[dim] as readonly string[]) {
        const val = (raw as Record<string, unknown>)[ind];
        if (typeof val === 'boolean') {
          (base[dim] as unknown as Record<string, boolean>)[ind] = val;
        }
      }
    }
  }
  return base;
}

/* -------------------------------------------------------------------------- */
/*  Materialisation — lazy-seed an empty roadmap from the master library      */
/* -------------------------------------------------------------------------- */

export interface MaterialiseOpts {
  readonly orgId: string;
  readonly productTypes: readonly string[];
}

/**
 * Ensure the org has roadmap_tasks rows. Idempotent: returns immediately
 * if the org already has any task (custom or seed).
 *
 * Called from GET /api/compliance/roadmap so any user (existing or new)
 * who hits the page after the Sprint 4 wipe gets a fresh roadmap.
 */
export async function materialiseRoadmapIfEmpty(
  tx: Prisma.TransactionClient,
  opts: MaterialiseOpts,
): Promise<{ created: number }> {
  const existing = await tx.roadmapTask.count({
    where: { orgId: opts.orgId, deletedAt: null },
  });
  if (existing > 0) return { created: 0 };

  // Fetch live templates from the DB (so any over-the-wire updates apply).
  // Fall back to in-code ALL_SEED_TEMPLATES if the DB is empty (early dev).
  const dbTemplates = await tx.roadmapTaskTemplate.findMany();
  const templates = dbTemplates.length > 0
    ? dbTemplates.map((t) => ({
        id: t.id,
        phase: t.phase as 1 | 2 | 3 | 4,
        title: t.title,
        description: t.description,
        regulatory_basis: t.regulatoryBasis ?? '',
        effort_days_min: t.effortDaysMin ?? 0,
        effort_days_max: t.effortDaysMax ?? 0,
        template_id: t.templateId ?? undefined,
        is_blocker: t.isBlocker,
        depends_on: t.dependsOn,
        product_types: t.productTypes,
        linked_indicator_key: t.linkedIndicatorKey ?? undefined,
        linked_dimension: (t.linkedDimension ?? undefined) as DimensionKey | undefined,
        display_order: t.displayOrder,
      }))
    : ALL_SEED_TEMPLATES;

  const tasks = generateRoadmap({ product_types: opts.productTypes }, templates);
  if (tasks.length === 0) return { created: 0 };

  await tx.roadmapTask.createMany({
    data: tasks.map((t) => ({
      orgId: opts.orgId,
      phase: t.phase,
      title: t.title,
      description: t.description,
      regulatoryBasis: t.regulatoryBasis,
      templateId: t.templateId,
      indicatorKey: t.indicatorKey,
      isBlocker: t.isBlocker,
      isLocked: t.isLocked,
      isCustom: false,
      status: 'not_started',
      templateRefId: t.templateRefId,
    })),
  });

  return { created: tasks.length };
}

/* -------------------------------------------------------------------------- */
/*  Lock-state reconciliation                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Read every roadmap task for the org and apply lock-state changes per
 * `checkAndUnlockPhases()`. Returns the number of rows updated.
 *
 * Pass `overrideIndicators` when called immediately after an indicator
 * flip — the caller has the post-flip state in memory and we want to
 * avoid a stale read from `readiness_scores`.
 */
export async function reconcileLockState(
  tx: Prisma.TransactionClient,
  orgId: string,
  overrideIndicators?: IndicatorState,
): Promise<number> {
  const indicators = overrideIndicators ?? (await loadLatestIndicatorState(tx, orgId));
  const tasks = await tx.roadmapTask.findMany({
    where: { orgId, deletedAt: null },
    select: {
      id: true,
      phase: true,
      status: true,
      isLocked: true,
      isCustom: true,
      templateRefId: true,
    },
  });

  const rows: readonly RoadmapTaskRow[] = tasks.map((t) => ({
    id: t.id,
    phase: t.phase as 1 | 2 | 3 | 4,
    status: t.status as RoadmapTaskRow['status'],
    isLocked: t.isLocked,
    isCustom: t.isCustom,
    templateRefId: t.templateRefId,
  }));

  const changes = checkAndUnlockPhases(rows, indicators);
  for (const c of changes) {
    await tx.roadmapTask.update({
      where: { id: c.id },
      data: { isLocked: c.isLocked },
    });
  }
  return changes.length;
}

/* -------------------------------------------------------------------------- */
/*  Score recalculation                                                        */
/* -------------------------------------------------------------------------- */

export async function loadLatestIndicatorState(
  tx: Prisma.TransactionClient,
  orgId: string,
): Promise<IndicatorState> {
  const latest = await tx.readinessScore.findFirst({
    where: { orgId },
    orderBy: { calculatedAt: 'desc' },
  });
  return parseSnapshotToIndicatorState(latest?.snapshot ?? null);
}

export interface ScoreUpdate {
  readonly totalScore: number;
  readonly dimensions: Record<string, number>;
  readonly calculatedAt: Date;
}

/**
 * Apply an indicator flip + persist a new readiness_score snapshot.
 */
export async function flipIndicatorAndRecalc(
  tx: Prisma.TransactionClient,
  orgId: string,
  dimension: DimensionKey,
  indicator: string,
  value: boolean,
): Promise<{ scoreUpdate: ScoreUpdate; nextState: IndicatorState }> {
  const validIndicators = DIMENSION_INDICATORS[dimension] as readonly string[];
  if (!validIndicators.includes(indicator)) {
    throw new Error(`Invalid indicator "${indicator}" for dimension "${dimension}"`);
  }
  const current = await loadLatestIndicatorState(tx, orgId);
  const nextState = setIndicator(
    current,
    dimension,
    indicator as Parameters<typeof setIndicator>[2],
    value,
  );
  const dims = indicatorsToDimensionScores(nextState);
  const totalScore = calculateReadinessScore(dims);

  const record = await tx.readinessScore.create({
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
      snapshot: nextState,
    },
  });

  return {
    scoreUpdate: {
      totalScore,
      dimensions: {
        corporate_structure: dims.corporate_structure,
        capital_licensing: dims.capital_licensing,
        kyc_infrastructure: dims.kyc_infrastructure,
        aml_cft_programme: dims.aml_cft_programme,
        transaction_monitoring: dims.transaction_monitoring,
        regulatory_reporting: dims.regulatory_reporting,
        regulatory_relationships: dims.regulatory_relationships,
        product_classification: dims.product_classification,
      },
      calculatedAt: record.calculatedAt,
    },
    nextState,
  };
}

/* -------------------------------------------------------------------------- */
/*  Aggregated GET response                                                    */
/* -------------------------------------------------------------------------- */

export interface RoadmapResponseTask {
  id: string;
  phase: number;
  title: string;
  description: string | null;
  regulatoryBasis: string | null;
  templateId: string | null;
  templateRefId: string | null;
  indicatorKey: string | null;
  isLocked: boolean;
  isBlocker: boolean;
  isCustom: boolean;
  status: string;
  ownerUserId: string | null;
  dueDate: string | null;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface RoadmapResponse {
  tasks: RoadmapResponseTask[];
  grouped: Record<string, RoadmapResponseTask[]>;
  phaseProgress: ReturnType<typeof computePhaseProgress>;
  orgId: string | null;
}

export async function loadFullRoadmap(
  tx: Prisma.TransactionClient,
  orgId: string,
): Promise<RoadmapResponse> {
  const tasks = await tx.roadmapTask.findMany({
    where: { orgId, deletedAt: null },
    orderBy: [{ phase: 'asc' }, { createdAt: 'asc' }],
  });

  const mapped: RoadmapResponseTask[] = tasks.map((t) => ({
    id: t.id,
    phase: t.phase,
    title: t.title,
    description: t.description,
    regulatoryBasis: t.regulatoryBasis,
    templateId: t.templateId,
    templateRefId: t.templateRefId,
    indicatorKey: t.indicatorKey,
    isLocked: t.isLocked,
    isBlocker: t.isBlocker,
    isCustom: t.isCustom,
    status: t.status,
    ownerUserId: t.ownerUserId,
    dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
    notes: t.notes,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
  }));

  const grouped: Record<string, RoadmapResponseTask[]> = {};
  for (const m of mapped) {
    const key = String(m.phase);
    const bucket = grouped[key] ?? (grouped[key] = []);
    bucket.push(m);
  }

  const rows: RoadmapTaskRow[] = mapped.map((m) => ({
    id: m.id,
    phase: m.phase as 1 | 2 | 3 | 4,
    status: m.status as RoadmapTaskRow['status'],
    isLocked: m.isLocked,
    isCustom: m.isCustom,
    templateRefId: m.templateRefId,
  }));

  return {
    tasks: mapped,
    grouped,
    phaseProgress: computePhaseProgress(rows),
    orgId,
  };
}

export async function ensureSeedTemplatesInDb(
  client: PrismaClient,
): Promise<{ existed: number }> {
  // Best-effort idempotent seed on API boot. No-op if already populated.
  const existed = await client.roadmapTaskTemplate.count();
  if (existed >= ALL_SEED_TEMPLATES.length) return { existed };
  for (const t of ALL_SEED_TEMPLATES) {
    await client.roadmapTaskTemplate.upsert({
      where: { id: t.id },
      create: {
        id: t.id,
        phase: t.phase,
        title: t.title,
        description: t.description,
        regulatoryBasis: t.regulatory_basis,
        effortDaysMin: t.effort_days_min,
        effortDaysMax: t.effort_days_max,
        templateId: t.template_id ?? null,
        isBlocker: t.is_blocker,
        dependsOn: [...t.depends_on],
        productTypes: [...t.product_types],
        linkedIndicatorKey: t.linked_indicator_key ?? null,
        linkedDimension: t.linked_dimension ?? null,
        displayOrder: t.display_order,
      },
      update: {},
    });
  }
  return { existed };
}
