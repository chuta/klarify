'use client';

import { useEffect, useState } from 'react';

/**
 * Animated stepper rendered while a document is being analysed.
 *
 * Polls /api/documents/:id/status every 2 seconds (parent owns the poll)
 * and advances visual progress based on the status field
 * (pending → extracting → analysing → complete | error).
 *
 * Visual design — built to reduce the panic a founder feels in the 15–30
 * seconds between hitting "Upload" and seeing their action plan:
 *
 *   * Header progress bar — smooth 0% → 100% as stages complete, gives
 *     an immediate sense of "we're getting closer". Animates via CSS
 *     transition on width.
 *
 *   * Spinning conic ring on the active step — the outer ring rotates
 *     while the step number stays still in the centre (separate DOM
 *     nodes so only the border animates). Classic loader pattern but
 *     framed in our brand teal.
 *
 *   * Vertical connector lines between steps that fill teal as each
 *     step completes — communicates linear progression at a glance.
 *
 *   * Mini indeterminate bar on the active row — important because the
 *     "Analysing with Klarify AI…" step is the slow one (8–15s for
 *     Opus). The sliding bar tells the founder "we're not stuck".
 *
 *   * Live elapsed time + rotating sub-copy — concrete signals that
 *     time is passing and useful work is happening, not a frozen page.
 *
 * Reuses CLAUDE.md §7 brand tokens.
 */
type Status =
  | 'pending'
  | 'extracting'
  | 'analysing'
  | 'complete'
  | 'error';

interface StepDef {
  key: Status;
  label: string;
  /** Sub-status messages rotated under the label while this step is active. */
  subMessages: string[];
}

const STEPS: StepDef[] = [
  {
    key: 'pending',
    label: 'Uploading document…',
    subMessages: ['Securing your upload to encrypted storage'],
  },
  {
    key: 'extracting',
    label: 'Extracting text…',
    subMessages: [
      'Reading the document contents',
      'Detecting layout and structure',
    ],
  },
  {
    key: 'analysing',
    label: 'Analysing with Klarify AI…',
    subMessages: [
      'Searching the regulatory corpus for relevant guidance',
      'Identifying the issuing regulator and deadlines',
      'Drafting your 72-hour action plan',
      'Preparing a professional acknowledgement letter',
    ],
  },
  {
    key: 'complete',
    label: 'Preparing your action plan…',
    subMessages: ['Almost there — rendering the final view'],
  },
];

/** Overall percentage shown by the header progress bar for each status. */
const PROGRESS_PCT: Record<Status, number> = {
  pending: 12,
  extracting: 38,
  analysing: 72,
  complete: 100,
  error: 0,
};

