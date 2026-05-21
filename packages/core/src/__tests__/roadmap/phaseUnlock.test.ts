// =============================================================================
// phaseUnlock — unit tests covering the lock-state state machine.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  checkAndUnlockPhases,
  computeLockState,
  computePhaseProgress,
  isPhaseComplete,
  type RoadmapTaskRow,
} from '../../roadmap/phaseUnlock.js';
import { createEmptyIndicatorState, setIndicator } from '../../compliance/indicators.js';

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function task(
  id: string,
  phase: 1 | 2 | 3 | 4,
  status: RoadmapTaskRow['status'] = 'not_started',
  opts: Partial<Pick<RoadmapTaskRow, 'isLocked' | 'isCustom' | 'templateRefId'>> = {},
): RoadmapTaskRow {
  return {
    id,
    phase,
    status,
    isLocked: opts.isLocked ?? phase !== 1,
    isCustom: opts.isCustom ?? false,
    templateRefId: opts.templateRefId ?? id,
  };
}

function buildBaseline(): RoadmapTaskRow[] {
  return [
    task('P1-01', 1),
    task('P1-02', 1),
    task('P2-01', 2),
    task('P2-02', 2),
    task('P3-01', 3, 'not_started', { templateRefId: 'P3-01' }),
    task('P3-02', 3, 'not_started', { templateRefId: 'P3-02' }),
    task('P4-01', 4, 'not_started', { templateRefId: 'P4-01' }),
  ];
}

// -----------------------------------------------------------------------------
describe('isPhaseComplete()', () => {
  it('returns false when phase has no seed tasks', () => {
    expect(isPhaseComplete(1, [])).toBe(false);
  });

  it('returns false when at least one phase task is incomplete', () => {
    const tasks = buildBaseline();
    expect(isPhaseComplete(1, tasks)).toBe(false);
  });

  it('returns true when every seed task in the phase is complete', () => {
    const tasks = buildBaseline().map((t) =>
      t.phase === 1 ? { ...t, status: 'complete' as const } : t,
    );
    expect(isPhaseComplete(1, tasks)).toBe(true);
  });

  it('custom tasks do not block phase completion', () => {
    const tasks = [
      task('P1-01', 1, 'complete'),
      task('P1-02', 1, 'complete'),
      // user-created custom task left incomplete:
      task('CUSTOM-1', 1, 'not_started', { isCustom: true, templateRefId: null }),
    ];
    expect(isPhaseComplete(1, tasks)).toBe(true);
  });
});

// -----------------------------------------------------------------------------
describe('computeLockState()', () => {
  const emptyIndicators = createEmptyIndicatorState();

  it('Phase 1 tasks are always unlocked', () => {
    const t = task('P1-01', 1);
    expect(computeLockState(t, [t], emptyIndicators)).toBe(false);
  });

  it('Phase 2 stays locked until Phase 1 is complete', () => {
    const tasks = buildBaseline();
    const p2 = tasks.find((t) => t.id === 'P2-01')!;
    expect(computeLockState(p2, tasks, emptyIndicators)).toBe(true);
  });

  it('Phase 2 unlocks once Phase 1 is complete', () => {
    const tasks = buildBaseline().map((t) =>
      t.phase === 1 ? { ...t, status: 'complete' as const } : t,
    );
    const p2 = tasks.find((t) => t.id === 'P2-01')!;
    expect(computeLockState(p2, tasks, emptyIndicators)).toBe(false);
  });

  it('Phase 3 stays locked until Phase 2 is complete', () => {
    const tasks = buildBaseline().map((t) =>
      t.phase === 1 ? { ...t, status: 'complete' as const } : t,
    );
    const p3 = tasks.find((t) => t.id === 'P3-02')!;
    expect(computeLockState(p3, tasks, emptyIndicators)).toBe(true);
  });

  it('Phase 3 unlocks (except P3-01) when Phase 2 is complete and solicitor=false', () => {
    const tasks = buildBaseline().map((t) =>
      t.phase === 1 || t.phase === 2 ? { ...t, status: 'complete' as const } : t,
    );
    const p302 = tasks.find((t) => t.id === 'P3-02')!;
    const p301 = tasks.find((t) => t.id === 'P3-01')!;
    expect(computeLockState(p302, tasks, emptyIndicators)).toBe(false);
    expect(computeLockState(p301, tasks, emptyIndicators)).toBe(true);
  });

  it('P3-01 unlocks when solicitor indicator = true (after Phase 2 complete)', () => {
    const tasks = buildBaseline().map((t) =>
      t.phase === 1 || t.phase === 2 ? { ...t, status: 'complete' as const } : t,
    );
    const indicators = setIndicator(
      createEmptyIndicatorState(),
      'capital_licensing',
      'registered_solicitor_engaged',
      true,
    );
    const p301 = tasks.find((t) => t.id === 'P3-01')!;
    expect(computeLockState(p301, tasks, indicators)).toBe(false);
  });

  it('Phase 4 stays locked in Sprint 4 even when all earlier phases are complete', () => {
    const tasks = buildBaseline().map((t) =>
      t.phase === 4 ? t : { ...t, status: 'complete' as const },
    );
    const indicators = setIndicator(
      createEmptyIndicatorState(),
      'capital_licensing',
      'registered_solicitor_engaged',
      true,
    );
    const p401 = tasks.find((t) => t.id === 'P4-01')!;
    expect(computeLockState(p401, tasks, indicators)).toBe(true);
  });

  it('custom tasks are never auto-locked by the engine', () => {
    const t = task('CUSTOM-1', 3, 'not_started', {
      isCustom: true,
      templateRefId: null,
    });
    expect(computeLockState(t, [t], emptyIndicators)).toBe(false);
  });
});

