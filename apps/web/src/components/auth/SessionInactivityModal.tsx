'use client';

import { useEffect, useRef } from 'react';
import { SESSION_WARNING_SECONDS } from '@/lib/session-inactivity/constants';

export interface SessionInactivityModalProps {
  open: boolean;
  secondsRemaining: number;
  isExtending: boolean;
  onStaySignedIn: () => void;
}

export function SessionInactivityModal({
  open,
  secondsRemaining,
  isExtending,
  onStaySignedIn,
}: SessionInactivityModalProps): JSX.Element | null {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) buttonRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const urgent = secondsRemaining <= 10;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-idle-title"
      aria-describedby="session-idle-desc"
      data-testid="session-inactivity-modal"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <div
            className={[
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold',
              urgent ? 'bg-[#FDEDEC] text-[#C0392B]' : 'bg-[#FDF6E3] text-[#D4A843]',
            ].join(' ')}
            aria-hidden="true"
          >
            {secondsRemaining}
          </div>
          <div>
            <h2 id="session-idle-title" className="text-lg font-semibold text-[#1A1A1A]">
              Still there?
            </h2>
            <p id="session-idle-desc" className="mt-1 text-sm leading-relaxed text-[#555555]">
              You have been inactive for 30 minutes. For your security, you will be signed out
              in{' '}
              <span className={urgent ? 'font-semibold text-[#C0392B]' : 'font-semibold text-[#0B6E6E]'}>
                {secondsRemaining} second{secondsRemaining === 1 ? '' : 's'}
              </span>
              .
            </p>
          </div>
        </div>

        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-[#F5F5F5]">
          <div
            className={[
              'h-full rounded-full transition-all duration-1000 ease-linear',
              urgent ? 'bg-[#C0392B]' : 'bg-[#D4A843]',
            ].join(' ')}
            style={{ width: `${(secondsRemaining / SESSION_WARNING_SECONDS) * 100}%` }}
            role="progressbar"
            aria-valuenow={secondsRemaining}
            aria-valuemin={0}
            aria-valuemax={SESSION_WARNING_SECONDS}
          />
        </div>

        <button
          ref={buttonRef}
          type="button"
          onClick={() => void onStaySignedIn()}
          disabled={isExtending}
          className="flex w-full items-center justify-center rounded-xl bg-[#0B6E6E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0D2B45] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isExtending ? 'Restoring session…' : 'Stay signed in'}
        </button>

        <p className="mt-3 text-center text-xs text-[#555555]">
          Compliance data stays protected when sessions are not actively in use.
        </p>
      </div>
    </div>
  );
}
