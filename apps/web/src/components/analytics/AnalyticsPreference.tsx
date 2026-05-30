'use client';

import { useEffect, useState } from 'react';
import {
  isAnalyticsConfigured,
  isAnalyticsEnabled,
  setAnalyticsEnabled,
} from '@/lib/analytics/events';

/**
 * Product-analytics consent toggle.
 *
 * Self-contained and client-only: PostHog persists the opt-out flag in
 * localStorage and honours it on every init, so there's no server state to
 * sync. Default is enabled (opted in). Turning it off stops both event
 * capture and session replay.
 *
 * Built for founders who understand telemetry — it's transparent about what
 * we collect (usage patterns, never regulatory content) and lets them opt
 * out in one click.
 */
export function AnalyticsPreference(): JSX.Element | null {
  const configured = isAnalyticsConfigured();

  // `null` until we've read the persisted state on the client (avoids an SSR
  // flash of the wrong toggle position).
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    setEnabled(isAnalyticsEnabled());
  }, []);

  // No PostHog token in this environment — nothing meaningful to toggle.
  if (!configured) return null;

  const isOn = enabled ?? true;

  const handleToggle = (): void => {
    const next = !isOn;
    setEnabled(next);
    setAnalyticsEnabled(next);
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-[#1A1A1A] text-sm">Product analytics</span>
          <span className="inline-flex items-center rounded bg-[#E6F4F4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#0B6E6E]">
            On by default
          </span>
        </div>
        <p className="text-[#555555] text-xs leading-relaxed">
          Share anonymous usage data, which features you use and where you get
          stuck, so we can improve Klarify. We never collect the content of
          your documents, classifications, chats, or uploaded letters; only
          actions, categories, and counts. Turning this off also disables
          session replay on your account.
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={`${isOn ? 'Disable' : 'Enable'} product analytics`}
        onClick={handleToggle}
        disabled={enabled === null}
        className={[
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
          'focus:outline-none focus:ring-2 focus:ring-[#0B6E6E] focus:ring-offset-2',
          isOn ? 'bg-[#0B6E6E] cursor-pointer' : 'bg-[#E5E7EB] cursor-pointer',
          enabled === null ? 'opacity-60 cursor-wait' : '',
        ].join(' ')}
      >
        <span
          className={[
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            isOn ? 'translate-x-6' : 'translate-x-1',
          ].join(' ')}
        />
      </button>
    </div>
  );
}
