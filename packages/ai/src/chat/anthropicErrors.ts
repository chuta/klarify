// =============================================================================
// Anthropic error classifier.
//
// Maps any error thrown by `@anthropic-ai/sdk` (or any caller forwarding a
// raw 4xx/5xx body from api.anthropic.com) onto a stable, UI-safe category
// + a plain-language message we can show the user.
//
// Why this exists
// ───────────────
// Anthropic returns several distinct failure modes (billing, capacity, rate
// limit, auth, malformed request, network) that all bubble up to our chat /
// classify routes as a single `catch (err)` block. Without this classifier
// every failure renders as the same generic banner — making it impossible
// for a user to tell whether to retry now, retry later, or contact support.
//
// CRITICAL — privacy guarantee
// ─────────────────────────────
// User-facing copy NEVER references Anthropic, billing, credits, models, or
// API quotas (Klarify positions itself as the regulatory advisor; the
// underlying inference provider is an implementation detail). Internal
// `category` strings + the verbatim Anthropic payload are preserved for
// server logs and ops dashboards.
//
// Usage
// ─────
//   const { category, message, httpStatus } = classifyAnthropicError(err);
//   // log details to ops:
//   console.error('[ai/chat] %s', category, err);
//   // surface to user:
//   stream.writeSSE({ event: 'error', data: { code: category, message } });
// =============================================================================

/** Stable, UI-safe error categories. */
export type AnthropicErrorCategory =
  | 'service_unavailable' // billing/credit exhausted, auth misconfig — operator fix
  | 'overloaded' //           Anthropic capacity issue — retry in ~30s
  | 'rate_limited' //         per-org or per-key throttling — retry in seconds
  | 'invalid_request' //      our prompt/payload is malformed (model id, max_tokens, etc.)
  | 'unknown'; //             anything we couldn't classify

/** Result returned by classifyAnthropicError. */
export interface ClassifiedAnthropicError {
  /** Stable category for routing UI behaviour, metrics, and alerts. */
  category: AnthropicErrorCategory;
  /** Plain-language message safe to render to the end user. */
  message: string;
  /** HTTP status the API route should return (for non-streaming endpoints). */
  httpStatus: 429 | 503 | 502 | 500;
  /** Internal diagnostic — Anthropic's own error.type string when we found it. */
  upstreamType: string | null;
  /** Internal diagnostic — Anthropic's HTTP status when we found it. */
  upstreamStatus: number | null;
}

/**
 * User-facing copy for each category. The tone is calm + actionable: tell
 * the user what they can do, never expose the underlying provider.
 */
const FRIENDLY_MESSAGES: Record<AnthropicErrorCategory, string> = {
  service_unavailable:
    'AI service is temporarily unavailable. Please try again shortly — if it persists, contact support@klarify.africa.',
  overloaded:
    'Klarify is experiencing high demand right now. Please retry in a moment.',
  rate_limited:
    'You are sending requests faster than the AI service allows. Please wait a few seconds and try again.',
  invalid_request:
    'Klarify could not process that request. Please rephrase your message or simplify it and try again.',
  unknown:
    'Klarify ran into a problem generating that response. Please try again in a moment.',
};

/**
 * HTTP status mapping for the JSON-response (non-streaming) endpoints.
 * Streaming endpoints (chat) always reply 200 with an SSE error frame —
 * they never use this field.
 */
const HTTP_STATUS_BY_CATEGORY: Record<AnthropicErrorCategory, 429 | 503 | 502 | 500> = {
  service_unavailable: 503,
  overloaded: 503,
  rate_limited: 429,
  invalid_request: 502,
  unknown: 500,
};

/**
 * Classify an arbitrary thrown value (Error, plain object, string, anything)
 * into one of our stable categories.
 *
 * Inspection order:
 *   1. `@anthropic-ai/sdk` v0.27+ `APIError` shape:
 *      { status: number, error: { type: 'error', error: { type, message } } }
 *   2. Bare body shape returned by some retry wrappers:
 *      { type: 'error', error: { type, message } }
 *   3. String / Error message containing a JSON payload (logged form):
 *      "400 {\"type\":\"error\",\"error\":{\"type\":\"...\",\"message\":\"...\"}}"
 *   4. Naive substring match on the error message as a last resort.
 */
