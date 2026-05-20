/**
 * Resolves the web app's public base URL and the API base URL at runtime,
 * with multi-layer fallback so we never feed `"null"` or `undefined` into
 * a `new URL()` call.
 *
 * Why this file exists
 * ────────────────────
 * The original pattern across the codebase was:
 *
 *   const url = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
 *
 * `??` only swaps the right-hand fallback in when the LHS is `null` or
 * `undefined` — NOT when the value is the literal string `"null"`. If the
 * Netlify env-var UI is configured with the word "null" (which it
 * silently allows), or if a tool somewhere JSON.stringify-ed an actual
 * null into the env value, the string `"null"` propagates through the
 * codebase and eventually reaches Next.js's metadata resolver which
 * calls `new URL('/icon.png', 'null')` and throws:
 *
 *   TypeError: Invalid URL  { code: 'ERR_INVALID_URL', input: 'null' }
 *
 * The fix is to validate the env value AND to derive a base URL from the
 * incoming request headers when no usable env is present. Netlify always
 * sets a meaningful `host` header on the function request, so production
 * never has to fall back to `localhost`.
 */

import { headers } from 'next/headers';

const PROTOCOL_RE = /^https?:\/\//i;
const POISON_VALUES = new Set(['', 'null', 'undefined', 'NULL', 'UNDEFINED']);

/** True if a candidate env value is a usable absolute http(s) URL. */
function isUsableUrl(value: string | undefined | null): value is string {
  if (value == null) return false;
  if (POISON_VALUES.has(value.trim())) return false;
  return PROTOCOL_RE.test(value.trim());
}

/** Strip any trailing slash so callers can safely template `${base}/path`. */
function normalise(url: string): string {
  return url.trim().replace(/\/$/, '');
}

/**
 * Returns the canonical base URL of the *web* app (no trailing slash).
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_APP_URL` if it is a valid http(s) URL.
 *   2. The incoming request's `x-forwarded-proto` + `host` headers, which
 *      Netlify, Vercel, Fly, and standard reverse-proxies all set.
 *   3. `http://localhost:3000` as a last-resort dev fallback. (Production
 *      should never reach this branch — if it does, the host header was
 *      missing AND the env was unset; surface a warning so ops can see it.)
 *
 * Safe to call from any Server Component, Server Action, Route Handler,
 * or middleware — it never throws.
 */
export function getAppBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (isUsableUrl(envUrl)) return normalise(envUrl);

  // Try to derive from the live request headers. `headers()` throws if
  // called outside a request context (e.g. during a build-time prerender)
  // — guard with try/catch so callers don't need to.
  try {
    const h = headers();
    const host  = h.get('host');
    const proto =
      h.get('x-forwarded-proto') ??
      (host && host.startsWith('localhost') ? 'http' : 'https');
    if (host && !POISON_VALUES.has(host)) {
      return `${proto}://${host}`;
    }
  } catch {
    // Outside a request scope — fall through.
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[env] getAppBaseUrl(): NEXT_PUBLIC_APP_URL is unset AND no host header was available. ' +
      'Falling back to http://localhost:3000 — emails and redirects will be broken. ' +
      'Set NEXT_PUBLIC_APP_URL on the deploy target.',
    );
  }
  return 'http://localhost:3000';
}

/**
 * Returns the canonical base URL of the Hono API (no trailing slash).
 *
 * Resolution order:
 *   1. `API_URL` (server-only env — preferred for SSR fetches).
 *   2. `NEXT_PUBLIC_API_URL` (legacy fallback; also used by Client
 *      Components that hit the API directly via fetch).
 *   3. `http://localhost:3001` as the dev default.
 *
 * Never derives from request headers — the API host is intentionally a
 * separate origin (api.klarify.africa) and cannot be inferred from the
 * web app's own `host` header.
 */
export function getApiBaseUrl(): string {
  const candidates = [process.env.API_URL, process.env.NEXT_PUBLIC_API_URL];
  for (const c of candidates) {
    if (isUsableUrl(c)) return normalise(c);
  }

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[env] getApiBaseUrl(): neither API_URL nor NEXT_PUBLIC_API_URL is a valid ' +
      'http(s) URL — falling back to http://localhost:3001. Set NEXT_PUBLIC_API_URL ' +
      '= https://api.klarify.africa on the deploy target.',
    );
  }
  return 'http://localhost:3001';
}
