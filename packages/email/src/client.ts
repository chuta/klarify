import { Resend } from 'resend';
import type { ReactElement } from 'react';
import { emailConfig } from './config.js';
import { renderEmail } from './render.js';

/**
 * Lazy Resend client. We don't instantiate at import time because
 * `process.env.RESEND_API_KEY` may not be loaded yet in some contexts
 * (Next.js Server Actions read env lazily, the API uses a manual loader).
 */
let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  const apiKey = emailConfig.apiKey || process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not configured. Set it in the environment before sending emails.',
    );
  }
  _resend = new Resend(apiKey);
  return _resend;
}

export interface SendEmailInput {
  /** Recipient email address (or array of addresses). */
  to: string | string[];
  /** Subject line — keep it under 60 characters where possible. */
  subject: string;
  /** Rendered React Email element. */
  template: ReactElement;
  /** Override the default reply-to (optional). */
  replyTo?: string;
  /** BCC addresses (optional — also reads `EMAIL_BCC` env). */
  bcc?: string | string[];
  /** Override From (optional — defaults to EMAIL_FROM). */
  from?: string;
  /** Tag the email for analytics in Resend dashboard. */
  tag?: string;
  /** Idempotency key — Resend dedupes identical sends for 24h (see Resend SDK). */
  idempotencyKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send a Klarify transactional email via Resend.
 *
 * Renders the React Email `template` to HTML + plain-text, then dispatches
 * via the Resend SDK. Errors are caught and returned in the result rather
 * than thrown — so callers (e.g. auth-sync) can ignore email failures without
 * crashing critical user flows.
 *
 * In dev (NODE_ENV !== 'production') the email is rendered but only logged
 * when RESEND_API_KEY is empty — so local development never accidentally
 * sends real email.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const { html, text } = await renderEmail(input.template);

    // Local-dev safety: if no key, render-only mode.
    if (!emailConfig.apiKey && !process.env.RESEND_API_KEY) {
      console.warn(
        `[email] RESEND_API_KEY missing — skipping send to ${
          Array.isArray(input.to) ? input.to.join(', ') : input.to
        } (subject: "${input.subject}")`,
      );
      return { success: false, error: 'RESEND_API_KEY_MISSING' };
    }

    const resend = getResend();
    const response = await resend.emails.send(
      {
        from:    input.from ?? emailConfig.from,
        to:      input.to,
        subject: input.subject,
        html,
        text,
        replyTo: input.replyTo ?? emailConfig.replyTo,
        bcc:     input.bcc ?? emailConfig.bcc,
        tags:    input.tag ? [{ name: 'category', value: input.tag }] : undefined,
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
    );

    if (response.error) {
      console.error('[email] Resend error', response.error);
      return { success: false, error: response.error.message };
    }

    return { success: true, id: response.data?.id };
  } catch (err) {
    console.error('[email] send failed', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown email send error',
    };
  }
}
