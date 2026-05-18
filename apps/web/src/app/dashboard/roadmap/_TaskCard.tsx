'use client';

import { useState } from 'react';

interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  regulatoryBasis: string | null;
  templateId: string | null;
  indicatorKey: string | null;
  status: string;
  phase: number;
  accessToken: string;
  onScoreUpdate?: (totalScore: number, dimensions: Record<string, number>) => void;
}

const STATUS_STYLES: Record<string, { label: string; dot: string; text: string }> = {
  not_started: { label: 'Not Started', dot: 'bg-[#CCCCCC]',  text: 'text-[#555555]' },
  in_progress:  { label: 'In Progress',  dot: 'bg-[#D4A843]',  text: 'text-[#D4A843]' },
  complete:     { label: 'Complete',     dot: 'bg-[#1A7A4A]',  text: 'text-[#1A7A4A]' },
  blocked:      { label: 'Blocked',      dot: 'bg-[#C0392B]',  text: 'text-[#C0392B]' },
};

export function TaskCard({
  id,
  title,
  description,
  regulatoryBasis,
  templateId,
  indicatorKey,
  status: initialStatus,
  accessToken,
  onScoreUpdate,
}: TaskCardProps): JSX.Element {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const style = STATUS_STYLES[status] ?? STATUS_STYLES['not_started']!;
  const isComplete = status === 'complete';

  async function markComplete(): Promise<void> {
    if (isComplete || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/compliance/roadmap/task/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const json = (await res.json()) as {
        success: boolean;
        data?: { scoreUpdate?: { totalScore: number; dimensions: Record<string, number> } };
      };
      if (json.success) {
        setStatus('complete');
        if (json.data?.scoreUpdate && onScoreUpdate) {
          onScoreUpdate(json.data.scoreUpdate.totalScore, json.data.scoreUpdate.dimensions);
        }
      }
    } catch {
      // Silently fail — the UI will remain in its current state.
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={[
        'rounded-xl border bg-white shadow-sm transition-all duration-200',
        isComplete ? 'border-[#1A7A4A]/30 opacity-75' : 'border-[#CCCCCC]',
      ].join(' ')}
    >
      <div className="p-4">
        {/* Header row */}
        <div className="mb-2 flex items-start gap-3">
          {/* Complete checkbox */}
          <button
            type="button"
            onClick={markComplete}
            disabled={isComplete || loading}
            aria-label={isComplete ? 'Task complete' : 'Mark as complete'}
            className={[
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition',
              isComplete
                ? 'border-[#1A7A4A] bg-[#1A7A4A] cursor-default'
                : loading
                  ? 'border-[#CCCCCC] bg-[#F5F5F5] cursor-wait'
                  : 'border-[#CCCCCC] hover:border-[#0B6E6E] cursor-pointer',
            ].join(' ')}
          >
            {isComplete && (
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
            {loading && (
              <svg className="h-3 w-3 animate-spin text-[#0B6E6E]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <p className={['text-sm font-semibold leading-snug', isComplete ? 'line-through text-[#CCCCCC]' : 'text-[#1A1A1A]'].join(' ')}>
              {title}
            </p>

            {/* Status badge */}
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              <span className={`text-[11px] font-medium ${style.text}`}>{style.label}</span>
              {indicatorKey && !isComplete && (
                <span className="ml-1 rounded bg-[#E6F4F4] px-1.5 py-0.5 text-[10px] font-semibold text-[#0B6E6E]">
                  Updates score
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-1 flex items-center gap-1 text-[11px] text-[#CCCCCC] hover:text-[#0B6E6E] transition"
        >
          {expanded ? 'Hide details ↑' : 'Show details ↓'}
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-3 space-y-2 border-t border-[#F5F5F5] pt-3">
            <p className="text-xs text-[#555555] leading-relaxed">{description}</p>

            {regulatoryBasis && (
              <p className="rounded bg-[#F5F5F5] px-3 py-2 font-mono text-[10px] text-[#555555]">
                📋 {regulatoryBasis}
              </p>
            )}

            {templateId && (
              <a
                href={`/dashboard/documents?template=${templateId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#E6F4F4] px-3 py-1.5 text-xs font-semibold text-[#0B6E6E] hover:bg-[#0B6E6E] hover:text-white transition"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate {templateId} document →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
