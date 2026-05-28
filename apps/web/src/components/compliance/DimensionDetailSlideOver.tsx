'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { MiniRadialGauge } from './MiniRadialGauge';
import { CloseIcon } from '@/components/icons';

function scoreColor(score: number): string {
  if (score <= 40) return '#C0392B';
  if (score <= 70) return '#D4A843';
  if (score <= 90) return '#1A7A4A';
  return '#0B6E6E';
}

export interface DimensionDetail {
  key: string;
  label: string;
  weight: string;
  indicators: readonly string[];
}

export interface DimensionDetailSlideOverProps {
  dimension: DimensionDetail;
  score: number;
  onClose: () => void;
}

export function DimensionDetailSlideOver({
  dimension,
  score,
  onClose,
}: DimensionDetailSlideOverProps): JSX.Element {
  const color = scoreColor(score);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/40 backdrop-blur-sm sm:items-stretch"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`${dimension.label} — dimension details`}
      data-testid="dimension-detail-slide-over"
    >
      <div
        className="flex h-[85vh] w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-full sm:max-w-md sm:rounded-l-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#F5F5F5] px-5 py-4">
          <div className="flex items-center gap-3">
            <MiniRadialGauge score={score} size={52} />
            <div>
              <h2 className="text-base font-semibold text-[#1A1A1A]">{dimension.label}</h2>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="rounded bg-[#F5F5F5] px-1.5 py-0.5 text-[10px] font-semibold text-[#555555]">
                  {dimension.weight} of total score
                </span>
                <span className="text-sm font-bold" style={{ color }}>
                  {score}
                  <span className="text-xs font-normal text-[#CCCCCC]">/100</span>
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#555555] transition hover:bg-[#F5F5F5]"
            aria-label="Close"
          >
            <CloseIcon size="md" />
          </button>
        </div>

        {/* Full-width progress */}
        <div className="shrink-0 px-5 py-3">
          <div className="h-2 overflow-hidden rounded-full bg-[#F5F5F5]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${score}%`, backgroundColor: color }}
            />
          </div>
        </div>

        {/* Indicators — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 pb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#555555]">
            This dimension covers
          </p>
          <ul className="space-y-2">
            {dimension.indicators.map((ind) => (
              <li key={ind} className="flex items-start gap-2.5 text-sm text-[#555555]">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                {ind}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 border-t border-[#F5F5F5] px-5 py-4">
          <p className="mb-3 text-xs text-[#555555]">
            Complete related roadmap tasks to improve this score.
          </p>
          <Link
            href="/dashboard/roadmap"
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#0B6E6E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
          >
            View roadmap →
          </Link>
        </div>
      </div>
    </div>
  );
}
