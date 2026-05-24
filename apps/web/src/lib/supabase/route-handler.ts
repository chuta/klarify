import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Supabase client for Route Handlers that must write session cookies onto a
 * redirect response (e.g. /auth/callback). Using cookies() alone can drop
 * Set-Cookie headers on NextResponse.redirect in serverless runtimes.
 */
export function createSupabaseRouteHandlerClient(request: NextRequest): {
  supabase: ReturnType<typeof createServerClient>;
  applyCookiesTo: (response: NextResponse) => NextResponse;
} {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are required.',
    );
  }

  let cookieCarrier = NextResponse.next({ request });

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        cookieCarrier = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          cookieCarrier.cookies.set(name, value, options);
        }
      },
    },
  });

  return {
    supabase,
    applyCookiesTo(response: NextResponse): NextResponse {
      for (const cookie of cookieCarrier.cookies.getAll()) {
        response.cookies.set(cookie);
      }
      return response;
    },
  };
}
