'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

function getRequestOrigin(): string {
  const h = headers();
  const origin = h.get('origin');
  if (origin) return origin;

  const referer = h.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // malformed referer — fall through
    }
  }

  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

/**
 * Server Action: send a password-reset email via Supabase Auth.
 *
 * Supabase will send the "Reset Password" template (configured in the
 * Dashboard) which contains a {{ .ConfirmationURL }} pointing to
 * /auth/callback?type=recovery&code=…  — the callback then redirects
 * the user to /auth/reset-password where they choose a new password.
 *
 * Security note: we always redirect to the "check your inbox" state
 * regardless of whether the email exists in our system. This prevents
 * account-enumeration attacks via the reset endpoint.
 */
export async function requestPasswordReset(formData: FormData): Promise<void> {
  const emailRaw = formData.get('email');
  const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';

  if (!email || !email.includes('@')) {
    redirect('/sign-in/forgot-password?error=Please+enter+a+valid+email+address.');
  }

  const supabase = createClient();
  const origin   = getRequestOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset-password`,
  });

  if (error) {
    console.error('[forgot-password] reset error', error.message);
    // Don't reveal whether the email exists — generic confirmation only.
  }

  redirect('/sign-in/forgot-password?sent=1');
}
