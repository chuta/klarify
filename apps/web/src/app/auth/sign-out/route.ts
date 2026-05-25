import { type NextRequest, NextResponse } from 'next/server';
import { getCanonicalAppOriginFromRequest } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /auth/sign-out
 *
 * Signs the current user out and redirects to /sign-in on the canonical
 * production origin (klarify.africa). Never uses `request.url` as the
 * redirect base — Netlify deploy-preview hostnames in `request.url` caused
 * intermittent 500s after sign-out.
 *
 * Use a <form method="POST" action="/auth/sign-out"> in the UI so
 * the sign-out can't be triggered by a third-party GET request (CSRF).
 *
 * Also handles GET for browser-direct navigation convenience (e.g.
 * clicking a "sign out" link), though POST is preferred.
 *
 * 303 See Other — force GET on /sign-in after POST (307 would re-POST).
 */
async function handleSignOut(request: NextRequest): Promise<NextResponse> {
  const origin = getCanonicalAppOriginFromRequest(request);
  const signInUrl = `${origin}/sign-in`;

  try {
    const supabase = createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('[auth/sign-out] signOut failed — clearing cookies anyway', err);
  }

  const response = NextResponse.redirect(signInUrl, 303);

  // Belt-and-suspenders: clear the auth cookies even if signOut() fails.
  // @supabase/ssr stamps them; names follow the sb-<project>-auth-token pattern.
  for (const cookie of request.cookies.getAll()) {
    if (/^sb-.+-auth-token(\.\d+)?$/.test(cookie.name)) {
      response.cookies.delete(cookie.name);
    }
  }

  return response;
}

export const GET = handleSignOut;
export const POST = handleSignOut;
