'use client';

import type { Citation } from '@klarify/ai/chat';

interface Props {
  citation: Citation;
}

/** Map core/API citation shape to chat CitationBadge props. */
export function coreCitationToBadge(cite: {
  regulation: string;
  section: string;
  url?: string;
}): Citation {
  return {
    raw: `[${cite.regulation}, ${cite.section}]`,
    regulation: cite.regulation,
    section: cite.section,
    url: cite.url ?? null,
  };
}

/**
 * Renders a single citation as a JetBrains-Mono badge. CLAUDE.md §7 calls for
 * the mono treatment so citations visually punch out from prose.
 *
 * Links to the regulator's canonical URL when known (curated map in
 * @klarify/ai/chat/citations). Non-clickable when no URL is mapped — better
 * than a dead `#` link.
 */
export function CitationBadge({ citation }: Props): JSX.Element {
  const label = `[${citation.regulation}, ${citation.section}]`;
  const className =
    'inline-flex items-center rounded-md border border-[#0B6E6E]/30 bg-[#E6F4F4] px-2 py-0.5 ' +
    'font-mono text-[11px] leading-5 text-[#0B6E6E] no-underline ' +
    'hover:bg-[#0B6E6E] hover:text-white transition-colors';
  if (citation.url) {
    return (
      <a
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={`Open ${citation.regulation} on the regulator's website`}
      >
        {label}
      </a>
    );
  }
  return (
    <span
      className={className.replace('hover:bg-[#0B6E6E] hover:text-white transition-colors', 'cursor-default')}
      title="No public URL available for this citation"
    >
      {label}
    </span>
  );
}
