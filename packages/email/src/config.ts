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
