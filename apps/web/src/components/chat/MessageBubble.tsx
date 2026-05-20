'use client';

import type { Citation } from '@klarify/ai/chat';
import { CitationBadge } from './CitationBadge';
import { TypingIndicator } from './TypingIndicator';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  streaming?: boolean;
  errored?: boolean;
}

/**
 * Inline citation renderer.
 *
 * Splits the assistant content on the citation regex so each `[Regulation,
 * Section]` becomes a CitationBadge. This is intentionally a flat render —
 * full markdown support comes in Sprint 4 (the chat handler currently asks
 * Claude for prose + citations, no headings or lists).
 *
 * Why client-side rendering of citations: the assistant text streams in
 * chunk-by-chunk, so we can't pre-extract on the server.
 */
function renderInline(content: string, citations: Citation[]): JSX.Element[] {
  const byRaw = new Map<string, Citation>();
  for (const c of citations) byRaw.set(c.raw, c);

  const parts: JSX.Element[] = [];
  const regex = /\[([A-Z][^,\]]{1,80}),\s*([A-Z0-9][^\]]{1,80})\]/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`t-${i}`}>{content.slice(lastIndex, match.index)}</span>,
      );
    }
    const regulation = match[1]!.trim();
    const section = match[2]!.trim();
    const raw = `${regulation}, ${section}`;
    const cite =
      byRaw.get(raw) ?? {
        raw,
        regulation,
        section,
        url: null,
      };
    parts.push(
      <CitationBadge key={`c-${i}`} citation={cite} />,
    );
    lastIndex = regex.lastIndex;
    i++;
  }
  if (lastIndex < content.length) {
    parts.push(<span key={`t-end`}>{content.slice(lastIndex)}</span>);
  }
  return parts;
}

export function MessageBubble({
  role,
  content,
  citations = [],
  streaming = false,
  errored = false,
}: Props): JSX.Element {
  const isUser = role === 'user';

  // User bubble — right-aligned, navy pill.
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[#0D2B45] px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  // Assistant — left-aligned card with teal left border.
  return (
    <div className="flex justify-start">
      <div
        className={[
          'max-w-[80%] rounded-2xl rounded-bl-sm border bg-white px-4 py-3 text-sm leading-relaxed text-[#1A1A1A] shadow-sm',
          errored
            ? 'border-[#C0392B] border-l-4'
            : 'border-[#E6F4F4] border-l-4 border-l-[#0B6E6E]',
        ].join(' ')}
      >
        {content.length === 0 && streaming ? (
          <TypingIndicator />
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {renderInline(content, citations).map((node, idx) => (
              <span key={idx}>{node}</span>
            ))}
            {streaming && (
              <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-[#0B6E6E] align-middle" />
            )}
          </div>
        )}
        {errored && (
          <p className="mt-2 text-xs text-[#C0392B]">
            Something went wrong generating this response. Try again.
          </p>
        )}
      </div>
    </div>
  );
}
