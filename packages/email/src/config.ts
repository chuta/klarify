// Environment-driven email configuration.
//
// Reads at import time so callers get a single shared config object.
// In test/dev, falls back to sensible defaults so emails can still render
// even when env vars aren't set.

export interface EmailConfig {
  /** Resend API key (server-side only — never expose to browser). */
  apiKey: string;
  /** Default From header, e.g. "Klarify <hello@klarify.africa>". */
  from: string;
  /** Default Reply-To header — usually the support inbox. */
  replyTo: string;
  /** Absolute URL to the Klarify wordmark for use in email headers. */
  logoUrl: string;
  /** Public app URL (used to build CTA links in emails). */
  appUrl: string;
  /** BCC the platform team on critical operational emails (optional). */
  bcc?: string;
}

function env(name: string, fallback?: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (fallback !== undefined) return fallback;
  // Don't throw at module load — let send() throw if the key is actually needed.
  return '';
}

export const emailConfig: EmailConfig = {
  apiKey:  env('RESEND_API_KEY'),
  from:    env('EMAIL_FROM',     'Klarify <hello@klarify.africa>'),
  replyTo: env('EMAIL_REPLY_TO', 'hello@klarify.africa'),
  // Hosted on the Next.js public folder, served by Netlify at the app URL.
  logoUrl: env(
    'EMAIL_LOGO_URL',
    `${env('NEXT_PUBLIC_APP_URL', 'https://klarify.africa')}/klarify_logo.png`,
  ),
  appUrl:  env('NEXT_PUBLIC_APP_URL', 'https://klarify.africa'),
  bcc:     env('EMAIL_BCC', '') || undefined,
};

export const COMPANY = {
  legalName:  'Blockspace Technologies Limited',
  tradeName:  'Klarify Africa',
  tagline:    'Navigate Regulated Markets with Confidence',
  address:    'Lagos, Nigeria',
  supportEmail: 'hello@klarify.africa',
  website:    'https://klarify.africa',
} as const;

// =============================================================================
// URL builders — single source of truth for in-app links inside emails.
//
// All template CTAs MUST use these helpers. Hardcoding the host (e.g.
// `https://klarify.africa/...`) or constructing paths inline has caused
// production incidents (Sprint 3 hotfix: document-analysis CTAs were linking
// to `/dashboard/documents?id={uuid}` while the actual page lives at
// `/dashboard/documents/{id}`). Routing through these helpers prevents
// drift the next time the web app's routes change.
// =============================================================================

/**
 * Join the configured app URL with a path. Tolerates trailing slashes on the
 * base and leading slashes on the path; always returns a clean absolute URL.
 *
 * Examples:
 *   buildAppUrl('/dashboard')             → "https://klarify.africa/dashboard"
 *   buildAppUrl('dashboard/onboarding')   → "https://klarify.africa/dashboard/onboarding"
 *   buildAppUrl('')                       → "https://klarify.africa"
 */
export function buildAppUrl(path: string): string {
  const base = emailConfig.appUrl.replace(/\/+$/, '');
  if (!path) return base;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Canonical CTA URL for the document analyser results page.
 * Mirrors the Next.js route `apps/web/src/app/dashboard/documents/[id]/page.tsx`.
 *
 * The id is URI-encoded defensively — uploaded_documents.id is a UUID today,
 * but if we ever introduce slug-style ids (e.g. from a share-link feature) we
 * don't want to ship a broken link.
 */
export function buildDocumentAnalysisUrl(documentId: string): string {
  return buildAppUrl(`/dashboard/documents/${encodeURIComponent(documentId)}`);
}
