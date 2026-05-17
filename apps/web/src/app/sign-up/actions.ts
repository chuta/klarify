'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';

/**
 * Server Action: register a new Klarify account with email + password.
 *
 * Flow:
 *   1. Validate inputs (name, email, password, confirm).
 *   2. Call supabase.auth.signUp() — stores user in Supabase auth.users and
 *      saves `name` in user_metadata so the app can read it on first login.
 *   3a. If Supabase requires email confirmation (production default):
 *       redirect to /sign-up?sent=1 and wait for the user to click their link.
 *       The /auth/callback handler will call /api/auth/sync and route them to
 *       /onboarding automatically.
 *   3b. If email confirmation is disabled (dev / Supabase auto-confirm):
 *       we get a session immediately — call /api/auth/sync manually and
 *       redirect straight to /onboarding.
 */
export async function signUp(formData: FormData): Promise<void> {
  const name     = (formData.get('name')     as string | null)?.trim()     ?? '';
  const email    = (formData.get('email')    as string | null)?.trim().toLowerCase() ?? '';
  const password = (formData.get('password') as string | null) ?? '';
  const confirm  = (formData.get('confirm')  as string | null) ?? '';

  // Basic server-side validation (the client form validates first, but Server
  // Actions are always reachable directly so we must guard here too).
  if (!name)                       redirect('/sign-up?error=Name+is+required.');
  if (!email || !email.includes('@')) redirect('/sign-up?error=Please+enter+a+valid+email.');
  if (password.length < 8)         redirect('/sign-up?error=Password+must+be+at+least+8+characters.');
  if (password !== confirm)        redirect('/sign-up?error=Passwords+do+not+match.');

  const supabase = createClient();
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },                               // stored in Supabase user_metadata
      emailRedirectTo: `${appUrl}/auth/callback`,   // confirmation email link target
    },
  });

  if (error) {
    console.error('[sign-up] error', error.message);
    const message =
      error.message.toLowerCase().includes('already registered')
        ? 'An account with this email already exists. Try signing in instead.'
        : error.message;
    redirect(`/sign-up?error=${encodeURIComponent(message)}`);
  }

  // Case A: email confirmation is required — session is null until confirmed.
  if (!data.session) {
    redirect('/sign-up?sent=1');
  }

  // Case B: auto-confirm is on (dev) — session is available immediately.
  // Sync the user to our DB and redirect to onboarding.
  const syncResult = await apiFetch<{ redirect: string }>(
    '/api/auth/sync',
    data.session.access_token,
    { method: 'POST', body: JSON.stringify({ name }) },
  );

  redirect(syncResult.success ? syncResult.data.redirect : '/dashboard/onboarding');
}
