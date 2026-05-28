'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NoSymbolIcon } from '@heroicons/react/24/outline';

interface CriticalDoc {
  id: string;
  filename: string;
  daysRemaining: number | null;
}

/**
 * Dashboard CRITICAL banner (CLAUDE.md S3-C2).
 *
 * Per spec: cannot be permanently dismissed (reappears on next login if
 * the matter is still unresolved). We use `sessionStorage` not
 * `localStorage`, so closing the tab — and therefore the next login —
 * brings the banner back.
 *
 * The banner is shown when:
 *   * At least one of the user's documents has urgency_level='CRITICAL'
 *   * AND the deadline is within 7 days (or already past)
 */
export function CriticalDocumentBanner({
  doc,
}: {
  doc: CriticalDoc | null;
}): JSX.Element | null {
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (!doc) return;
    try {
      const key = `klarify:critical-banner-dismissed:${doc.id}`;
      if (sessionStorage.getItem(key) === '1') setDismissed(true);
    } catch {
      // Safari private mode etc. — fail-open (keep banner visible).
    }
  }, [doc]);

  if (!doc || dismissed || !hydrated) return null;

  const days = doc.daysRemaining;
  const subtitle =
    days === null
      ? 'No deadline specified — review immediately.'
      : days < 0
        ? `Deadline passed ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago.`
        : `${days} day${days === 1 ? '' : 's'} remaining.`;

  return (
    <div className="mb-6 flex items-start gap-4 rounded-2xl bg-[#C0392B] px-5 py-4 text-white shadow-sm">
      <NoSymbolIcon className="h-7 w-7 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold uppercase tracking-wider">
          Critical regulatory matter
        </p>
        <p className="mt-1 text-xs leading-relaxed opacity-95">
          {doc.filename} — {subtitle}{' '}
          <Link
            href={`/dashboard/documents/${doc.id}`}
            className="font-semibold underline hover:opacity-80"
          >
            View your action plan →
          </Link>
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss banner"
        onClick={() => {
          try {
            sessionStorage.setItem(
              `klarify:critical-banner-dismissed:${doc.id}`,
              '1',
            );
          } catch {
            // ignore
          }
          setDismissed(true);
        }}
        className="ml-2 shrink-0 rounded-full bg-white/15 px-2 py-1 text-xs font-semibold hover:bg-white/25"
      >
        Dismiss
      </button>
    </div>
  );
}
