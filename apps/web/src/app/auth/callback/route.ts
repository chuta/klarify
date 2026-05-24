import { type NextRequest, NextResponse } from 'next/server';
import { apiFetch } from '@/lib/api';
import { getCanonicalAppOrigin } from '@/lib/env';
import { isPkceVerifierError } from '@/lib/supabase/auth-errors';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route-handler';

type OtpType =
  | 'magiclink'
  | 'email'
  | 'recovery'
  | 'invite'
  | 'signup'
  | 'email_change';

function resolveOtpType(type: string | null): OtpType {
  if (
    type === 'magiclink'
    || type === 'recovery'
    || type === 'invite'
    || type === 'signup'
    || type === 'email_change'
    || type === 'email'
  ) {
    return type;
  }
  return 'email';
}

/**
 * GET /auth/callback
 *
 * Supabase redirects here after the user clicks their magic link OR confirms
 * their email after sign-up. The URL contains either:
 *   - `code`       (PKCE flow — requires verifier cookie in same browser)
 *   - `token_hash` + `type` (email OTP hash — works in any browser; preferred)
 *
 * Branded auth emails link directly with token_hash (see packages/email).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = getCanonicalAppOrigin(requestUrl);

  const code      = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type      = searchParams.get('type');
  const next      = searchParams.get('next');

  const pkceErrorRedirect = `${origin}/sign-in?error=${encodeURIComponent(
    'Open the sign-in link in the same browser where you requested it, or request a new magic link.',
  )}`;
  const errorRedirect = `${origin}/sign-in?error=${encodeURIComponent(
    'Your sign-in link has expired or is invalid. Please request a new one.',
  )}`;

  const { supabase, applyCookiesTo } = createSupabaseRouteHandlerClient(request);

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
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: resolveOtpType(type),
    });
    if (error) {
      console.warn('[auth/callback] OTP verify error', error.message);
      return applyCookiesTo(NextResponse.redirect(errorRedirect));
    }
  } else {
    console.warn('[auth/callback] missing code and token_hash');
    return NextResponse.redirect(errorRedirect);
  }

  if (type === 'recovery' || next === '/auth/reset-password') {
    return applyCookiesTo(NextResponse.redirect(`${origin}/auth/reset-password`));
  }

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
