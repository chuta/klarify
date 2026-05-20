import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { User } from '@supabase/supabase-js';

/**
 * True if any cookie in the current request looks like a Supabase
 * auth-token cookie set by @supabase/ssr — including chunked variants
 * (`sb-<ref>-auth-token.0`, `.1`, …) used when the session JWT is too
 * large for a single cookie.
 *
 * Calling `auth.getUser()` server-side when no auth cookie exists
 * triggers a `Refresh Token Not Found` error that @supabase/ssr 0.5.2
 * logs internally via console.error — polluting Netlify function logs
 * on every anonymous visit to a public page.
 */
function hasSupabaseAuthCookie(): boolean {
  return cookies()
    .getAll()
    .some((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name));
}

/**
 * Server-side Supabase client for Next 14 App Router (RSCs, Route Handlers,
 * Server Actions). Reads/writes the session cookies set by @supabase/ssr.
 */
export function createClient(): ReturnType<typeof createServerClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are required.',
    );
  }

  const cookieStore = cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — middleware will refresh next request.
        }
      },
    },
  });
}

/**
 * Returns the current authenticated user, or `null` if no auth cookie is
 * present. Unlike `createClient().auth.getUser()`, this never triggers
 * the `Refresh Token Not Found` SDK log on anonymous traffic.
 *
 * Use this in public-facing RSCs (marketing pages, sign-in, sign-up,
 * pricing) where you just want to know "is this visitor signed in?"
 * to decide whether to redirect to /dashboard or show the public copy.
 *
 * Do NOT use this in protected routes — there, `getUser()` directly is
 * correct because the absence of a session means "deny", not "render
 * anonymously". Dashboard layouts and gated server actions should keep
 * calling `auth.getUser()` straight.
 */
export async function getOptionalUser(): Promise<User | null> {
  if (!hasSupabaseAuthCookie()) return null;
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  // The cookie-presence check above eliminates the common no-session
  // case. If we still get an error here, the cookie was stale / forged
  // / revoked — treat as unauthenticated but log for visibility.
  if (error) {
    console.warn('[supabase/getOptionalUser] auth check failed:', error.message);
    return null;
  }
  return data.user ?? null;
}
