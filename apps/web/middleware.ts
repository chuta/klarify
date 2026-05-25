import { type NextRequest, NextResponse } from 'next/server';
import { isNetlifyDeployHost } from '@/lib/env';
import { updateSession } from '@/lib/supabase/middleware';

const CANONICAL_HOST = 'klarify.africa';

/**
 * Root Next.js middleware — runs on every matched request.
 * Delegates entirely to updateSession() which refreshes the Supabase
 * auth tokens and stamps fresh cookies on the response.
 *
 * Protected routes are enforced in the individual layouts / RSCs via
 * createClient().auth.getUser() — middleware only handles token refresh.
 */
export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';

  // Auth email links and bookmarks should never stay on the Netlify default URL.
  if (process.env.NODE_ENV === 'production' && isNetlifyDeployHost(host)) {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';
    url.host = CANONICAL_HOST;
    return NextResponse.redirect(url, 308);
  }

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
