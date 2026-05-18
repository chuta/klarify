import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars missing');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface AuthContext {
  userId: string;
  email: string;
}

/**
 * Verify `Authorization: Bearer <token>` in a Next.js Route Handler request.
 * Uses the Supabase service role client to validate the JWT server-to-server
 * (no round-trip browser auth needed).
 *
 * Returns null when invalid — callers should return a 401 response.
 */
export async function authenticateRouteHandler(
  request: Request,
): Promise<AuthContext | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();

  try {
    const supabase = createAdminClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return { userId: user.id, email: user.email ?? '' };
  } catch {
    return null;
  }
}

/** Pre-built 401 response for unauthenticated requests. */
export function unauthenticated(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Authentication required.', code: 'UNAUTHENTICATED' },
    { status: 401 },
  );
}
