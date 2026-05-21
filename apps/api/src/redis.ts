// =============================================================================
// Redis singleton — used by:
//   * rateLimitAI middleware (Sprint 2 — monthly AI query counters)
//   * future: session cache, signed-URL nonces, document-analysis queue
//
// CLAUDE.md §3 — "Cache: Redis (sessions + rate limiting)".
//
// The wrapper handles:
//   * Lazy connection (no connect until first command — keeps cold starts fast)
//   * TLS auto-detection for rediss:// (Redis Cloud / Upstash)
//   * Graceful degradation when REDIS_URL is absent (returns null; callers
//     decide whether to fail-open or 503)
// =============================================================================
// `ioredis` ships CJS with the Redis class as a named export. Under
// `moduleResolution: node`, the default import fails type-checking
// (`Cannot use namespace 'Redis' as a type` / "not constructable").
// Use the named import for both the type AND the constructor.
import { Redis } from 'ioredis';

let cached: Redis | null | undefined;

/**
 * Returns the shared Redis client, or `null` if REDIS_URL is not configured.
 *
 * Callers that depend on Redis (rate limiting) should treat `null` as a
 * configuration error and fail-open in dev / 503 in prod — never silently
 * skip enforcement.
 */
export function getRedis(): Redis | null {
  if (cached !== undefined) return cached;

  const url = process.env.REDIS_URL;
  if (!url || url.trim() === '') {
    console.warn('[redis] REDIS_URL not set — rate limiting will fail-open');
    cached = null;
    return cached;
  }

  // ioredis enables TLS automatically for rediss:// URLs.
  // For plain redis:// over Redis Cloud (which still listens on TLS on the
  // managed cluster), the URL host implies it — but ioredis only reads the
  // scheme. The Redis Cloud free tier issued by Redis Inc uses plain `redis://`
  // and works without TLS.
  cached = new Redis(url, {
    // Don't open the socket until the first command. Cuts ~80ms off cold starts
    // for routes that don't touch Redis (e.g. /api/health).
    lazyConnect: true,
    // Production-friendly: don't crash the API on a transient blip.
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    // Cap reconnect backoff at 2s. The default scales infinitely which keeps
    // dead connections alive forever after a network change (e.g. WiFi switch).
    retryStrategy: (times: number) => Math.min(times * 200, 2000),
    // Surface connection errors in logs without crashing the worker.
    reconnectOnError: (err: Error) => {
      console.warn('[redis] reconnect on error:', err.message);
      return false;
    },
  });

  cached.on('error', (err: Error) => {
    // Logged here only — callers handle null/empty replies themselves.
    console.warn('[redis] error:', err.message);
  });

  cached.on('ready', () => {
    console.warn('[redis] ready');
  });

  return cached;
}

/**
 * Compute seconds-until-end-of-calendar-month (UTC). Used as the TTL for the
 * monthly query-count key in rateLimitAI: the counter expires exactly when
 * the user's quota window rolls over, so we never need a separate reset job.
 */
export function secondsUntilEndOfMonth(now: Date = new Date()): number {
  // First day of next month at 00:00:00 UTC.
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
}

/**
 * Canonical key format for the monthly AI-query counter (CLAUDE.md §15 —
 * rate limiting on all AI endpoints). Mirrors the doc literally so anyone
 * inspecting Redis from `redis-cli` sees the expected key shape.
 */
export function aiQueryCounterKey(userId: string, now: Date = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `ai_queries:${userId}:${yyyy}:${mm}`;
}


/**
 * Canonical key format for the monthly document-analysis counter
 * (Sprint 3 hotfix — `PLAN_LIMITS.document_analyses`). Mirrors
 * `aiQueryCounterKey` so the two limiters share a naming convention and
 * are trivial to inspect in `redis-cli`.
 */
export function documentAnalysisCounterKey(
  userId: string,
  now: Date = new Date(),
): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `doc_analyses:${userId}:${yyyy}:${mm}`;
}
