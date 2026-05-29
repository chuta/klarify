/**
 * Normalise API error payloads into user-facing plain English.
 *
 * Handles:
 *  - Klarify envelope `{ success: false, error: string }`
 *  - Raw @hono/zod-validator `{ success: false, error: { issues: [...] } }`
 *  - Generic `{ message: string }` fallbacks
 */
interface ZodIssueLike {
  message: string;
  path?: (string | number)[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function formatZodIssues(error: unknown): string | null {
  if (!isRecord(error)) return null;
  const issues = error.issues;
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const first = issues[0] as ZodIssueLike;
  if (!first?.message) return null;
  const path = first.path?.length ? `${first.path.join('.')}: ` : '';
  return `${path}${first.message}`;
}

export function formatApiError(
  body: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (!isRecord(body)) return fallback;

  const err = body.error;
  if (typeof err === 'string' && err.trim().length > 0) return err;

  const zodMessage = formatZodIssues(err);
  if (zodMessage) return zodMessage;

  if (typeof body.message === 'string' && body.message.trim().length > 0) {
    return body.message;
  }

  return fallback;
}