export function classifyAnthropicError(input: unknown): ClassifiedAnthropicError {
  const { upstreamType, upstreamStatus } = extractUpstreamSignals(input);

  const category = pickCategory(upstreamType, upstreamStatus);

  return {
    category,
    message: FRIENDLY_MESSAGES[category],
    httpStatus: HTTP_STATUS_BY_CATEGORY[category],
    upstreamType,
    upstreamStatus,
  };
}

/**
 * Pull Anthropic's error.type + HTTP status from whichever shape we have.
 * Exposed for tests; not part of the public API.
 *
 * Anthropic occasionally returns a misleading `error.type`. The clearest
 * example: a depleted credit balance is delivered as `invalid_request_error`
 * with the actual cause buried in `error.message`. To prevent that from
 * being shown to users as "rephrase your request", we ALSO inspect the
 * upstream message and let a strong keyword match override the raw type.
 */
export function extractUpstreamSignals(input: unknown): {
  upstreamType: string | null;
  upstreamStatus: number | null;
} {
  if (input == null) return { upstreamType: null, upstreamStatus: null };

  // (1) + (2) — direct object access.
  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const status = numericStatus(obj['status']);
    const structured = readStructuredAnthropicBody(obj);
    if (structured.upstreamType) {
      return overrideTypeFromMessage(structured.upstreamType, structured.upstreamMessage, status);
    }

    // (3) — Error.message that embeds the JSON body.
    const m = obj['message'];
    if (typeof m === 'string') {
      const fromMessage = parseEmbeddedAnthropicJson(m);
      if (fromMessage.upstreamType) {
        return overrideTypeFromMessage(
          fromMessage.upstreamType,
          fromMessage.upstreamMessage,
          status ?? fromMessage.upstreamStatus,
        );
      }
      // (4) — substring fallback.
      const fromKeyword = inferTypeFromKeywords(m);
      if (fromKeyword) {
        return { upstreamType: fromKeyword, upstreamStatus: status };
      }
    }

    if (status !== null) return { upstreamType: null, upstreamStatus: status };
  }

  if (typeof input === 'string') {
    const fromMessage = parseEmbeddedAnthropicJson(input);
    if (fromMessage.upstreamType) {
      return overrideTypeFromMessage(
        fromMessage.upstreamType,
        fromMessage.upstreamMessage,
        fromMessage.upstreamStatus,
      );
    }
    const fromKeyword = inferTypeFromKeywords(input);
    if (fromKeyword) {
      return { upstreamType: fromKeyword, upstreamStatus: null };
    }
  }

  return { upstreamType: null, upstreamStatus: null };
}

/**
 * Pull `error.type` and `error.message` out of the structured shapes we
 * recognise. Returns nulls when none of the shapes match.
 */
function readStructuredAnthropicBody(obj: Record<string, unknown>): {
  upstreamType: string | null;
  upstreamMessage: string | null;
} {
  // SDK shape: obj.error = { type: 'error', error: { type, message } }
  const sdkErr = obj['error'];
  if (sdkErr && typeof sdkErr === 'object') {
    const inner = (sdkErr as Record<string, unknown>)['error'];
    if (inner && typeof inner === 'object') {
      const innerObj = inner as Record<string, unknown>;
      const t = innerObj['type'];
      if (typeof t === 'string') {
        const m = innerObj['message'];
        return {
          upstreamType: t,
          upstreamMessage: typeof m === 'string' ? m : null,
        };
      }
    }
    // Bare-ish: { type: 'error', error: { type, message } } at obj.error
    const t = (sdkErr as Record<string, unknown>)['type'];
    if (typeof t === 'string' && t !== 'error') {
      const m = (sdkErr as Record<string, unknown>)['message'];
      return {
        upstreamType: t,
        upstreamMessage: typeof m === 'string' ? m : null,
      };
    }
  }

  // Bare shape: { type: 'error', error: { type, message } }
  if (obj['type'] === 'error') {
    const inner = obj['error'];
    if (inner && typeof inner === 'object') {
      const innerObj = inner as Record<string, unknown>;
      const t = innerObj['type'];
      if (typeof t === 'string') {
        const m = innerObj['message'];
        return {
          upstreamType: t,
          upstreamMessage: typeof m === 'string' ? m : null,
        };
      }
    }
  }

  return { upstreamType: null, upstreamMessage: null };
}

