'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';

/**
 * Routes whose content is highly sensitive — uploaded regulator letters,
 * AI chat, generated/analysed compliance documents, classification inputs.
 * Session replay is STOPPED on these routes (CLAUDE.md §16 Rule 3). Defence
 * in depth: replay is also globally configured to mask all inputs + text.
 */
const SENSITIVE_PREFIXES = [
  '/dashboard/analyse',
  '/dashboard/documents',
  '/dashboard/chat',
  '/dashboard/classify',
  '/dashboard/scenario',
  '/dashboard/jurisdiction',
  '/dashboard/compliance/documents',
];

let initialised = false;

function initPostHog(): void {
  if (initialised || typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  // No key (local dev / preview without analytics) → stay disabled silently.
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? '/ingest',
    ui_host: 'https://us.posthog.com',
    // Only create person profiles for identified (logged-in) users — keeps
    // anonymous marketing traffic cheap and privacy-friendly.
    person_profiles: 'identified_only',
    // App Router: capture pageviews manually on route change (below).
    capture_pageview: false,
    capture_pageleave: true,
    // Klarify holds regulatory letters and compliance data. Mask everything in
    // replays by default; sensitive routes stop recording entirely.
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
    },
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') ph.debug(false);
    },
  });
  initialised = true;
}

function PostHogRouteTracker(): null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!initialised || !pathname) return;

    // Stop replay on sensitive routes; resume elsewhere.
    const isSensitive = SENSITIVE_PREFIXES.some((p) => pathname.startsWith(p));
    if (isSensitive) {
      posthog.stopSessionRecording();
    } else {
      posthog.startSessionRecording();
    }

    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

/**
 * Mounted once at the root layout so the full funnel — marketing pages,
 * pricing, signup, dashboard — is captured under one PostHog instance.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }): JSX.Element {
  useEffect(() => {
    initPostHog();
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogRouteTracker />
      </Suspense>
      {children}
    </PHProvider>
  );
}
