'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';

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
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    console.error('[sign-in] magic link error', error.message);
    redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath('/sign-in');
  redirect('/sign-in?sent=1');
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
