/**
 * Thin fetch wrapper for calls from the Next.js web app to the Hono API.
 *
 * All API calls from Server Components, Server Actions, and Route Handlers
 * should go through this helper so auth headers are consistently applied.
 *
 * NEVER call this from Client Components — use a Server Action as the
 * intermediary so the access token never reaches the browser.
 */

import type { ApiSuccess, ApiError } from '@klarify/core';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export type ApiResult<T> = ApiSuccess<T> | ApiError;

export async function apiFetch<T>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers as Record<string, string> | undefined),
      },
      // Server-side RSC fetches should not be cached — compliance data must
      // always be fresh (CLAUDE.md §16 Rule 6).
      cache: 'no-store',
    });
  } catch (networkErr) {
    console.error(`[apiFetch] network error for ${path}:`, networkErr);
    return { success: false, error: 'API unreachable', code: 'NETWORK_ERROR' };
  }

  // Guard against non-JSON responses (e.g. Hono 404 plain-text "404 Not Found").
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    console.error(`[apiFetch] non-JSON response from ${path} (${res.status})`);
    return {
      success: false,
      error: `Unexpected response from API (${res.status})`,
      code: 'NON_JSON_RESPONSE',
    };
  }

  try {
    const body = (await res.json()) as ApiResult<T>;
    return body;
  } catch (parseErr) {
    console.error(`[apiFetch] JSON parse error for ${path}:`, parseErr);
    return { success: false, error: 'Failed to parse API response', code: 'PARSE_ERROR' };
  }
}

/** Convenience: throw if response is not success. */
export async function apiFetchOrThrow<T>(
  path: string,
  accessToken: string,
  options?: RequestInit,
): Promise<T> {
  const result = await apiFetch<T>(path, accessToken, options);
  if (!result.success) {
    throw new Error(result.error ?? `API error at ${path}`);
  }
  return result.data;
}
