import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Root Next.js middleware — runs on every matched request.
 * Delegates entirely to updateSession() which refreshes the Supabase
 * auth tokens and stamps fresh cookies on the response.
 *
 * Protected routes are enforced in the individual layouts / RSCs via
 * createClient().auth.getUser() — middleware only handles token refresh.
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match every path EXCEPT:
     *   - _next/static  (Next.js build assets)
     *   - _next/image   (image optimisation API)
     *   - favicon.ico, sitemap.xml, robots.txt
     *   - *.svg *.png *.jpg *.jpeg *.gif *.webp (static images)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
