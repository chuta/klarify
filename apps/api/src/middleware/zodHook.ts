/**
 * Consistent JSON envelope for @hono/zod-validator failures.
 *
 * The library default is `c.json(result, 400)` — a raw Zod safeParse result
 * whose `error` field is an object. Clients that do `new Error(body.error)`
 * render "[object Object]". This hook maps validation issues to plain English.
 */
import type { Hook } from '@hono/zod-validator';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const klarifyZodHook: Hook<any, any, any, any> = (result, c) => {
  if (result.success) return;

  const issues = result.error.issues;
  const first = issues[0];
  const message = first
    ? first.path.length > 0
      ? `${first.path.join('.')}: ${first.message}`
      : first.message
    : 'Invalid request.';

  console.warn('[validation] request rejected:', message);

  return c.json(
    {
      success: false as const,
      error: message,
      code: 'VALIDATION_ERROR',
    },
    400,
  );
};
