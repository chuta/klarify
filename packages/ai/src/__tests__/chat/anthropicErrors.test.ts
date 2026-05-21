// =============================================================================
// Tests for the Anthropic error classifier.
//
// Three buckets the user explicitly asked us to differentiate:
//   * service_unavailable   (credit_balance_too_low, authentication_error)
//   * overloaded            (overloaded_error, 5xx)
//   * rate_limited          (rate_limit_error, 429)
//
// Plus two safety buckets:
//   * invalid_request       (400, not_found_error — bad model id, bad body)
//   * unknown               (anything we couldn't classify — generic fallback)
//
// Every test exercises ONE shape Anthropic returns in practice:
//   (1) `@anthropic-ai/sdk` thrown APIError → structured object
//   (2) Bare JSON body forwarded by a retry wrapper
//   (3) Concatenated-into-Error.message form ("400 {...}")
//   (4) Keyword fallback when JSON is unparseable
// =============================================================================
import { describe, expect, it } from 'vitest';
import {
  classifyAnthropicError,
  extractUpstreamSignals,
} from '../../chat/anthropicErrors.js';

// Real payload we observed in Fly logs at 22:55:58 UTC on 2026-05-20.
const REAL_CREDIT_PAYLOAD = {
  type: 'error',
  error: {
    type: 'invalid_request_error',
    message:
      'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.',
  },
  request_id: 'req_011CbEeRAfwQS95XG8KnqMjo',
};

// Real payload we observed in Fly logs at 22:48:49 UTC on 2026-05-20.
const REAL_MODEL_404_PAYLOAD = {
  type: 'error',
  error: {
    type: 'not_found_error',
    message: 'model: claude-sonnet-4-5 ',
  },
  request_id: 'req_011CbEdsVaqJ2n873ThZqyUv',
};

describe('classifyAnthropicError — service_unavailable bucket', () => {
  it('classifies credit_balance_too_low (Anthropic uses invalid_request_error.type + this exact string)', () => {
    // The real Anthropic shape: type=invalid_request_error, but message
    // contains "credit balance is too low" — we use the keyword fallback
    // on the message because invalid_request_error itself maps to
    // "invalid_request" by default.
    // Actually — the real payload from logs has type=invalid_request_error
    // and the upstream parser will set upstreamType=invalid_request_error,
    // which routes to invalid_request. To route to service_unavailable
    // we ALSO need to honour the message keyword. Verify both code paths.
    const sdkError = {
      status: 400,
      error: { type: 'error', error: { type: 'credit_balance_too_low' } },
    };
    const result = classifyAnthropicError(sdkError);
    expect(result.category).toBe('service_unavailable');
    expect(result.upstreamType).toBe('credit_balance_too_low');
    expect(result.upstreamStatus).toBe(400);
    expect(result.httpStatus).toBe(503);
    expect(result.message).toMatch(/temporarily unavailable/i);
  });

  it('classifies authentication_error → service_unavailable (admin-side issue, never expose key detail)', () => {
    const sdkError = {
      status: 401,
      error: { type: 'error', error: { type: 'authentication_error' } },
    };
    const result = classifyAnthropicError(sdkError);
    expect(result.category).toBe('service_unavailable');
    expect(result.httpStatus).toBe(503);
    // CRITICAL — never leak "API key", "Anthropic", "credit", "billing".
    expect(result.message).not.toMatch(/api key|anthropic|credit|billing/i);
  });

  it('falls back to service_unavailable on raw 401 with no body', () => {
    const result = classifyAnthropicError({ status: 401 });
    expect(result.category).toBe('service_unavailable');
  });

  it('falls back to service_unavailable on raw 403', () => {
    const result = classifyAnthropicError({ status: 403 });
    expect(result.category).toBe('service_unavailable');
  });

  it('classifies the real concatenated credit_balance Error.message via keyword fallback', () => {
    // Real shape from Fly: SDK throws Error with .message = "400 {...credit balance is too low...}"
    // The JSON has type=invalid_request_error, but the message tells us
    // it's actually a billing issue. We need the keyword fallback to
    // route to service_unavailable in this case rather than invalid_request.
    const sdkError = new Error(`400 ${JSON.stringify(REAL_CREDIT_PAYLOAD)}`);
    const result = classifyAnthropicError(sdkError);
    // upstreamType comes from the JSON (invalid_request_error) → would
    // map to invalid_request. But our friendly message must reflect the
    // user-actionable nuance. Verify: at minimum, the message must NOT
    // tell the user to "rephrase your message" — that's misleading
    // when the real issue is operator billing.
    // We accept either invalid_request or service_unavailable here, BUT
    // the user-facing copy must never say "rephrase" when it's a credit
    // balance issue. To enforce this, the implementation can either:
    //   (a) Prefer the keyword bucket over the JSON-type bucket when both
    //       are present, OR
    //   (b) Keep the JSON bucket but ensure neither copy is misleading.
    // We assert the contract here, not the path:
    if (result.category === 'invalid_request') {
      // Acceptable IF the copy doesn't blame the user — but actually no,
      // the user CAN'T fix a billing issue by rephrasing. Fail the test
      // to force the impl to prefer keyword inference.
      expect.fail(
        'credit_balance_too_low in Error.message must route to service_unavailable, not invalid_request',
      );
    }
    expect(result.category).toBe('service_unavailable');
    expect(result.message).not.toMatch(/rephrase|simplify/i);
  });
});

