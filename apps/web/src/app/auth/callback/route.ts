import { type NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';
import { isPkceVerifierError } from '@/lib/supabase/auth-errors';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';

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
  const next      = searchParams.get('next');

  const pkceErrorRedirect = `${origin}/sign-in?error=${encodeURIComponent(
    'Open the sign-in link in the same browser where you requested it, or request a new magic link.',
  )}`;
  const errorRedirect = `${origin}/sign-in?error=${encodeURIComponent(
    'Your sign-in link has expired or is invalid. Please request a new one.',
  )}`;

  const { supabase, applyCookiesTo } = createSupabaseRouteHandlerClient(request);

  // ── 1. Exchange code / token for a Supabase session ───────────────────── //
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      if (isPkceVerifierError(error)) {
        console.warn('[auth/callback] PKCE verifier missing —', error.message);
        return applyCookiesTo(NextResponse.redirect(pkceErrorRedirect));
      }
      console.warn('[auth/callback] PKCE exchange error', error.message);
      return applyCookiesTo(NextResponse.redirect(errorRedirect));
    }
  } else if (tokenHash && type) {
    const otpType = type === 'magiclink' || type === 'recovery' || type === 'invite' || type === 'signup' || type === 'email'
      ? type
      : 'email';
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    if (error) {
      console.warn('[auth/callback] OTP verify error', error.message);
      return applyCookiesTo(NextResponse.redirect(errorRedirect));
    }
  } else {
    console.warn('[auth/callback] missing code and token_hash');
    return NextResponse.redirect(errorRedirect);
  }

  // ── 1b. Password-recovery flow short-circuits user sync ─────────────── //
  if (type === 'recovery' || next === '/auth/reset-password') {
    return applyCookiesTo(NextResponse.redirect(`${origin}/auth/reset-password`));
  }

  // ── 2. Sync user to our database + determine routing ─────────────────── //
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user } } = await supabase.auth.getUser();

  if (session && user) {
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
      const destination = next ?? syncResult.data.redirect;
      return applyCookiesTo(NextResponse.redirect(`${origin}${destination}`));
    }

    console.error('[auth/callback] user sync failed:', syncResult.error);
  }

  return applyCookiesTo(NextResponse.redirect(`${origin}${next ?? '/dashboard'}`));
}
