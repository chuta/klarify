'use client';

import { CloseIcon, StatusLine } from '@/components/icons';

import { useEffect, useState } from 'react';
import type { RoadmapApiTask } from './types';
import { P3_01_TEMPLATE_REF_ID } from './types';

interface TaskDetailDrawerProps {
  task: RoadmapApiTask | null;
  onClose: () => void;
  onUpdate: (taskId: string, body: TaskUpdateBody) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onSetSolicitorIndicator: (value: boolean) => Promise<void>;
  solicitorEngaged: boolean;
}

export interface TaskUpdateBody {
  status?: 'not_started' | 'in_progress' | 'complete' | 'blocked';
  dueDate?: string | null;
  notes?: string | null;
}

const DEBOUNCE_MS = 500;

export function TaskDetailDrawer({
  task,
  onClose,
  onUpdate,
  onDelete,
  onSetSolicitorIndicator,
  solicitorEngaged,
}: TaskDetailDrawerProps): JSX.Element | null {
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [dueDate, setDueDate] = useState(task?.dueDate ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Reset local state when the drawer opens for a different task.
  useEffect(() => {
    setNotes(task?.notes ?? '');
    setDueDate(task?.dueDate ?? '');
    setSavedAt(null);
  }, [task?.id]);

  // Debounced auto-save for notes + due date.
  useEffect(() => {
    if (!task) return;
    const normalisedNotes = notes.trim() === '' ? null : notes;
    const normalisedDue = dueDate === '' ? null : dueDate;
    if (normalisedNotes === (task.notes ?? null) && normalisedDue === (task.dueDate ?? null)) return;
    const timer = setTimeout(() => {
      void (async () => {
        setSaving(true);
        try {
          await onUpdate(task.id, { notes: normalisedNotes, dueDate: normalisedDue });
          setSavedAt(new Date());
        } finally {
          setSaving(false);
        }
      })();
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [notes, dueDate, task, onUpdate]);

  if (!task) return null;

  const isP301 = task.templateRefId === P3_01_TEMPLATE_REF_ID;
  const isComplete = task.status === 'complete';

  async function markComplete(): Promise<void> {
    if (!task || task.isLocked) return;
    setSaving(true);
    try {
      await onUpdate(task.id, { status: 'complete' });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  async function markNotStarted(): Promise<void> {
    if (!task) return;
    setSaving(true);
    try {
      await onUpdate(task.id, { status: 'not_started' });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  async function deleteTask(): Promise<void> {
    if (!task || !task.isCustom) return;
    setDeleting(true);
    try {
      await onDelete(task.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 sm:items-stretch"
      role="dialog"
      aria-modal="true"
      aria-label={`Task details: ${task.title}`}
      onClick={onClose}
      data-testid="task-detail-drawer"
    >
      <div
        className="flex h-[85vh] w-full flex-col overflow-y-auto rounded-t-2xl bg-white p-6 sm:h-full sm:w-[480px] sm:rounded-t-none sm:rounded-l-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0B6E6E]">
              Phase {task.phase}
              {task.templateRefId ? ` · ${task.templateRefId}` : ' · Custom task'}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[#1A1A1A]">{task.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close task details"
            className="text-[#555555] hover:text-[#1A1A1A]"
          >
            <CloseIcon size="md" />
          </button>
        </div>

        {/* P3-01 solicitor warning — non-dismissible amber banner. */}
        {isP301 && (
          <div
            role="alert"
            className="mb-4 rounded-lg border-2 border-[#D4A843] bg-[#FDF6E3] p-3"
            data-testid="solicitor-warning"
          >
            <StatusLine variant="warning" className="text-xs font-bold uppercase tracking-wide text-[#8B6914]">
              Solicitor required
            </StatusLine>
            <p className="mt-1 text-xs leading-relaxed text-[#1A1A1A]">
              Under Section 16 of the ARIP Framework, your application must be filed
              through a registered solicitor or adviser. You cannot self-file. Tick
              the box below once a solicitor has been engaged so Phase 3 can proceed.
            </p>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#1A1A1A]">
              <input
                type="checkbox"
                checked={solicitorEngaged}
                onChange={(e) => void onSetSolicitorIndicator(e.target.checked)}
                className="h-4 w-4 rounded border-[#CCCCCC]"
                data-testid="solicitor-engaged-checkbox"
              />
              <span>I have engaged a registered solicitor / adviser</span>
            </label>
          </div>
        )}

        {task.description && (
          <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-[#555555]">
            {task.description}
          </p>
        )}

        {task.regulatoryBasis && (
          <div className="mb-4 rounded-lg border border-[#CCCCCC] bg-[#F5F5F5] p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#555555]">
              Regulatory basis
            </p>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-[#1A1A1A]">
              {task.regulatoryBasis}
            </p>
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-[#555555]">
            Due date
            <input
              type="date"
              value={dueDate ?? ''}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={task.isLocked}
              className="mt-1 w-full rounded-md border border-[#CCCCCC] px-2 py-1 text-xs text-[#1A1A1A]"
              data-testid="task-due-date-input"
            />
          </label>
          <div className="text-xs font-semibold text-[#555555]">
            Status
            <p className="mt-1 inline-flex items-center gap-2 rounded-md border border-[#CCCCCC] px-2 py-1 text-xs">
              <span
                className={[
                  'h-1.5 w-1.5 rounded-full',
                  isComplete
                    ? 'bg-[#1A7A4A]'
                    : task.status === 'in_progress'
                      ? 'bg-[#D4A843]'
                      : task.status === 'blocked'
                        ? 'bg-[#C0392B]'
                        : 'bg-[#CCCCCC]',
                ].join(' ')}
              />
              <span className="font-semibold text-[#1A1A1A]">
                {task.status.replace('_', ' ')}
              </span>
            </p>
          </div>
        </div>

        <label className="text-xs font-semibold text-[#555555]">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes, blockers, owner, etc."
            rows={4}
            className="mt-1 w-full rounded-md border border-[#CCCCCC] px-2 py-1 text-xs text-[#1A1A1A]"
            data-testid="task-notes-input"
          />
        </label>

        <div className="mt-2 flex h-5 items-center gap-2 text-[11px] text-[#555555]">
          {saving && <span data-testid="task-saving">Saving…</span>}
          {!saving && savedAt && (
            <span data-testid="task-saved">Saved {savedAt.toLocaleTimeString()}</span>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2">
            {!isComplete && (
              <button
                type="button"
                onClick={() => { void markComplete(); }}
                disabled={task.isLocked || saving}
                className="rounded-md bg-[#0B6E6E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0a5b5b] disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="task-mark-complete"
              >
                Mark complete
              </button>
            )}
            {isComplete && (
              <button
                type="button"
                onClick={() => { void markNotStarted(); }}
                disabled={saving}
                className="rounded-md border border-[#CCCCCC] px-3 py-1.5 text-xs font-semibold text-[#555555] hover:border-[#0B6E6E]"
              >
                Reopen task
              </button>
            )}
            {task.templateId && (
              <a
                href={`/dashboard/documents?template=${task.templateId}`}
                className="rounded-md border border-[#0B6E6E] px-3 py-1.5 text-xs font-semibold text-[#0B6E6E] hover:bg-[#0B6E6E] hover:text-white"
              >
                Generate {task.templateId}
              </a>
            )}
            <a
              href={`/dashboard/chat?from=roadmap&taskId=${task.id}`}
              className="rounded-md border border-[#CCCCCC] px-3 py-1.5 text-xs font-semibold text-[#555555] hover:border-[#0B6E6E]"
            >
              Ask Klarify
            </a>
          </div>
          {task.isCustom && (
            <button
              type="button"
              onClick={() => { void deleteTask(); }}
              disabled={deleting}
              className="text-xs text-[#C0392B] hover:underline"
              data-testid="task-delete"
            >
              {deleting ? 'Deleting…' : 'Delete custom task'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