// -----------------------------------------------------------------------------
describe('checkAndUnlockPhases()', () => {
  it('returns no changes for a freshly generated roadmap (lock state already correct)', () => {
    const tasks = buildBaseline();
    const indicators = createEmptyIndicatorState();
    const changes = checkAndUnlockPhases(tasks, indicators);
    expect(changes).toEqual([]);
  });

  it('flips Phase 2 tasks to unlocked once Phase 1 completes', () => {
    const tasks = buildBaseline().map((t) =>
      t.phase === 1 ? { ...t, status: 'complete' as const } : t,
    );
    const changes = checkAndUnlockPhases(tasks, createEmptyIndicatorState());
    const phase2Changes = changes.filter((c) => c.isLocked === false);
    expect(phase2Changes.length).toBeGreaterThan(0);
    // P3-01 stays locked even when phase 2 not yet complete:
    expect(changes.some((c) => c.id === 'P3-01' && c.isLocked === false)).toBe(false);
  });

  it('Phase 3 unlocks when Phase 2 completes BUT P3-01 stays locked (no solicitor)', () => {
    const tasks = buildBaseline().map((t) =>
      t.phase === 1 || t.phase === 2 ? { ...t, status: 'complete' as const } : t,
    );
    const changes = checkAndUnlockPhases(tasks, createEmptyIndicatorState());
    const p302 = changes.find((c) => c.id === 'P3-02');
    expect(p302?.isLocked).toBe(false);
    // P3-01 already locked, no change emitted
    expect(changes.find((c) => c.id === 'P3-01')).toBeUndefined();
  });

  it('Phase 3 unlocks AND P3-01 also unlocks when solicitor=true', () => {
    const tasks = buildBaseline().map((t) =>
      t.phase === 1 || t.phase === 2 ? { ...t, status: 'complete' as const } : t,
    );
    const indicators = setIndicator(
      createEmptyIndicatorState(),
      'capital_licensing',
      'registered_solicitor_engaged',
      true,
    );
    const changes = checkAndUnlockPhases(tasks, indicators);
    expect(changes.find((c) => c.id === 'P3-01')?.isLocked).toBe(false);
    expect(changes.find((c) => c.id === 'P3-02')?.isLocked).toBe(false);
  });

  it('Phase 4 stays locked in Sprint 4 even when all earlier phases complete + solicitor true', () => {
    const tasks = buildBaseline().map((t) =>
      t.phase === 4 ? t : { ...t, status: 'complete' as const },
    );
    const indicators = setIndicator(
      createEmptyIndicatorState(),
      'capital_licensing',
      'registered_solicitor_engaged',
      true,
    );
    const changes = checkAndUnlockPhases(tasks, indicators);
    const p401 = changes.find((c) => c.id === 'P4-01');
    // Either no change emitted (already locked) or explicitly locked.
    expect(p401 === undefined || p401.isLocked === true).toBe(true);
    // And the underlying task is still locked:
    const updated = tasks.map((t) => {
      const ch = changes.find((c) => c.id === t.id);
      return ch ? { ...t, isLocked: ch.isLocked } : t;
    });
    expect(updated.find((t) => t.id === 'P4-01')?.isLocked).toBe(true);
  });
});

// -----------------------------------------------------------------------------
describe('computePhaseProgress()', () => {
  it('returns 0% complete when all tasks are not_started', () => {
    const tasks = buildBaseline();
    const progress = computePhaseProgress(tasks);
    for (const p of progress) {
      if (p.total > 0) expect(p.pct).toBe(0);
    }
  });

  it('returns 100% when all seed tasks in the phase are complete', () => {
    const tasks = buildBaseline().map((t) =>
      t.phase === 1 ? { ...t, status: 'complete' as const } : t,
    );
    const progress = computePhaseProgress(tasks);
    const phase1 = progress.find((p) => p.phase === 1)!;
    expect(phase1.pct).toBe(100);
    expect(phase1.complete).toBe(phase1.total);
  });

  it('custom tasks do not affect phase counts', () => {
    const tasks: RoadmapTaskRow[] = [
      task('P1-01', 1, 'complete'),
      task('CUSTOM-1', 1, 'not_started', { isCustom: true, templateRefId: null }),
    ];
    const progress = computePhaseProgress(tasks);
    const phase1 = progress.find((p) => p.phase === 1)!;
    expect(phase1.total).toBe(1);
    expect(phase1.pct).toBe(100);
  });
});
