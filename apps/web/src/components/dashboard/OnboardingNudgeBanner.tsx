'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export interface OnboardingNudgeBannerProps {
  hasCompletedOnboarding: boolean;
  role: string | null;
  orgName: string | null;
}

const DISMISS_KEY = 'klarify_onboarding_nudge_dismissed';

export function OnboardingNudgeBanner({
  hasCompletedOnboarding,
  role,
  orgName,
}: OnboardingNudgeBannerProps): JSX.Element | null {
  const pathname = usePathname();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  if (hasCompletedOnboarding) return null;
  if (pathname.startsWith('/dashboard/onboarding')) return null;
  if (dismissed) return null;

  const isInvitedMember = role && role !== 'owner';

  return (
    <div className="mb-6 rounded-xl border border-[#D4A843]/40 bg-[#FDF6E3] px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#D4A843]">
            Setup incomplete
          </p>
          <h2 className="mt-1 text-base font-semibold text-[#1A1A1A]">
            {isInvitedMember
              ? 'Finish your compliance profile'
              : 'Claim your organisation and calculate your Readiness Score'}
          </h2>
          <p className="mt-1 text-sm text-[#555555]">
            {isInvitedMember ? (
              <>
                You&apos;ve joined <strong>{orgName ?? 'your team'}</strong>. Complete the 5-step
                setup so Klarify can personalise your roadmap and score.
              </>
            ) : (
              <>
                Name your organisation, tell us what you&apos;re building, and unlock your live
                Regulatory Readiness Score — takes about 3 minutes.
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href="/dashboard/onboarding"
            className="rounded-lg bg-[#0B6E6E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0D2B45]"
          >
            {isInvitedMember ? 'Complete setup →' : 'Start setup →'}
          </Link>
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem(DISMISS_KEY, '1');
              setDismissed(true);
            }}
            className="rounded-lg px-3 py-2.5 text-sm text-[#555555] transition hover:bg-[#F5F5F5]"
          >
            Remind me later
          </button>
        </div>
      </div>
    </div>
  );
}
