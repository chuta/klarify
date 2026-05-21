'use client';

import type { RoadmapApiTask } from './types';
import { P3_01_TEMPLATE_REF_ID } from './types';

interface RoadmapTaskCardProps {
  task: RoadmapApiTask;
  onToggleComplete: (task: RoadmapApiTask) => void | Promise<void>;
  onOpen: (task: RoadmapApiTask) => void;
  saving: boolean;
}

function dueDateBadge(due: string | null): { label: string; color: string } | null {
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${due}T00:00:00`);
  const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isoFmt = new Date(`${due}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  if (diff < 0) return { label: `${isoFmt} (overdue)`, color: '#C0392B' };
  if (diff <= 7) return { label: `${isoFmt} (in ${diff}d)`, color: '#D4A843' };
  return { label: isoFmt, color: '#555555' };
}

export function RoadmapTaskCard({
  task,
  onToggleComplete,
  onOpen,
  saving,
}: RoadmapTaskCardProps): JSX.Element {
  const isComplete = task.status === 'complete';
  const isLocked = task.isLocked;
  const dueBadge = dueDateBadge(task.dueDate);

  return (
    <div
      className={[
        'group relative rounded-xl border bg-white p-4 shadow-sm transition-all',
        isComplete ? 'border-[#1A7A4A]/30' : 'border-[#CCCCCC] hover:shadow-md',
        isLocked ? 'opacity-70' : '',
      ].join(' ')}
      data-testid="roadmap-task-card"
      data-task-id={task.id}
      data-phase={task.phase}
      data-locked={isLocked}
      data-status={task.status}
    >
      {isLocked && (
        <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded bg-[#F5F5F5] px-1.5 py-0.5 text-[10px] font-semibold text-[#555555]">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c-1.1 0-2 .9-2 2v2h4v-2c0-1.1-.9-2-2-2zM6 11V8a6 6 0 1112 0v3" />
            <rect x="5" y="11" width="14" height="10" rx="2" />
          </svg>
          Locked
        </div>
      )}

      <div className="mb-2 flex items-start gap-3">
        <button
          type="button"
          aria-label={isComplete ? 'Mark as not started' : 'Mark as complete'}
          disabled={isLocked || saving}
          onClick={() => { void onToggleComplete(task); }}
          data-testid="task-complete-toggle"
          className={[
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition',
            isComplete
              ? 'border-[#1A7A4A] bg-[#1A7A4A]'
              : isLocked
                ? 'cursor-not-allowed border-[#CCCCCC] bg-[#F5F5F5]'
                : saving
                  ? 'cursor-wait border-[#CCCCCC] bg-[#F5F5F5]'
                  : 'cursor-pointer border-[#CCCCCC] hover:border-[#0B6E6E]',
          ].join(' ')}
        >
          {isComplete && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {!isComplete && saving && (
            <svg className="h-3 w-3 animate-spin text-[#0B6E6E]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => onOpen(task)}
          className="min-w-0 flex-1 text-left"
          data-testid="task-open-detail"
        >
          <p
            className={[
              'text-sm font-semibold leading-snug',
              isComplete ? 'text-[#CCCCCC] line-through' : 'text-[#1A1A1A]',
            ].join(' ')}
          >
            {task.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {task.isBlocker && (
              <span
                data-testid="task-blocker-badge"
                className="rounded-full bg-[#C0392B] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
              >
                Blocker
              </span>
            )}
            {task.isCustom && (
              <span className="rounded-full border border-[#CCCCCC] px-1.5 py-0.5 text-[10px] font-semibold text-[#555555]">
                Custom
              </span>
            )}
            {!isComplete && task.indicatorKey && (
              <span className="rounded bg-[#E6F4F4] px-1.5 py-0.5 text-[10px] font-semibold text-[#0B6E6E]">
                Updates score
              </span>
            )}
            {task.templateRefId === P3_01_TEMPLATE_REF_ID && (
              <span className="rounded bg-[#FDF6E3] px-1.5 py-0.5 text-[10px] font-semibold text-[#8B6914]">
                Solicitor required
              </span>
            )}
            {dueBadge && (
              <span
                className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ borderColor: dueBadge.color, color: dueBadge.color }}
                data-testid="task-due-badge"
              >
                {dueBadge.label}
              </span>
            )}
          </div>
        </button>
      </div>

      {task.regulatoryBasis && (
        <p
          className="mt-2 rounded bg-[#F5F5F5] px-3 py-1.5 font-mono text-[10px] leading-relaxed text-[#555555]"
          data-testid="task-regulatory-basis"
        >
          {task.regulatoryBasis}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
        <button
          type="button"
          onClick={() => onOpen(task)}
          className="text-[#0B6E6E] hover:underline"
        >
          View details →
        </button>
        {task.templateId && (
          <a
            href={`/dashboard/documents?template=${task.templateId}`}
            className="rounded-md bg-[#E6F4F4] px-2 py-1 text-[10px] font-semibold text-[#0B6E6E] hover:bg-[#0B6E6E] hover:text-white transition"
            data-testid="task-generate-document"
          >
            Generate {task.templateId} →
          </a>
        )}
      </div>
    </div>
  );
}
