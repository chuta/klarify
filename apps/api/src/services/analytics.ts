// Server-side PostHog capture (posthog-node).
//
// Used for events that must NOT depend on the browser — billing activation,
// payment failures, and any backend-confirmed conversion. Events are flushed
// immediately (flushAt: 1) because webhook handlers are short-lived.
//
// Disabled silently when POSTHOG_API_KEY is unset (local dev / tests).

import { PostHog } from 'posthog-node';

let client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.POSTHOG_API_KEY;
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, {
      host: process.env.POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

export interface ServerEvent {
  /** Stable per-user id. Falls back to the org id when no user is in scope. */
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
  /** Group analytics — almost always `{ organisation: orgId }`. */
  groups?: Record<string, string>;
}

export function captureServerEvent({ distinctId, event, properties, groups }: ServerEvent): void {
  const c = getClient();
  if (!c) return;
  try {
    c.capture({ distinctId, event, properties, groups });
  } catch (err) {
    console.error('[analytics] capture failed', err);
  }
}

/** Flush and close on graceful shutdown so buffered events aren't lost. */
export async function shutdownAnalytics(): Promise<void> {
  if (!client) return;
  try {
    await client.shutdown();
  } catch {
    // best-effort
  }
}
