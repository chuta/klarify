'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';
import type { OnboardingCompleteInput } from '@klarify/core';

interface OnboardingResult {
  error?: string;
}

/**
 * Server Action: submit the completed 5-step onboarding wizard.
 *
 * Called from the client wizard component on step 5 "Submit".
 * Returns { error } on failure so the wizard can surface it inline.
 * On success, redirects to /dashboard.
 *
 * Token-refresh strategy:
 *   Call supabase.auth.getUser() before getSession(). getUser() validates
 *   the access token against Supabase's server and, if expired, uses the
 *   refresh token to obtain a new access token which is written back to the
 *   session cookies. getSession() then reads the fresh cookie value.
 *   This prevents the "Invalid or expired session" error when a user spends
 *   more than 60 minutes on the onboarding wizard before submitting.
 *
 * User-sync strategy:
 *   Before posting onboarding data we call /api/auth/sync to guarantee the
 *   user row exists in our `users` table (the FK anchor for organisations,
 *   profiles, readiness scores etc.). This is a no-op for users who came
 *   through the normal auth callback flow, but acts as a safety net for
 *   any edge case where sync was missed.
 */
export async function submitOnboarding(
  data: OnboardingCompleteInput,
): Promise<OnboardingResult> {
  const supabase = createClient();

  // Force token validation + refresh before reading the session.
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: 'Your session has expired. Please sign in again.' };
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { error: 'Your session has expired. Please sign in again.' };
  }

  // Ensure user row exists in our DB (sync is idempotent — safe to call every time).
  const syncResult = await apiFetch<{ hasProfile: boolean }>(
    '/api/auth/sync',
    session.access_token,
    {
      method: 'POST',
      body: JSON.stringify({
        name: (user.user_metadata?.name as string | undefined) ?? undefined,
      }),
    },
  );

  if (!syncResult.success) {
    console.error('[onboarding] user sync failed:', syncResult.error);
    // Non-fatal — continue even if sync fails; onboarding will create the org anyway.
  }

  // Submit the onboarding payload.
  const result = await apiFetch<{ score: number; redirect: string }>(
    '/api/onboarding/complete',
    session.access_token,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );

  if (!result.success) {
    return { error: result.error ?? 'Onboarding failed. Please try again.' };
  }

  redirect('/dashboard');
}
