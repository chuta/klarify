// =============================================================================
// SSE stream parser for the FounderCounsel chat endpoint.
//
// The /api/ai/chat endpoint emits Server-Sent Events of three types
// (matches apps/api/src/routes/ai/chat.ts):
//
//   event: chunk   → { type: "chunk", content: "..." }
//   event: done    → { type: "done", conversationId, messageId, citations, ... }
//   event: error   → { type: "error", code, message }
//
// This file is pure — no React, no DOM globals. Both the web hook
// (useKlarifyChat) and any future Node-side replay tool import from here.
// =============================================================================
import type { Citation } from './citations.js';

export type StreamEvent =
  | { type: 'chunk'; content: string }
  | {
      type: 'done';
      conversationId: string;
      messageId: string;
      citations: Citation[];
      queriesUsed: number;
      queriesLimit: number | null;
      plan: string;
      chunksUsed: number;
    }
  | { type: 'error'; code: string; message: string };

/**
 * Stream a chat response from POST /api/ai/chat and invoke `onEvent` for each
 * parsed SSE frame. Returns the full assembled assistant text on completion.
 *
 * Throws (rejecting the promise) on network errors or HTTP non-2xx — the
 * caller's UI is responsible for surfacing those. The 'error' SSE event
 * (Claude-side failure) is delivered via onEvent and does NOT reject; the
 * promise resolves with whatever text accumulated before the error.
 *
 * @param request.url           full URL of the chat endpoint (incl. origin if cross-origin)
 * @param request.message       user's question
 * @param request.conversationId resume an existing conversation
 * @param request.authToken     Bearer token for Authorization header
 * @param request.signal        AbortSignal — call .abort() to cancel mid-stream
 * @param onEvent               invoked synchronously for every parsed event
 */
export async function streamChat(
  request: {
    url: string;
    message: string;
    conversationId?: string | null;
    jurisdictions?: string[];
    authToken: string;
    signal?: AbortSignal;
  },
  onEvent: (event: StreamEvent) => void,
): Promise<string> {
  const response = await fetch(request.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.authToken}`,
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      message: request.message,
      conversationId: request.conversationId ?? null,
      ...(request.jurisdictions ? { jurisdictions: request.jurisdictions } : {}),
    }),
    signal: request.signal,
  });

  if (!response.ok) {
    // Try to surface the server's JSON error envelope, fall back to status.
    let detail = `${response.status} ${response.statusText}`;
    try {
      // Cast to a permissive record — the Klarify API envelope is well-known
      // ({ success, error, code, details }) but Response.json() is typed as
      // `Promise<any>` in DOM lib and `Promise<unknown>` under stricter Node
      // type packs. The cast normalises both.
      const body = (await response.json()) as
        | { error?: string; code?: string; details?: unknown }
        | undefined;
      if (body?.error) detail = body.error;
      if (body?.code === 'QUERY_LIMIT_REACHED') {
        const e = new Error(detail) as Error & {
          code?: string;
          details?: unknown;
        };
        e.code = 'QUERY_LIMIT_REACHED';
        e.details = body.details;
        throw e;
      }
    } catch {
      // body wasn't JSON or read failed — keep status detail
    }
    throw new Error(`Chat request failed: ${detail}`);
  }

  if (!response.body) {
    throw new Error('Chat response had no body.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';

  // SSE frames are separated by a blank line ("\n\n"). Each frame can contain
  // multiple "event:" / "data:" lines. We parse on every flush so the UI sees
  // chunks the moment they arrive, not when the connection closes.
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let frameEnd = buffer.indexOf('\n\n');
    while (frameEnd !== -1) {
      const rawFrame = buffer.slice(0, frameEnd);
      buffer = buffer.slice(frameEnd + 2);
      const parsed = parseFrame(rawFrame);
      if (parsed) {
        if (parsed.type === 'chunk') fullText += parsed.content;
        onEvent(parsed);
      }
      frameEnd = buffer.indexOf('\n\n');
    }
  }

  // Process any trailing frame the server forgot to close with \n\n.
  if (buffer.trim().length > 0) {
    const parsed = parseFrame(buffer);
    if (parsed) {
      if (parsed.type === 'chunk') fullText += parsed.content;
      onEvent(parsed);
    }
  }

  return fullText;
}

/**
 * Parse a single SSE frame into a StreamEvent.
 *
 * Exported for unit testing. Returns null for frames we don't recognise
 * (comments, keep-alive pings) so the caller can skip them silently.
 */
export function parseFrame(rawFrame: string): StreamEvent | null {
  const lines = rawFrame.split('\n');
  let eventName: string | null = null;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(':')) continue; // SSE comment — keep-alive
    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim());
    }
  }

  if (dataLines.length === 0) return null;
  const dataJson = dataLines.join('\n');

  let parsed: unknown;
  try {
    parsed = JSON.parse(dataJson);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const obj = parsed as Record<string, unknown>;

  // Prefer the named SSE event when present, fall back to the `type` field in
  // the JSON payload (defensive — some proxies strip event: lines).
  const kind = eventName ?? obj.type;
  if (kind === 'chunk') {
    return { type: 'chunk', content: String(obj.content ?? '') };
  }
  if (kind === 'done') {
    return {
      type: 'done',
      conversationId: String(obj.conversationId ?? ''),
      messageId: String(obj.messageId ?? ''),
      citations: Array.isArray(obj.citations) ? (obj.citations as Citation[]) : [],
      queriesUsed: Number(obj.queriesUsed ?? 0),
      queriesLimit:
        obj.queriesLimit === null || obj.queriesLimit === undefined
          ? null
          : Number(obj.queriesLimit),
      plan: String(obj.plan ?? 'free'),
      chunksUsed: Number(obj.chunksUsed ?? 0),
    };
  }
  if (kind === 'error') {
    return {
      type: 'error',
      code: String(obj.code ?? 'UNKNOWN'),
      message: String(obj.message ?? 'Unknown error'),
    };
  }
  return null;
}
