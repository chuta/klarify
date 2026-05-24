import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiFetch } from '@/lib/api';

/**
 * GET /auth/callback
 *
 * Supabase redirects here after the user clicks their magic link OR confirms
 * their email after sign-up. The URL contains either:
 *   - `code`       (PKCE flow — preferred by @supabase/ssr)
 *   - `token_hash` + `type` (email OTP hash flow — fallback)
 *
 * After exchanging the code for a session we:
 *   1. Call POST /api/auth/sync with the fresh access token so the user row
 *      is guaranteed to exist in our `users` table (FK anchor for everything).
 *   2. Let the API decide the redirect: '/onboarding' for first-time users,
 *      '/dashboard' for returning users who already have a profile.
 *
 * On any error we redirect to /sign-in with a human-readable message.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);

  const code      = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type      = searchParams.get('type') as
    | 'magiclink' | 'email' | 'recovery' | 'invite' | 'signup' | null;
  // `next` allows the original request (e.g. resetPasswordForEmail's redirectTo
  // or signInWithOtp's options.emailRedirectTo) to override the default
  // post-auth destination — used for the password-reset and invite flows.
  const next      = searchParams.get('next');

  const errorRedirect = `${origin}/sign-in?error=${encodeURIComponent(
    'Your sign-in link has expired or is invalid. Please request a new one.',
  )}`;

  const supabase = createClient();

  // ── 1. Exchange code / token for a Supabase session ───────────────────── //
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/callback] PKCE exchange error', error.message);
      return NextResponse.redirect(errorRedirect);
    }
  } else if (tokenHash && type) {
    // `verifyOtp` accepts a narrower union — narrow before calling.
    const otpType = type === 'magiclink' || type === 'recovery' || type === 'invite' || type === 'signup' || type === 'email'
      ? type
      : 'email';
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    if (error) {
      console.error('[auth/callback] OTP verify error', error.message);
      return NextResponse.redirect(errorRedirect);
    }
  } else {
    // Bots, prefetchers, or stale bookmarks — not a real auth failure.
    console.warn('[auth/callback] missing code and token_hash');
    return NextResponse.redirect(errorRedirect);
  }

  // ── 1b. Password-recovery flow short-circuits user sync ─────────────── //
  // For type=recovery (or when ?next points to /auth/reset-password) the user
  // is in a recovery session and must set a new password before reaching the
  // dashboard. Don't run /api/auth/sync — let the reset-password page handle
  // it after the password is updated.
  if (type === 'recovery' || next === '/auth/reset-password') {
    return NextResponse.redirect(`${origin}/auth/reset-password`);
  }

  // ── 2. Sync user to our database + determine routing ─────────────────── //
  // getSession() doesn't expose `user` in its type union — use getUser() alongside it.
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();

  if (session && user) {
    // Pull the display name Supabase may have stored in user_metadata.
    const name: string | undefined =
      (user.user_metadata?.name as string | undefined)
      ?? (user.user_metadata?.full_name as string | undefined)
      ?? undefined;

    const syncResult = await apiFetch<{ redirect: string; hasProfile: boolean }>(
      '/api/auth/sync',
      session.access_token,
      {
        method: 'POST',
        body: JSON.stringify({ name }),
      },
    );

    if (syncResult.success) {
      // Honor `?next` if the original auth flow specified a destination.
      const destination = next ?? syncResult.data.redirect;
      return NextResponse.redirect(`${origin}${destination}`);
    }

    // Sync failed — log and fall back to dashboard (non-blocking for UX).
    console.error('[auth/callback] user sync failed:', syncResult.error);
  }

  // Fallback: if we have a session but sync failed, go to dashboard.
  return NextResponse.redirect(`${origin}${next ?? '/dashboard'}`);
}
