/**
 * Canonical URLs for Supabase auth redirects (email confirmation, magic link,
 * password reset). Email links must land on klarify.africa — not a Netlify
 * deploy subdomain — and must not depend on PKCE cookies stored in the browser
 * that requested the email (see packages/email/src/supabase templates).
 */

const PRODUCTION_APP_ORIGIN = 'https://klarify.africa';
const LOCAL_DEV_ORIGIN = 'http://localhost:3000';

function isUsableUrl(value: string | undefined | null): value is string {
  if (value == null) return false;
  const trimmed = value.trim();
  return trimmed.startsWith('http') && !['null', 'undefined', ''].includes(trimmed);
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

/**
 * Client-safe callback URL passed to `emailRedirectTo` on sign-up / magic link.
 * Prefers NEXT_PUBLIC_APP_URL, then same-origin when host is allowed, then
 * production canonical URL.
 */
export function getAuthCallbackUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (isUsableUrl(envUrl)) {
    return `${stripTrailingSlash(envUrl)}/auth/callback`;
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (hostname === 'klarify.africa' || hostname === 'localhost' || hostname === '127.0.0.1') {
      return `${origin}/auth/callback`;
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return `${PRODUCTION_APP_ORIGIN}/auth/callback`;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }

  return `${LOCAL_DEV_ORIGIN}/auth/callback`;
}
