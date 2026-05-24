/** Supabase auth errors that mean the browser cookie is stale — safe to sign out silently. */
export function isStaleRefreshTokenError(error: {
  code?: string;
  message?: string;
}): boolean {
  const code = error.code ?? '';
  const message = error.message ?? '';
  return (
    code === 'refresh_token_not_found'
    || message.includes('Refresh Token Not Found')
    || message.includes('Invalid Refresh Token')
  );
}

/** PKCE exchange failed because the code verifier cookie was never stored or was cleared. */
export function isPkceVerifierError(error: { message?: string }): boolean {
  return (error.message ?? '').includes('PKCE code verifier not found');
}
