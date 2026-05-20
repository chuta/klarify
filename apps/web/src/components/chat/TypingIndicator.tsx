'use client';

/**
 * Three staggered bouncing dots in Klarify teal. Shown while the assistant's
 * response is streaming but no text has arrived yet (first-token latency
 * is dominated by RAG embedding + Claude TTFT, typically 500–1500ms).
 */
export function TypingIndicator(): JSX.Element {
  return (
    <div className="flex items-center gap-1 py-2" aria-label="FounderCounsel is typing…">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-2 w-2 animate-bounce rounded-full bg-[#0B6E6E]"
          style={{ animationDelay: `${i * 120}ms`, animationDuration: '900ms' }}
        />
      ))}
    </div>
  );
}
