/**
 * Client-safe URL helpers — safe to import from `'use client'` components.
 *
 * This file intentionally does NOT import `next/headers` or any other
 * server-only API. It resolves URLs exclusively from `NEXT_PUBLIC_*` env
 * vars, which Next.js inlines into the client bundle at build time.
 *
 * For server-side helpers (getAppBaseUrl, getApiBaseUrl) that may derive
 * URLs from request headers, import from `@/lib/env` inside Server
 * Components, Server Actions, or Route Handlers only.
 */

const PROTOCOL_RE = /^https?:\/\//i;
const POISON_VALUES = new Set(['', 'null', 'undefined', 'NULL', 'UNDEFINED']);

function isUsableUrl(value: string | undefined | null): value is string {
  if (value == null) return false;
  if (POISON_VALUES.has(value.trim())) return false;
  return PROTOCOL_RE.test(value.trim());
}

function normalise(url: string): string {
  return url.trim().replace(/\/$/, '');
}

/**
 * The public Hono API base URL — safe to use in browser `fetch()` calls.
 *
 * Client Components that call `fetch()` directly MUST use this (not
 * `getApiBaseUrl()` from `env.ts`) because the browser must target the
 * cross-origin Fly host (api.klarify.africa), not the Netlify origin.
 */
export function getPublicApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (isUsableUrl(envUrl)) return normalise(envUrl);
  return 'http://localhost:3001';
}

/**
 * The public web app base URL — safe to use in client-side code.
 */
export function getPublicAppBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (isUsableUrl(envUrl)) return normalise(envUrl);
  return 'http://localhost:3000';
}
