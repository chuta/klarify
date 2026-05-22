'use client';

import { useCallback, useMemo, useState } from 'react';
import { PhaseHeaderStrip } from '@/components/roadmap/PhaseHeaderStrip';
import { RoadmapTaskCard } from '@/components/roadmap/RoadmapTaskCard';
import { TaskDetailDrawer, type TaskUpdateBody } from '@/components/roadmap/TaskDetailDrawer';
import { CustomTaskForm } from '@/components/roadmap/CustomTaskForm';
import {
  PHASE_META,
  P3_01_TEMPLATE_REF_ID,
  type RoadmapApiResponse,
  type RoadmapApiTask,
} from '@/components/roadmap/types';

interface RoadmapClientProps {
  initialRoadmap: RoadmapApiResponse;
  initialScore: number;
  initialSolicitorEngaged: boolean;
  accessToken: string;
}

interface Toast {
  id: number;
  type: 'info' | 'success' | 'error';
  text: string;
}

let toastSeq = 0;

export function RoadmapClient({
  initialRoadmap,
  initialScore,
  initialSolicitorEngaged,
  accessToken,
}: RoadmapClientProps): JSX.Element {
  const [roadmap, setRoadmap] = useState<RoadmapApiResponse>(initialRoadmap);
  const [totalScore, setTotalScore] = useState<number>(initialScore);
  const [activePhase, setActivePhase] = useState<1 | 2 | 3 | 4>(() => {
    // Default to the lowest phase that still has incomplete tasks.
    for (const phase of [1, 2, 3, 4] as const) {
      const inPhase = initialRoadmap.tasks.filter((t) => t.phase === phase);
      if (inPhase.length > 0 && inPhase.some((t) => t.status !== 'complete')) return phase;
    }
    return 1;
  });
  const [openTask, setOpenTask] = useState<RoadmapApiTask | null>(null);
  const [savingTaskIds, setSavingTaskIds] = useState<Set<string>>(new Set());
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [solicitorEngaged, setSolicitorEngaged] = useState<boolean>(initialSolicitorEngaged);

  const pushToast = useCallback((type: Toast['type'], text: string) => {
    const id = ++toastSeq;
    setToasts((curr) => [...curr, { id, type, text }]);
    setTimeout(() => setToasts((curr) => curr.filter((t) => t.id !== id)), 2500);
  }, []);

  const fetchHeaders: HeadersInit = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    }),
    [accessToken],
  );

  const refetchRoadmap = useCallback(async (): Promise<RoadmapApiResponse | null> => {
    try {
      const res = await fetch('/api/compliance/roadmap', { headers: fetchHeaders });
      const json = (await res.json()) as {
        success: boolean;
        data?: RoadmapApiResponse;
      };
      if (json.success && json.data) {
        setRoadmap(json.data);
        return json.data;
      }
    } catch (err) {
      console.error('[roadmap] refetch failed', err);
    }
    return null;
  }, [fetchHeaders]);

  const markSaving = (taskId: string, on: boolean): void => {
    setSavingTaskIds((curr) => {
      const next = new Set(curr);
      if (on) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  };

  // Update task: status / due date / notes.
  const updateTask = useCallback(
    async (taskId: string, body: TaskUpdateBody): Promise<void> => {
      markSaving(taskId, true);
      try {
        const res = await fetch(`/api/compliance/roadmap/task/${taskId}`, {
          method: 'PUT',
          headers: fetchHeaders,
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as {
          success: boolean;
          data?: {
            task?: RoadmapApiTask;
            scoreUpdate?: { totalScore: number };
          };
          error?: string;
        };
        if (!json.success) {
          pushToast('error', json.error ?? 'Failed to update task.');
          return;
        }
        if (json.data?.scoreUpdate) {
          setTotalScore(json.data.scoreUpdate.totalScore);
        }
        // Always refetch — lock state may have cascaded.
        const next = await refetchRoadmap();
        if (next) {
          // Keep the drawer's task in sync.
          const updated = next.tasks.find((t) => t.id === taskId);
          if (updated && openTask?.id === taskId) setOpenTask(updated);
        }
      } catch (err) {
        console.error('[roadmap] update task failed', err);
        pushToast('error', 'Network error. Try again.');
      } finally {
        markSaving(taskId, false);
      }
    },
    [fetchHeaders, openTask?.id, pushToast, refetchRoadmap],
  );

  const toggleComplete = useCallback(
    async (task: RoadmapApiTask): Promise<void> => {
      if (task.isLocked) {
        pushToast('info', 'Complete the previous phase to unlock this task.');
        return;
      }
      const nextStatus = task.status === 'complete' ? 'not_started' : 'complete';
      await updateTask(task.id, { status: nextStatus });
    },
    [pushToast, updateTask],
  );

  const deleteTask = useCallback(
    async (taskId: string): Promise<void> => {
      const res = await fetch(`/api/compliance/roadmap/task/${taskId}`, {
        method: 'DELETE',
        headers: fetchHeaders,
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) {
        pushToast('error', json.error ?? 'Failed to delete task.');
        return;
      }
      setOpenTask(null);
      await refetchRoadmap();
      pushToast('success', 'Task deleted.');
    },
    [fetchHeaders, pushToast, refetchRoadmap],
  );

  const createCustomTask = useCallback(
    async (input: { title: string; description?: string; phase: 1 | 2 | 3 | 4; dueDate?: string }): Promise<void> => {
      const res = await fetch('/api/compliance/roadmap', {
        method: 'POST',
        headers: fetchHeaders,
        body: JSON.stringify(input),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (!json.success) throw new Error(json.error ?? 'Failed to create task.');
      await refetchRoadmap();
      setShowCustomForm(false);
      pushToast('success', 'Custom task added.');
    },
    [fetchHeaders, pushToast, refetchRoadmap],
  );

  const setSolicitorIndicator = useCallback(
    async (value: boolean): Promise<void> => {
      const res = await fetch('/api/compliance/indicators', {
        method: 'PUT',
        headers: fetchHeaders,
        body: JSON.stringify({
          dimension: 'capital_licensing',
          indicator: 'registered_solicitor_engaged',
          value,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { scoreUpdate?: { totalScore: number } };
        error?: string;
      };
      if (!json.success) {
        pushToast('error', json.error ?? 'Failed to update indicator.');
        return;
      }
      setSolicitorEngaged(value);
      if (json.data?.scoreUpdate) setTotalScore(json.data.scoreUpdate.totalScore);
      const next = await refetchRoadmap();
      if (next && openTask) {
        const refreshed = next.tasks.find((t) => t.id === openTask.id);
        if (refreshed) setOpenTask(refreshed);
      }
      pushToast('success', value ? 'Solicitor engagement recorded.' : 'Solicitor engagement cleared.');
    },
    [fetchHeaders, openTask, pushToast, refetchRoadmap],
  );

  // Tasks for the active phase, filtered by hideCompleted.
  const activeTasks = useMemo(() => {
    const all = roadmap.tasks.filter((t) => t.phase === activePhase);
    if (hideCompleted) return all.filter((t) => t.status !== 'complete');
    return all;
  }, [roadmap.tasks, activePhase, hideCompleted]);

  // Phase progress — derived from roadmap response.
  const phaseProgress = useMemo(() => roadmap.phaseProgress, [roadmap.phaseProgress]);
  const totalTasks = roadmap.tasks.length;
  const completedTasks = roadmap.tasks.filter((t) => t.status === 'complete').length;
  const overallPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const meta = PHASE_META[activePhase];
  const phaseLocked = phaseProgress.find((p) => p.phase === activePhase)?.isLocked ?? false;
  const blockingPhase: 1 | 2 | 3 | 4 | null = phaseLocked
    ? (((activePhase - 1) as 1 | 2 | 3) >= 1 ? ((activePhase - 1) as 1 | 2 | 3) : null)
    : null;

  return (
    <div className="w-full min-w-0">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#1A1A1A]">Smart Compliance Roadmap</h1>
        <p className="mt-1 text-sm text-[#555555]">
          A 4-phase plan calibrated to your product. Completing tasks marked
          <span className="mx-1 inline-flex items-center rounded bg-[#E6F4F4] px-1.5 py-0.5 text-[10px] font-semibold text-[#0B6E6E]">
            Updates score
          </span>
          recalculates your Readiness Score in real time.
        </p>
      </div>

      {/* Top summary bar */}
      <div className="mb-6 rounded-2xl border border-[#CCCCCC] bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#CCCCCC]">
              Readiness Score
            </p>
            <p className="text-3xl font-bold text-[#0B6E6E]">
              {totalScore}
              <span className="ml-1 text-sm font-normal text-[#CCCCCC]">/ 100</span>
            </p>
          </div>
          <div className="h-12 w-px bg-[#F5F5F5]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#CCCCCC]">
              Tasks
            </p>
            <p className="text-3xl font-bold text-[#1A1A1A]">
              {completedTasks}
              <span className="text-lg font-normal text-[#CCCCCC]">/{totalTasks}</span>
            </p>
          </div>
          <div className="min-w-[180px] flex-1">
            <div className="mb-1 flex justify-between text-xs text-[#555555]">
              <span>Overall progress</span>
              <span>{overallPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#F5F5F5]">
              <div
                className="h-full bg-[#0B6E6E] transition-all duration-700"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Phase header strip */}
      <PhaseHeaderStrip
        progress={phaseProgress}
        activePhase={activePhase}
        onSelect={setActivePhase}
      />

      {/* Phase content */}
      <section id={`phase-panel-${activePhase}`} role="tabpanel" aria-labelledby={`phase-tab-${activePhase}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: meta.color }}>
              {meta.title}
            </h2>
            <p className="text-xs text-[#555555]">{meta.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-[#555555]">
              <input
                type="checkbox"
                checked={hideCompleted}
                onChange={(e) => setHideCompleted(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Hide completed
            </label>
            <button
              type="button"
              onClick={() => setShowCustomForm((s) => !s)}
              className="rounded-md border border-[#0B6E6E] px-3 py-1.5 text-xs font-semibold text-[#0B6E6E] hover:bg-[#0B6E6E] hover:text-white"
              data-testid="toggle-custom-task-form"
            >
              {showCustomForm ? 'Cancel' : '+ Add custom task'}
            </button>
          </div>
        </div>

        {showCustomForm && (
          <div className="mb-4">
            <CustomTaskForm
              defaultPhase={activePhase}
              onCreate={createCustomTask}
              onCancel={() => setShowCustomForm(false)}
            />
          </div>
        )}

        {phaseLocked && (
          <div
            role="alert"
            className="mb-4 rounded-xl border-2 border-dashed border-[#CCCCCC] bg-[#F5F5F5] p-4 text-center"
            data-testid="phase-locked-banner"
          >
            <p className="text-xs font-bold uppercase tracking-widest text-[#555555]">
              Phase {activePhase} is locked
            </p>
            <p className="mt-1 text-xs text-[#555555]">
              {activePhase === 4
                ? 'Phase 4 unlocks when you receive an Approval-in-Principle from SEC (Sprint 5).'
                : `Complete every task in Phase ${blockingPhase ?? activePhase - 1} to unlock this phase.`}
            </p>
          </div>
        )}

        {/* Task grid */}
        {activeTasks.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-[#CCCCCC] p-12 text-center">
            <p className="text-sm text-[#555555]">
              {hideCompleted && roadmap.tasks.some((t) => t.phase === activePhase && t.status === 'complete')
                ? 'All tasks for this phase are complete. Untick "Hide completed" to view them.'
                : 'No tasks in this phase yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeTasks.map((task) => (
              <RoadmapTaskCard
                key={task.id}
                task={task}
                onToggleComplete={toggleComplete}
                onOpen={setOpenTask}
                saving={savingTaskIds.has(task.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Detail drawer */}
      <TaskDetailDrawer
        task={openTask}
        onClose={() => setOpenTask(null)}
        onUpdate={updateTask}
        onDelete={deleteTask}
        onSetSolicitorIndicator={setSolicitorIndicator}
        solicitorEngaged={
          // The solicitor indicator value isn't returned by GET /roadmap — derive
          // it from the P3-01 task's lock state once we're past Phase 2:
          solicitorEngaged ||
          (roadmap.tasks.find((t) => t.templateRefId === P3_01_TEMPLATE_REF_ID)?.isLocked === false &&
            // P3-01 unlocked is only meaningful when Phase 2 is complete (otherwise it's locked regardless)
            (phaseProgress.find((p) => p.phase === 2)?.pct ?? 0) === 100)
        }
      />

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            data-testid="toast"
            className={[
              'pointer-events-auto rounded-md px-3 py-2 text-xs font-semibold shadow-lg',
              t.type === 'error'
                ? 'bg-[#C0392B] text-white'
                : t.type === 'success'
                  ? 'bg-[#1A7A4A] text-white'
                  : 'bg-[#0D2B45] text-white',
            ].join(' ')}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
