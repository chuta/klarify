'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCanonicalAppOrigin } from '@/lib/env';

/**
 * Server Action: send a password-reset email via Supabase Auth.
 *
 * Branded reset emails link directly to /auth/callback with token_hash
 * (see packages/email/src/supabase/reset-password.html). redirectTo is
 * still set for Supabase allowlist compatibility.
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
  const appUrl   = getCanonicalAppOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`,
  });

  if (error) {
    // Log full diagnostic context for ops — but never surface it to the
    // user (account-enumeration prevention: always show the same confirmation).
    console.error('[forgot-password] resetPasswordForEmail failed', {
      name:    error.name,
      message: error.message,
      status:  (error as { status?: number }).status,
      code:    (error as { code?: string }).code,
    });
  }

  redirect('/sign-in/forgot-password?sent=1');
}
