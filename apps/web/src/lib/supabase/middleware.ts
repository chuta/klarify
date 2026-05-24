import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { isStaleRefreshTokenError } from '@/lib/supabase/auth-errors';

/**
 * Refreshes the Supabase session on every request so tokens never go
 * stale. Must be called from the root middleware.ts — it owns cookie
 * mutations so RSCs downstream get a fresh session automatically.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are required.',
    );
  }

  // Start with a pass-through response — we'll write cookies onto it.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        // Write to the request so downstream middleware sees them.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        // Rebuild the response with the mutated request, then stamp cookies.
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Calling getUser() triggers a token refresh when the access token is
  // expired but a valid refresh token exists. We only call it when an
  // auth cookie actually exists — otherwise @supabase/ssr 0.5.2 internally
  // logs `AuthApiError: Refresh Token Not Found` on every anonymous
  // request (home page, marketing, /sign-in itself), polluting Netlify
  // function logs. The cookie name is `sb-<project-ref>-auth-token`, and
  // when the JWT exceeds ~4 KB it is chunked into `.0`, `.1`, …
  if (hasSupabaseAuthCookie(request)) {
    const { error } = await supabase.auth.getUser();
    // Stale session cookies (signed out elsewhere, expired refresh token) trigger
    // noisy SDK errors on every request until cleared.
    if (error && isStaleRefreshTokenError(error)) {
      await supabase.auth.signOut();
    }
  }

  return response;
}

/**
 * True if any cookie on the request looks like a Supabase auth-token
 * cookie set by @supabase/ssr — including the chunked variants used
 * when the session JWT is larger than the per-cookie size limit.
 *
 * Exported for reuse by RSC helpers in `lib/supabase/server.ts`.
 */
export function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) =>
    /^sb-.+-auth-token(\.\d+)?$/.test(c.name),
  );
}
