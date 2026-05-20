'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  /** When set, the input is locked and the message replaces the textarea. */
  blockedMessage?: string | null;
}

const MAX_CHARS = 2000;
const MAX_LINES = 6;
const LINE_HEIGHT_PX = 22;

/**
 * Chat input with:
 *   * Auto-growing textarea (up to MAX_LINES, then scrolls)
 *   * Enter = send, Shift+Enter = newline
 *   * Character counter
 *   * Stop button (cancels in-flight stream)
 */
export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  blockedMessage = null,
}: Props): JSX.Element {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow textarea (capped at MAX_LINES).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    const next = Math.min(el.scrollHeight, MAX_LINES * LINE_HEIGHT_PX + 24);
    el.style.height = `${next}px`;
  }, [value]);

  function handleSend(): void {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setValue('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (blockedMessage) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
        <p className="text-sm text-amber-900">{blockedMessage}</p>
        <a
          href="/billing/upgrade"
          className="mt-2 inline-block rounded-lg bg-[#0B6E6E] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#0a5a5a]"
        >
          Upgrade →
        </a>
      </div>
    );
  }

  const charCount = value.length;
  const overLimit = charCount > MAX_CHARS;

  return (
    <div
      className={[
        'rounded-2xl border bg-white shadow-sm transition-colors',
        overLimit
          ? 'border-[#C0392B]'
          : 'border-[#CCCCCC] focus-within:border-[#0B6E6E]',
      ].join(' ')}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX_CHARS + 1))}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={disabled}
        placeholder="Ask Klarify about Nigerian or African digital asset regulation…"
        className="block w-full resize-none rounded-2xl bg-transparent px-4 pt-3 pb-2 text-sm leading-[22px] text-[#1A1A1A] placeholder:text-[#999] focus:outline-none disabled:opacity-50"
        style={{ maxHeight: `${MAX_LINES * LINE_HEIGHT_PX + 24}px` }}
      />
      <div className="flex items-center justify-between gap-2 border-t border-[#F5F5F5] px-3 py-2">
        <span
          className={
            overLimit
              ? 'text-xs text-[#C0392B]'
              : charCount > MAX_CHARS * 0.9
                ? 'text-xs text-[#D4A843]'
                : 'text-xs text-[#999]'
          }
        >
          {charCount} / {MAX_CHARS}
        </span>
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex items-center gap-1 rounded-lg border border-[#CCCCCC] bg-white px-3 py-1.5 text-xs font-medium text-[#555] hover:bg-[#F5F5F5]"
            >
              <span className="inline-block h-2 w-2 rounded-sm bg-[#C0392B]" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!value.trim() || overLimit || disabled}
              className="inline-flex items-center gap-1 rounded-lg bg-[#0B6E6E] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#0a5a5a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Send
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden
              >
                <path d="M3.105 3.105a.75.75 0 011.052-.137l13.5 7.5a.75.75 0 010 1.314l-13.5 7.5A.75.75 0 013 18.75v-5.25l9.25-1.5L3 10.5v-5.25a.75.75 0 01.105-.395z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
