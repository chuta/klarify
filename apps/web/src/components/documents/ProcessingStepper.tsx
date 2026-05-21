'use client';

/**
 * Animated stepper rendered while a document is being analysed.
 * Polls /api/documents/:id/status every 2 seconds and advances visual
 * progress based on the status field (pending → extracting → analysing
 * → complete | error).
 *
 * Reuses CLAUDE.md §7 brand tokens. Built to reduce the panic a founder
 * feels in the 15–30 seconds between hitting "Upload" and seeing their
 * action plan.
 */
type Status =
  | 'pending'
  | 'extracting'
  | 'analysing'
  | 'complete'
  | 'error';

const STEPS: Array<{ key: Status; label: string }> = [
  { key: 'pending', label: 'Uploading document…' },
  { key: 'extracting', label: 'Extracting text…' },
  { key: 'analysing', label: 'Analysing with Klarify AI…' },
  { key: 'complete', label: 'Preparing your action plan…' },
];

export function ProcessingStepper({
  status,
  errorMessage,
}: {
  status: Status;
  errorMessage?: string | null;
}): JSX.Element {
  const activeIdx = STEPS.findIndex((s) => s.key === status);
  const isError = status === 'error';

  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#1A1A1A]">
        {isError ? 'We could not analyse this document' : 'Analysing your document'}
      </h2>
      {!isError && (
        <p className="mt-1 text-xs text-[#777]">
          This usually takes 15–30 seconds. You can leave this page open — we&apos;ll
          email you when it&apos;s ready.
        </p>
      )}

      <ol className="mt-5 space-y-3">
        {STEPS.map((step, idx) => {
          const done = !isError && idx < Math.max(activeIdx, 0);
          const active = !isError && idx === Math.max(activeIdx, 0);
          return (
            <li key={step.key} className="flex items-center gap-3">
              <span
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  done
                    ? 'bg-[#0B6E6E] text-white'
                    : active
                      ? 'bg-[#0B6E6E]/15 text-[#0B6E6E] ring-2 ring-[#0B6E6E]'
                      : 'bg-[#F5F5F5] text-[#999]',
                ].join(' ')}
              >
                {done ? '✓' : idx + 1}
              </span>
              <span
                className={[
                  'text-sm',
                  done
                    ? 'text-[#1A1A1A]'
                    : active
                      ? 'font-medium text-[#0B6E6E]'
                      : 'text-[#999]',
                ].join(' ')}
              >
                {step.label}
              </span>
              {active && !isError && (
                <span
                  className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#0B6E6E]"
                  aria-hidden
                />
              )}
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
  );
}
