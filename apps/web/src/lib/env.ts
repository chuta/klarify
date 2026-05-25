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
const PRODUCTION_CANONICAL_ORIGIN = 'https://klarify.africa';

/** Netlify deploy-preview / branch URLs — never use for auth redirects in production. */
export function isNetlifyDeployHost(hostname: string): boolean {
  return hostname.endsWith('.netlify.app') || hostname.endsWith('.netlify.live');
}

/** In production, map Netlify deploy hosts to the public custom domain. */
function sanitiseAppOrigin(origin: string): string {
  if (process.env.NODE_ENV !== 'production') return origin;
  try {
    if (isNetlifyDeployHost(new URL(origin).hostname)) {
      return PRODUCTION_CANONICAL_ORIGIN;
    }
  } catch {
    // Malformed origin — fall through unchanged.
  }
  return origin;
}

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
  if (isUsableUrl(envUrl)) return sanitiseAppOrigin(normalise(envUrl));

  // Try to derive from the live request headers. `headers()` throws if
  // called outside a request context (e.g. during a build-time prerender)
  // — guard with try/catch so callers don't need to.
  try {
    const h = headers();
    const host  = h.get('x-forwarded-host') ?? h.get('host');
    const proto =
      h.get('x-forwarded-proto') ??
      (host && host.startsWith('localhost') ? 'http' : 'https');
    if (host && !POISON_VALUES.has(host)) {
      return sanitiseAppOrigin(normalise(`${proto}://${host}`));
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
 * Origin to use for auth redirects (callback success/error, email links).
 * Never sends users to a Netlify deploy subdomain when production is
 * configured for klarify.africa.
 */
export function getCanonicalAppOrigin(requestUrl?: URL): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (isUsableUrl(envUrl)) return sanitiseAppOrigin(normalise(envUrl));

  if (requestUrl) {
    const host = requestUrl.hostname;
    if (isNetlifyDeployHost(host) && process.env.NODE_ENV === 'production') {
      return PRODUCTION_CANONICAL_ORIGIN;
    }
    if (host === 'klarify.africa' || host === 'localhost' || host === '127.0.0.1') {
      return requestUrl.origin;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_CANONICAL_ORIGIN;
  }

  const fallback = requestUrl?.origin ?? 'http://localhost:3000';
  return sanitiseAppOrigin(fallback);
}

/**
 * Canonical origin for auth redirects from a Route Handler `NextRequest`.
 * Prefer this over `new URL(path, request.url)` — Netlify can set
 * `request.url` to a deploy-preview subdomain even when the user browses
 * klarify.africa.
 */
export function getCanonicalAppOriginFromRequest(request: {
  url: string;
  headers: { get(name: string): string | null };
}): string {
  try {
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get('x-forwarded-host');
    if (forwardedHost && !POISON_VALUES.has(forwardedHost)) {
      const proto =
        request.headers.get('x-forwarded-proto')
        ?? (forwardedHost.startsWith('localhost') ? 'http' : 'https');
      return getCanonicalAppOrigin(new URL(`${proto}://${forwardedHost}`));
    }
    return getCanonicalAppOrigin(requestUrl);
  } catch {
    return getCanonicalAppOrigin();
  }
}

/**
 * Returns the canonical base URL of the Hono API for SERVER-SIDE fetches
 * (no trailing slash).
 *
 * Resolution order:
 *   1. `API_URL` (server-only env — preferred for SSR fetches).
 *   2. `NEXT_PUBLIC_API_URL` (legacy fallback; also used by Client
 *      Components that hit the API directly via fetch).
 *   3. `http://localhost:3001` as the dev default.
 *
 * IMPORTANT — use the right helper for the right caller:
 *   * Server-side (Server Component, Server Action, Route Handler) calls
 *     can target either origin in the hybrid surface (CLAUDE.md §3):
 *       - short-lived /api/* Route Handlers on the Netlify origin, OR
 *       - the Hono service on Fly.
 *     `getApiBaseUrl()` honours `API_URL` so the deploy can pin SSR
 *     fetches at the Netlify origin to skip the cross-origin hop.
 *   * Client-side (anything that runs in a browser `fetch`) MUST target
 *     the Fly origin for AI / classify / documents endpoints — those do
 *     not exist on Netlify. Server components that hand a base URL to a
 *     client component therefore MUST resolve it via
 *     `getPublicApiBaseUrl()` (below), not this function. Passing a
 *     Netlify origin to a client `fetch()` returns the Next.js SPA
 *     fallback HTML and breaks JSON.parse() with the canonical
 *     "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON" error.
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

/**
 * Returns the PUBLIC base URL of the Hono API — the one that browsers
 * must hit (no trailing slash).
 *
 * Resolution order:
 *   1. `NEXT_PUBLIC_API_URL` if it is a valid http(s) URL. Next.js inlines
 *      this into the client bundle at build time, so calling this helper
 *      from a Server Component returns exactly the URL the browser would
 *      compute on its own.
 *   2. `http://localhost:3001` as the dev default.
 *
 * Use this — NOT `getApiBaseUrl()` — anywhere a Server Component, Server
 * Action, or Route Handler threads an API base URL into a Client
 * Component as a prop or serialised state. The Client Component then
 * fetches that URL from the browser, which means it must point at the
 * cross-origin Fly host (api.klarify.africa), not the Netlify origin
 * (klarify.africa) — Netlify only has Route Handlers for a subset of
 * endpoints, so a request to e.g. `/api/documents/analyse` against the
 * Netlify origin falls through to the Next.js SPA HTML fallback.
 *
 * Mirrors the resolution pattern already used inline by the classify
 * page (apps/web/src/app/dashboard/classify/page.tsx) and the chat
 * hook (packages/ai/src/chat/useKlarifyChat.ts).
 */
export function getPublicApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (isUsableUrl(envUrl)) return normalise(envUrl);

  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[env] getPublicApiBaseUrl(): NEXT_PUBLIC_API_URL is not a valid http(s) URL ' +
      '— falling back to http://localhost:3001. Set NEXT_PUBLIC_API_URL ' +
      '= https://api.klarify.africa on the deploy target.',
    );
  }
  return 'http://localhost:3001';
}
