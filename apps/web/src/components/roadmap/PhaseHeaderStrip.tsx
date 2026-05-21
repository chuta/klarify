'use client';

import { PHASE_META, type RoadmapApiPhaseProgress } from './types';

interface PhaseHeaderStripProps {
  progress: RoadmapApiPhaseProgress[];
  activePhase: 1 | 2 | 3 | 4;
  onSelect: (phase: 1 | 2 | 3 | 4) => void;
}

// Phase header strip — horizontal row of 4 phase cards (desktop) /
// pill tabs (mobile <640px). CLAUDE.md S4-A2.
export function PhaseHeaderStrip({ progress, activePhase, onSelect }: PhaseHeaderStripProps): JSX.Element {
  return (
    <div
      role="tablist"
      aria-label="Roadmap phases"
      className="-mx-1 mb-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0"
      data-testid="phase-header-strip"
    >
      {([1, 2, 3, 4] as const).map((phase) => {
        const meta = PHASE_META[phase];
        const p = progress.find((x) => x.phase === phase) ?? {
          phase,
          total: 0,
          complete: 0,
          pct: 0,
          isLocked: false,
        };
        const isActive = activePhase === phase;
        const isLocked = p.isLocked;
        return (
          <button
            key={phase}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`phase-panel-${phase}`}
            onClick={() => onSelect(phase)}
            data-testid={`phase-tab-${phase}`}
            data-phase={phase}
            data-locked={isLocked}
            className={[
              'group relative flex shrink-0 snap-start flex-col gap-2 rounded-xl border px-4 py-3 text-left transition-all',
              'min-w-[180px] sm:min-w-0',
              isActive
                ? 'border-[var(--phase-color)] bg-white shadow-md'
                : 'border-[#CCCCCC] bg-white/70 hover:border-[var(--phase-color)] hover:bg-white',
              isLocked && !isActive ? 'opacity-70' : '',
            ].join(' ')}
            style={{
              ['--phase-color' as never]: meta.color,
              backgroundColor: isActive ? meta.bg : undefined,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>
                  Phase {phase}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[#1A1A1A]">{meta.title.split('—')[1]?.trim() ?? meta.title}</p>
                <p className="mt-0.5 hidden text-[11px] text-[#555555] sm:block">{meta.subtitle}</p>
              </div>
              {isLocked && (
                <svg
                  aria-label="locked"
                  className="h-4 w-4 shrink-0 text-[#CCCCCC]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 11c-1.1 0-2 .9-2 2v2h4v-2c0-1.1-.9-2-2-2zM6 11V8a6 6 0 1112 0v3"
                  />
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                </svg>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#1A1A1A]">
                {p.complete}/{p.total}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#F5F5F5]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${p.pct}%`, backgroundColor: meta.color }}
                />
              </div>
              <span className="text-[11px] text-[#555555]">{p.pct}%</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
