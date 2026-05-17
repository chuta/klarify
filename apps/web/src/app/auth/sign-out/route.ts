import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /auth/sign-out
 *
 * Signs the current user out and redirects to /sign-in.
 * Use a <form method="POST" action="/auth/sign-out"> in the UI so
 * the sign-out can't be triggered by a third-party GET request (CSRF).
 *
 * Also handles GET for browser-direct navigation convenience (e.g.
 * clicking a "sign out" link), though POST is preferred.
 */
async function handleSignOut(_request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(
    new URL('/sign-in', _request.url),
  );

  // Belt-and-suspenders: clear the auth cookies even if signOut() fails.
  // @supabase/ssr stamps them; names follow the sb-<project>-auth-token pattern.
  for (const cookie of _request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token')) {
      response.cookies.delete(cookie.name);
    }
  }

  return response;
}

export const GET = handleSignOut;
export const POST = handleSignOut;