describe('classifyAnthropicError — overloaded bucket', () => {
  it('classifies overloaded_error', () => {
    const sdkError = {
      status: 529,
      error: { type: 'error', error: { type: 'overloaded_error' } },
    };
    const result = classifyAnthropicError(sdkError);
    expect(result.category).toBe('overloaded');
    expect(result.httpStatus).toBe(503);
    expect(result.message).toMatch(/high demand/i);
    expect(result.message).toMatch(/retry/i);
  });

  it('classifies api_error (generic 500 from Anthropic) → overloaded', () => {
    const sdkError = {
      status: 500,
      error: { type: 'error', error: { type: 'api_error' } },
    };
    const result = classifyAnthropicError(sdkError);
    expect(result.category).toBe('overloaded');
  });

  it('falls back to overloaded on raw 502/503/504 (any upstream 5xx)', () => {
    expect(classifyAnthropicError({ status: 502 }).category).toBe('overloaded');
    expect(classifyAnthropicError({ status: 503 }).category).toBe('overloaded');
    expect(classifyAnthropicError({ status: 504 }).category).toBe('overloaded');
    expect(classifyAnthropicError({ status: 529 }).category).toBe('overloaded');
  });
});

describe('classifyAnthropicError — rate_limited bucket', () => {
  it('classifies rate_limit_error', () => {
    const sdkError = {
      status: 429,
      error: { type: 'error', error: { type: 'rate_limit_error' } },
    };
    const result = classifyAnthropicError(sdkError);
    expect(result.category).toBe('rate_limited');
    expect(result.httpStatus).toBe(429);
    expect(result.message).toMatch(/wait/i);
  });

  it('falls back to rate_limited on raw 429', () => {
    const result = classifyAnthropicError({ status: 429 });
    expect(result.category).toBe('rate_limited');
    expect(result.httpStatus).toBe(429);
  });

  it('detects rate limit from keyword in Error.message', () => {
    const err = new Error('429 Too Many Requests — rate limit exceeded');
    const result = classifyAnthropicError(err);
    expect(result.category).toBe('rate_limited');
  });
});

describe('classifyAnthropicError — invalid_request bucket', () => {
  it('classifies the real not_found_error (model id wrong) we saw in Sprint-2 logs', () => {
    const sdkError = new Error(`404 ${JSON.stringify(REAL_MODEL_404_PAYLOAD)}`);
    const result = classifyAnthropicError(sdkError);
    expect(result.category).toBe('invalid_request');
    expect(result.upstreamType).toBe('not_found_error');
    expect(result.upstreamStatus).toBe(404);
    expect(result.httpStatus).toBe(502);
  });

  it('classifies invalid_request_error WITHOUT credit-balance keyword', () => {
    const sdkError = {
      status: 400,
      error: {
        type: 'error',
        error: {
          type: 'invalid_request_error',
          message: 'max_tokens exceeds the model context window.',
        },
      },
    };
    const result = classifyAnthropicError(sdkError);
    expect(result.category).toBe('invalid_request');
  });

  it('falls back to invalid_request on raw 400', () => {
    expect(classifyAnthropicError({ status: 400 }).category).toBe('invalid_request');
  });
});