/**
 * If the upstream message contains a strong category keyword, prefer that
 * keyword over the raw `error.type`. This is how we route Anthropic's
 * common "invalid_request_error + credit balance is too low" case to the
 * billing bucket instead of the rephrase bucket.
 */
function overrideTypeFromMessage(
  rawType: string,
  message: string | null,
  status: number | null,
): { upstreamType: string; upstreamStatus: number | null } {
  if (!message) return { upstreamType: rawType, upstreamStatus: status };
  const keyword = inferTypeFromKeywords(message);
  if (keyword && keyword !== rawType) {
    return { upstreamType: keyword, upstreamStatus: status };
  }
  return { upstreamType: rawType, upstreamStatus: status };
}

function numericStatus(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Extract Anthropic's JSON error body if it's been concatenated into an
 * Error.message (the SDK does this for thrown APIError instances).
 *
 *   "400 {\"type\":\"error\",\"error\":{\"type\":\"invalid_request_error\",\"message\":\"...\"}}"
 */
function parseEmbeddedAnthropicJson(text: string): {
  upstreamType: string | null;
  upstreamStatus: number | null;
  upstreamMessage: string | null;
} {
  // Leading "NNN " (HTTP status the SDK prepends).
  const statusMatch = text.match(/^\s*(\d{3})\s+/);
  const upstreamStatus = statusMatch ? Number.parseInt(statusMatch[1]!, 10) : null;

  const firstBrace = text.indexOf('{');
  if (firstBrace < 0) {
    return { upstreamType: null, upstreamStatus, upstreamMessage: null };
  }
  const candidate = text.slice(firstBrace);
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (parsed && typeof parsed === 'object') {
      const inner = (parsed as Record<string, unknown>)['error'];
      if (inner && typeof inner === 'object') {
        const innerObj = inner as Record<string, unknown>;
        const t = innerObj['type'];
        const m = innerObj['message'];
        if (typeof t === 'string') {
          return {
            upstreamType: t,
            upstreamStatus,
            upstreamMessage: typeof m === 'string' ? m : null,
          };
        }
      }
    }
  } catch {
    // Not valid JSON — fall through to keyword inference upstream.
  }
  return { upstreamType: null, upstreamStatus, upstreamMessage: null };
}

/**
 * Last-resort: scan the raw text for Anthropic's well-known error-type
 * substrings. Only used when neither structured nor JSON-embedded parsing
 * succeeded.
 */
function inferTypeFromKeywords(text: string): string | null {
  const t = text.toLowerCase();
  if (t.includes('credit balance is too low') || t.includes('credit_balance_too_low')) {
    return 'credit_balance_too_low';
  }
  if (t.includes('overloaded')) return 'overloaded_error';
  if (t.includes('rate limit') || t.includes('rate_limit')) return 'rate_limit_error';
  if (t.includes('authentication') || t.includes('invalid api key')) {
    return 'authentication_error';
  }
  return null;
}

/**
 * Pure mapping from (upstream type, status) → category.
 * Encodes Anthropic's documented error.type values plus an HTTP-status
 * fallback for cases where only the status is known.
 */
function pickCategory(
  upstreamType: string | null,
  upstreamStatus: number | null,
): AnthropicErrorCategory {
  switch (upstreamType) {
    case 'credit_balance_too_low':
    case 'authentication_error':
    case 'permission_error':
      return 'service_unavailable';
    case 'overloaded_error':
    case 'api_error': // generic 500 from Anthropic — treat as transient
      return 'overloaded';
    case 'rate_limit_error':
      return 'rate_limited';
    case 'invalid_request_error':
    case 'not_found_error': // model id wrong, etc. — config issue but caller can't fix
      return 'invalid_request';
  }

  if (upstreamStatus !== null) {
    if (upstreamStatus === 401 || upstreamStatus === 403) return 'service_unavailable';
    if (upstreamStatus === 429) return 'rate_limited';
    if (upstreamStatus === 529) return 'overloaded';
    if (upstreamStatus >= 500) return 'overloaded';
    if (upstreamStatus === 400 || upstreamStatus === 404) return 'invalid_request';
  }

  return 'unknown';
}
