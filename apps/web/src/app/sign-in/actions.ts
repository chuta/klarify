'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';

/**
 * Derives the request origin dynamically so `emailRedirectTo` is always
 * correct regardless of environment (localhost, preview deploy, production).
 * Falls back to NEXT_PUBLIC_APP_URL, then to localhost.
 */
function getRequestOrigin(): string {
  const h = headers();
  // Server Actions send an Origin header; Referer is the next best option.
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

// ── Magic link ──────────────────────────────────────────────────────────────

/**
 * Server Action: send a magic-link OTP to the supplied email.
 *
 * The Supabase OTP email redirects to /auth/callback?code=<pkce_code>.
 * The callback handles user sync and smart routing (onboarding vs dashboard).
 */
export async function signInWithMagicLink(formData: FormData): Promise<void> {
  const email = formData.get('email');
  if (typeof email !== 'string' || !email.trim()) {
    redirect('/sign-in?error=Please+enter+a+valid+email+address.');
  }

  const supabase = createClient();
  const origin   = getRequestOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    // Log full context so the deploy log shows code + status, not just the
    // generic "Error sending magic link email" string Supabase returns when
    // SMTP delivery fails on their side.
    console.error('[sign-in] magic-link signInWithOtp failed', {
      name:    error.name,
      message: error.message,
      status:  (error as { status?: number }).status,
      code:    (error as { code?: string }).code,
    });

    // The raw Supabase message is unhelpful to users (e.g. "Error sending
    // magic link email") and can leak implementation detail. Map known
    // failure modes to actionable copy; fall back to a generic friendly
    // message otherwise.
    redirect(`/sign-in?error=${encodeURIComponent(mapMagicLinkError(error.message))}`);
  }

  revalidatePath('/sign-in');
  redirect('/sign-in?sent=1');
}

/** Translate raw Supabase auth errors into user-friendly copy. */
function mapMagicLinkError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'You requested a link too recently. Please wait a minute and try again.';
  }
  if (m.includes('invalid') && m.includes('email')) {
    return 'That email address looks invalid. Please double-check and try again.';
  }
  if (m.includes('sending') || m.includes('smtp') || m.includes('delivery')) {
    return 'We could not send the sign-in link right now. Try the password tab, or try again in a minute.';
  }
  return 'We could not send the sign-in link. Please try again or use the password tab.';
}

// ── Email + password ────────────────────────────────────────────────────────

/**
 * Server Action: sign in with email + password.
 *
 * After successful authentication we call /api/auth/sync to ensure the user
 * row exists in our database, then route:
 *   - First-time users (no profile) → /onboarding
 *   - Returning users               → /dashboard
 */
export async function signInWithPassword(formData: FormData): Promise<void> {
  const email    = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || !email.trim()) {
    redirect('/sign-in?error=Please+enter+a+valid+email+address.&tab=password');
  }
  if (typeof password !== 'string' || !password) {
    redirect('/sign-in?error=Please+enter+your+password.&tab=password');
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email:    email.trim().toLowerCase(),
    password,
  });

  if (error) {
    console.error('[sign-in] password error', error.message);
    const message =
      error.message.toLowerCase().includes('invalid')
        ? 'Incorrect email or password.'
        : error.message;
    redirect(`/sign-in?error=${encodeURIComponent(message)}&tab=password`);
  }

  if (!data.session) {
    redirect('/sign-in?error=Sign-in+failed.+Please+try+again.&tab=password');
  }

  // Sync user to our DB and get the smart redirect.
  const syncResult = await apiFetch<{ redirect: string; hasProfile: boolean }>(
    '/api/auth/sync',
    data.session.access_token,
    { method: 'POST', body: JSON.stringify({}) },
  );

  redirect(syncResult.success ? syncResult.data.redirect : '/dashboard');
}

// ── Sign out ────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/sign-in');
}
