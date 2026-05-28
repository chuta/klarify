'use client';

// Interaction History Panel — Sprint 5-C1.
// Slide-over panel (desktop) / bottom sheet (mobile) showing interaction log.

import { useState, useEffect, useCallback } from 'react';
import type { InteractionType, RegulatorInteraction } from '@klarify/core';
import { CloseIcon, Download } from '@/components/icons';
import {
  InteractionTypeIcon,
} from '@/components/regulators/InteractionTypeIcon';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

interface InteractionHistoryProps {
  regulatorCode: string;
  regulatorName: string;
  onClose: () => void;
}

const TYPE_STYLES: Record<
  InteractionType,
  { label: string; bg: string; color: string }
> = {
  call:       { label: 'Call',       bg: '#EFF6FF', color: '#1D4ED8' },
  email:      { label: 'Email',      bg: '#ECFDF5', color: '#059669' },
  meeting:    { label: 'Meeting',    bg: '#F5F3FF', color: '#7C3AED' },
  submission: { label: 'Submission', bg: '#FFFBEB', color: '#D97706' },
  letter:     { label: 'Letter',     bg: '#E8EEF4', color: '#0D2B45' },
};

const ALL_FILTER = 'all';
type FilterType = InteractionType | typeof ALL_FILTER;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatFollowUpDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function InteractionHistory({
  regulatorCode,
  regulatorName,
  onClose,
}: InteractionHistoryProps): JSX.Element {
  const [interactions, setInteractions] = useState<RegulatorInteraction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>(ALL_FILTER);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ regulator_code: regulatorCode, limit: '100' });
      if (filter !== ALL_FILTER) params.set('type', filter);
      const res = await fetch(`/api/regulators/interactions?${params}`);
      const data = await res.json() as {
        success: boolean;
        data?: RegulatorInteraction[];
        meta?: { total: number };
      };
      if (data.success && data.data) {
        setInteractions(data.data);
        setTotal(data.meta?.total ?? data.data.length);
      }
    } catch {
      // Silently fail — empty state shown.
    } finally {
      setIsLoading(false);
    }
  }, [regulatorCode, filter]);

  useEffect(() => { void load(); }, [load]);

  const markComplete = useCallback(async (id: string) => {
    setMarkingId(id);
    try {
      const res = await fetch(`/api/regulators/interactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isComplete: true }),
      });
      const data = await res.json() as { success: boolean };
      if (data.success) {
        setInteractions((prev) =>
          prev.map((i) => (i.id === id ? { ...i, isComplete: true } : i)),
        );
      }
    } catch {
      // Silently fail.
    } finally {
      setMarkingId(null);
    }
  }, []);

  const filterButtons: { value: FilterType; label: string }[] = [
    { value: ALL_FILTER, label: 'All' },
    ...Object.entries(TYPE_STYLES).map(([k, v]) => ({
      value: k as FilterType,
      label: v.label,
    })),
  ];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 backdrop-blur-sm sm:items-stretch"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={`Interaction history — ${regulatorName}`}
    >
      {/* Panel */}
      <div className="flex h-full w-full flex-col bg-white shadow-2xl sm:max-w-xl sm:rounded-l-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F5F5F5] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#1A1A1A]">
              {regulatorName}
            </h2>
            <p className="text-xs text-[#555555]">
              {total} interaction{total !== 1 ? 's' : ''} logged
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* CSV Export */}
            <a
              href="/api/regulators/interactions/export"
              download
              className="flex items-center gap-1.5 rounded-lg border border-[#CCCCCC] px-3 py-1.5 text-xs font-medium text-[#555555] transition hover:bg-[#F5F5F5]"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#555555] transition hover:bg-[#F5F5F5]"
              aria-label="Close"
            >
              <CloseIcon size="md" />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex gap-1 overflow-x-auto border-b border-[#F5F5F5] px-4 py-2.5">
          {filterButtons.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                filter === value
                  ? 'bg-[#0B6E6E] text-white'
                  : 'bg-[#F5F5F5] text-[#555555] hover:bg-[#E6F4F4]'
              }`}
            >
              <InteractionTypeIcon
                type={value === ALL_FILTER ? 'all' : value}
                className="h-3.5 w-3.5"
              />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#0B6E6E] border-t-transparent" />
            </div>
          ) : interactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardDocumentListIcon className="mb-3 h-10 w-10 text-[#CCCCCC]" aria-hidden />
              <p className="text-sm font-medium text-[#1A1A1A]">No interactions logged yet</p>
              <p className="mt-1 text-xs text-[#555555]">
                Log a call, email, or meeting to start building your regulatory engagement record.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#F5F5F5]">
              {interactions.map((i) => {
                const typeStyle = TYPE_STYLES[i.interactionType as InteractionType] ?? TYPE_STYLES.call;
                const isExpanded = expandedId === i.id;
                const followUpFormatted = formatFollowUpDate(i.followUpDate);

                return (
                  <li key={i.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      {/* Type badge */}
                      <span
                        className="mt-0.5 flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold"
                        style={{ backgroundColor: typeStyle.bg, color: typeStyle.color }}
                      >
                        <InteractionTypeIcon
                          type={i.interactionType as InteractionType}
                          className="h-3.5 w-3.5"
                        />
                        {typeStyle.label}
                      </span>

                      <div className="min-w-0 flex-1">
                        {/* Subject + date */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-snug text-[#1A1A1A]">
                            {i.subject}
                          </p>
                          <p className="shrink-0 text-xs text-[#CCCCCC]">
                            {formatDate(i.occurredAt)}
                          </p>
                        </div>

                        {/* Outcome preview */}
                        {i.outcome && (
                          <p
                            className={`mt-1 text-xs leading-relaxed text-[#555555] ${
                              !isExpanded ? 'line-clamp-2' : ''
                            }`}
                          >
                            {i.outcome}
                          </p>
                        )}
                        {i.outcome && i.outcome.length > 120 && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : i.id)}
                            className="mt-0.5 text-xs text-[#0B6E6E] hover:underline"
                          >
                            {isExpanded ? 'Show less' : 'Show more'}
                          </button>
                        )}

                        {/* Follow-up badge */}
                        {i.followUpRequired && (
                          <div className="mt-2 flex items-center gap-2">
                            {i.isComplete ? (
                              <span className="flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-medium text-[#059669]">
                                ✓ Follow-up complete
                              </span>
                            ) : (
                              <>
                                <span className="rounded-full bg-[#FFFBEB] px-2 py-0.5 text-[11px] font-medium text-[#D97706]">
                                  Follow-up: {followUpFormatted ?? 'Date not set'}
                                </span>
                                <button
                                  onClick={() => void markComplete(i.id)}
                                  disabled={markingId === i.id}
                                  className="text-[11px] text-[#0B6E6E] hover:underline disabled:opacity-50"
                                >
                                  {markingId === i.id ? 'Saving…' : 'Mark complete'}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
