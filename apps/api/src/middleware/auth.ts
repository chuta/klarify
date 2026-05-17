import { createMiddleware } from 'hono/factory';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface AuthVars {
  userId: string;
  email: string;
}

// Supabase now signs JWTs with ES256 (asymmetric ECDSA), not HS256.
// Verify using the project's public JWKS endpoint — jose caches the keys automatically.
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function getJWKS(): ReturnType<typeof createRemoteJWKSet> {
  if (jwks) return jwks;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_URL is not set.');
  }
  jwks = createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
  return jwks;
}

/**
 * Verify the Supabase-issued JWT on the `Authorization: Bearer <token>` header.
 * Supabase uses ES256 (asymmetric) — keys are fetched from the project JWKS endpoint.
 * On success, stores `userId` and `email` on the context for downstream handlers.
 */
export const requireAuth = createMiddleware<{ Variables: AuthVars }>(async (c, next) => {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    return c.json(
      { success: false, error: 'Authentication required.', code: 'UNAUTHENTICATED' } as const,
      401,
    );
  }
  const token = header.slice('Bearer '.length).trim();

  try {
    const { payload } = await jwtVerify(token, getJWKS(), {
      audience: 'authenticated',
    });
    if (typeof payload.sub !== 'string') {
      throw new Error('Missing sub claim');
    }
    c.set('userId', payload.sub);
    c.set('email', typeof payload.email === 'string' ? payload.email : '');
    await next();
    return;
  } catch (err) {
    const e = err as Error;
    console.error(`[auth] jwtVerify failed — ${e.constructor?.name}: ${e.message}`);
    return c.json(
      { success: false, error: 'Invalid or expired session.', code: 'UNAUTHENTICATED' } as const,
      401,
    );
  }
});
