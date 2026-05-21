// =============================================================================
// phaseUnlock — pure functions that decide whether each task should be
// locked or unlocked, given the current set of tasks and the user's
// compliance indicator state.
//
// Rules (Sprint 4):
//   * Phase 1 tasks → always unlocked.
//   * Phase 2 tasks → unlocked iff all Phase 1 tasks are status='complete'.
//   * Phase 3 tasks → unlocked iff all Phase 2 tasks are status='complete'.
//        AND P3-01 stays locked until indicator
//        `capital_licensing.registered_solicitor_engaged` is true.
//   * Phase 4 tasks → SPRINT 4 ALWAYS LOCKED. Sprint 5 will flip these
//        when `arip_applications.stage = 'aip_active'`.
//
// CLAUDE.md §16 Rule 6 — the API caller must persist the lock changes and
// recalculate the readiness score in real time after each task update.
// =============================================================================

import type { IndicatorState } from '../compliance/indicators.js';

/** A task as it exists in `roadmap_tasks` — only the columns this engine reads. */
export interface RoadmapTaskRow {
  readonly id: string;
  readonly phase: 1 | 2 | 3 | 4;
  readonly status: 'not_started' | 'in_progress' | 'complete' | 'blocked';
  readonly isLocked: boolean;
  readonly isCustom: boolean;
  /** When set, used to identify special-case tasks like P3-01. Null for custom tasks. */
  readonly templateRefId: string | null;
}

/** The template_ref_id of the registered-solicitor task. Special-cased below. */
export const P3_01_TEMPLATE_REF_ID = 'P3-01' as const;

/** Phase 4 is locked in Sprint 4 regardless of any other state. */
export const SPRINT_4_PHASE_4_LOCKED = true;

/** True if every non-custom task in the given phase is `status='complete'`.
 *  Custom tasks created by the user do NOT block phase progression — they
 *  are user notes / additions, not part of the regulatory checklist. */
export function isPhaseComplete(
  phase: 1 | 2 | 3 | 4,
  tasks: readonly RoadmapTaskRow[],
): boolean {
  const seedTasksInPhase = tasks.filter((t) => t.phase === phase && !t.isCustom);
  if (seedTasksInPhase.length === 0) return false;
  return seedTasksInPhase.every((t) => t.status === 'complete');
}

/**
 * Compute the lock state a task SHOULD have, given the current task list
 * and indicator state. Pure — no DB calls.
 */
export function computeLockState(
  task: RoadmapTaskRow,
  allTasks: readonly RoadmapTaskRow[],
  indicatorState: IndicatorState,
): boolean {
  // Custom tasks: never auto-locked by the engine. The user owns them.
  if (task.isCustom) return false;

  if (task.phase === 1) return false;
  if (task.phase === 4) return SPRINT_4_PHASE_4_LOCKED;

  if (task.phase === 2) {
    return !isPhaseComplete(1, allTasks);
  }

  // Phase 3
  if (!isPhaseComplete(2, allTasks)) return true;
  if (task.templateRefId === P3_01_TEMPLATE_REF_ID) {
    return !indicatorState.capital_licensing.registered_solicitor_engaged;
  }
  return false;
}

/** A diff entry the caller writes back to `roadmap_tasks`. */
export interface LockChange {
  readonly id: string;
  readonly isLocked: boolean;
}

/**
 * Compute the set of tasks whose lock state needs to change.
 * The caller persists each change with a single UPDATE.
 *
 * @returns Only the tasks whose lock state DIFFERS from current — empty
 *          array when no change is needed (idempotent calls are cheap).
 */
export function checkAndUnlockPhases(
  tasks: readonly RoadmapTaskRow[],
  indicatorState: IndicatorState,
): LockChange[] {
  const changes: LockChange[] = [];
  for (const task of tasks) {
    const expected = computeLockState(task, tasks, indicatorState);
    if (expected !== task.isLocked) {
      changes.push({ id: task.id, isLocked: expected });
    }
  }
  return changes;
}

/** Per-phase progress summary for the Kanban header strip. */
export interface PhaseProgress {
  readonly phase: 1 | 2 | 3 | 4;
  readonly total: number;
  readonly complete: number;
  readonly pct: number;
  readonly isLocked: boolean; // true if every seed task in the phase is locked
}

export function computePhaseProgress(
  tasks: readonly RoadmapTaskRow[],
): readonly PhaseProgress[] {
  const phases: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4];
  return phases.map((phase) => {
    const inPhase = tasks.filter((t) => t.phase === phase && !t.isCustom);
    const complete = inPhase.filter((t) => t.status === 'complete').length;
    const total = inPhase.length;
    const pct = total > 0 ? Math.round((complete / total) * 100) : 0;
    const allLocked = total > 0 && inPhase.every((t) => t.isLocked);
    return { phase, total, complete, pct, isLocked: allLocked };
  });
}