export function ProcessingStepper({
  status,
  errorMessage,
}: {
  status: Status;
  errorMessage?: string | null;
}): JSX.Element {
  const activeIdx = STEPS.findIndex((s) => s.key === status);
  const isError = status === 'error';
  const isDone = status === 'complete';
  const elapsed = useElapsedSeconds(!isError && !isDone);
  const subCopyIdx = useRotatingIndex(
    !isError && activeIdx >= 0 ? STEPS[activeIdx]!.subMessages.length : 0,
    2800,
  );

  const headerPct = isError ? 0 : PROGRESS_PCT[status] ?? 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white shadow-sm">
      {/* Header progress bar — flush with the card top */}
      <div className="relative h-1.5 w-full bg-[#F0F0F0]">
        <div
          className={[
            'h-full rounded-r-full transition-[width] duration-700 ease-out',
            isError ? 'bg-[#C0392B]' : 'bg-[#0B6E6E]',
          ].join(' ')}
          style={{ width: `${headerPct}%` }}
        />
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#1A1A1A]">
              {isError
                ? 'We could not analyse this document'
                : isDone
                  ? 'Analysis complete'
                  : 'Analysing your document'}
            </h2>
            {!isError && !isDone && (
              <p className="mt-1 text-xs text-[#777]">
                This usually takes 15–30 seconds. You can leave this page
                open — we&apos;ll email you when it&apos;s ready.
              </p>
            )}
          </div>
          {!isError && !isDone && (
            <span
              className="shrink-0 rounded-full bg-[#E6F4F4] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#0B6E6E]"
              aria-label="Elapsed time"
              title="Elapsed time"
            >
              {formatElapsed(elapsed)}
            </span>
          )}
        </div>

        <ol className="mt-6">
          {STEPS.map((step, idx) => {
            const done = !isError && idx < Math.max(activeIdx, 0);
            const active = !isError && idx === Math.max(activeIdx, 0);
            const isLast = idx === STEPS.length - 1;
            const subMsg = active
              ? step.subMessages[subCopyIdx % step.subMessages.length]
              : null;
            return (
              <li key={step.key} className="relative pb-5 last:pb-0">
                {/* Connector line to the next step */}
                {!isLast && (
                  <span
                    className={[
                      'absolute left-[15px] top-8 bottom-0 w-[2px] transition-colors duration-500',
                      done ? 'bg-[#0B6E6E]' : 'bg-[#E5E5E5]',
                    ].join(' ')}
                    aria-hidden
                  />
                )}

                <div className="flex items-start gap-3">
                  <StepBadge index={idx} done={done} active={active && !isError} />

                  <div className="min-w-0 flex-1 pt-1">
                    <p
                      className={[
                        'text-sm leading-tight',
                        done
                          ? 'text-[#1A1A1A]'
                          : active
                            ? 'font-semibold text-[#0B6E6E]'
                            : 'text-[#999]',
                      ].join(' ')}
                    >
                      {step.label}
                    </p>

                    {/* Active-step sub-copy + indeterminate progress bar */}
                    {active && !isError && (
                      <div className="mt-2 space-y-2">
                        {subMsg && (
                          <p
                            key={subMsg}
                            className="text-xs text-[#777] klarify-pop"
                          >
                            {subMsg}
                          </p>
                        )}
                        <div
                          className="relative h-1 w-full overflow-hidden rounded-full bg-[#E6F4F4]"
                          aria-hidden
                        >
                          <span className="absolute inset-y-0 left-0 block h-full w-1/3 rounded-full bg-[#0B6E6E] klarify-indeterminate-bar" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {isError && (
          <div className="mt-5 rounded-lg border border-[#C0392B]/40 bg-[#FCEAE8] px-4 py-3 text-sm text-[#7a1f15]">
            {errorMessage ??
              'We hit a snag while reading your document. Please try uploading again or paste the text directly.'}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The circular step indicator. Three visual states:
 *
 *   * Done    — solid teal disc with white checkmark, scale-in animation
 *                via the `klarify-pop` keyframe so transitions feel snappy.
 *   * Active  — spinning conic ring around a static step number. The
 *                ring is a separate DOM node from the number, so only the
 *                ring rotates (Tailwind `animate-spin`) while the number
 *                stays readable in the centre.
 *   * Pending — flat grey disc with the step number.
 */
function StepBadge({
  index,
  done,
  active,
}: {
  index: number;
  done: boolean;
  active: boolean;
}): JSX.Element {
  if (done) {
    return (
      <span
        key="done"
        className="klarify-pop relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0B6E6E] text-white shadow-sm ring-4 ring-white"
      >
        <CheckIcon />
      </span>
    );
  }
  if (active) {
    return (
      <span
        className="relative h-8 w-8 shrink-0 ring-4 ring-white"
        aria-hidden
      >
        <span className="absolute inset-0 rounded-full bg-[#E6F4F4]" />
        <span className="absolute inset-0 animate-spin rounded-full border-[2.5px] border-[#0B6E6E]/15 border-t-[#0B6E6E]" />
        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#0B6E6E]">
          {index + 1}
        </span>
      </span>
    );
  }
  return (
    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-[11px] font-bold text-[#999] ring-4 ring-white">
      {index + 1}
    </span>
  );
}

function CheckIcon(): JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M4.5 10.5L8 14L15.5 6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Ticks every second when `running` is true. Resets to 0 when re-enabled. */
function useElapsedSeconds(running: boolean): number {
  const [s, setS] = useState(0);
  useEffect(() => {
    if (!running) return;
    setS(0);
    const id = setInterval(() => setS((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return s;
}

/** Rotates through `0..length-1` every `intervalMs`. No-op when length=0. */
function useRotatingIndex(length: number, intervalMs: number): number {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (length <= 1) return;
    const id = setInterval(() => setI((v) => (v + 1) % length), intervalMs);
    return () => clearInterval(id);
  }, [length, intervalMs]);
  return i;
}

/** "0:12" / "1:23" — keeps the live counter terse + monospace-aligned. */
function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