describe('classifyAnthropicError — unknown bucket', () => {
  it('returns unknown for null', () => {
    expect(classifyAnthropicError(null).category).toBe('unknown');
  });

  it('returns unknown for undefined', () => {
    expect(classifyAnthropicError(undefined).category).toBe('unknown');
  });

  it('returns unknown for an arbitrary string with no signals', () => {
    expect(classifyAnthropicError('something broke').category).toBe('unknown');
  });

  it('returns unknown for an Error with no recognisable signal', () => {
    expect(classifyAnthropicError(new Error('ECONNRESET')).category).toBe('unknown');
  });

  it('uses the generic message for unknown', () => {
    const result = classifyAnthropicError(new Error('???'));
    expect(result.message).toMatch(/try again in a moment/i);
  });
});

describe('classifyAnthropicError — privacy contract', () => {
  // CRITICAL — none of the friendly messages may leak provider implementation.
  // Klarify positions itself as the regulatory advisor; Anthropic is internal.
  const FORBIDDEN_TERMS = [
    /anthropic/i,
    /claude/i,
    /api key/i,
    /credit balance/i,
    /billing/i,
    /quota/i,
    /token/i, // "AI token" is fine to avoid even if not strictly leaky
  ];

  const SAMPLES: Array<[string, unknown]> = [
    ['credit_balance_too_low', { status: 400, error: { type: 'error', error: { type: 'credit_balance_too_low' } } }],
    ['authentication_error', { status: 401, error: { type: 'error', error: { type: 'authentication_error' } } }],
    ['overloaded_error', { status: 529, error: { type: 'error', error: { type: 'overloaded_error' } } }],
    ['rate_limit_error', { status: 429, error: { type: 'error', error: { type: 'rate_limit_error' } } }],
    ['not_found_error', { status: 404, error: { type: 'error', error: { type: 'not_found_error' } } }],
    ['unknown', new Error('???')],
  ];

  for (const [label, sample] of SAMPLES) {
    it(`message for ${label} contains no provider leak`, () => {
      const result = classifyAnthropicError(sample);
      for (const forbidden of FORBIDDEN_TERMS) {
        expect(result.message, `forbidden term ${forbidden} in: ${result.message}`)
          .not.toMatch(forbidden);
      }
    });
  }
});

describe('extractUpstreamSignals — defensive parsing', () => {
  it('handles SDK shape with nested .error.error.type', () => {
    const r = extractUpstreamSignals({
      status: 429,
      error: { type: 'error', error: { type: 'rate_limit_error' } },
    });
    expect(r).toEqual({ upstreamType: 'rate_limit_error', upstreamStatus: 429 });
  });

  it('handles bare body shape { type: error, error: { type } }', () => {
    const r = extractUpstreamSignals({
      type: 'error',
      error: { type: 'overloaded_error' },
    });
    expect(r.upstreamType).toBe('overloaded_error');
  });

  it('handles Error.message embedding "400 {json}"', () => {
    const r = extractUpstreamSignals(
      new Error('400 {"type":"error","error":{"type":"invalid_request_error"}}'),
    );
    expect(r.upstreamStatus).toBe(400);
    expect(r.upstreamType).toBe('invalid_request_error');
  });

  it('handles a raw JSON string body (no leading status)', () => {
    const r = extractUpstreamSignals(
      '{"type":"error","error":{"type":"overloaded_error"}}',
    );
    expect(r.upstreamType).toBe('overloaded_error');
  });

  it('returns nulls for completely opaque input', () => {
    expect(extractUpstreamSignals(42)).toEqual({
      upstreamType: null,
      upstreamStatus: null,
    });
  });
});
