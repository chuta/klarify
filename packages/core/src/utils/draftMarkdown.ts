// =============================================================================
// Tiny markdown helpers for rendering AI-generated draft response letters.
//
// Opus emits drafts in light markdown: `**Bold**` for emphasis, `# Heading` /
// `## Heading` for letterhead lines, `---` for visual separators. We need:
//
//   * The web preview to render those as proper HTML (`<strong>`, paragraph
//     breaks, no `---` hairlines because the layout already framed the card).
//   * The `.docx` exporter to map them to bold `TextRun` instances.
//   * The plain-text "Copy text" button to strip the markers entirely so what
//     lands in the user's clipboard is what they'd want to paste into Word.
//
// We intentionally do NOT pull in a full markdown library (e.g. marked, remark):
//
//   * The draft format is constrained — bold runs + paragraphs + the
//     occasional heading. No links, no lists, no tables, no code.
//   * Both apps/api (Node) and apps/web (browser) need the same logic, and
//     the bundler / SSR / CSP cost of a generic markdown parser is real.
//   * Keeping the surface tiny makes the behaviour auditable — the draft is
//     literally going to a regulator, so deterministic, readable output
//     beats clever parsing every time.
// =============================================================================

/** A run of plain text within a paragraph that may be bold. */
export interface InlineSegment {
  text: string;
  bold?: boolean;
}

/** A paragraph in the rendered letter. */
export interface DraftParagraph {
  /** Inline runs (already markdown-stripped). Empty for a blank spacer line. */
  segments: InlineSegment[];
  /** True if this paragraph was a `# / ## / ###` heading line.
   *  Renderers MAY emphasise these (bigger text in docx, header tag in web). */
  isHeading: boolean;
}

/**
 * Parse a single line for inline markdown — currently only `**bold**` runs.
 *
 * Italics (`*foo*`) are intentionally NOT parsed: Opus uses single asterisks
 * inconsistently and parsing them risks corrupting legitimate text (e.g.
 * "interest rate*" footnote markers). If we later need italics, we should
 * require a dedicated marker.
 */
export function parseInlineMarkdown(line: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let remaining = line;
  while (remaining.length > 0) {
    // Try to consume a leading `**bold**` run.
    const boldMatch = remaining.match(/^\*\*([^*\n]+?)\*\*/);
    if (boldMatch) {
      segments.push({ text: boldMatch[1]!, bold: true });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }
    // No leading bold — take everything up to the next `**` or end-of-line.
    const nextBold = remaining.indexOf('**');
    if (nextBold === -1) {
      if (remaining.length > 0) segments.push({ text: remaining });
      break;
    }
    if (nextBold > 0) {
      segments.push({ text: remaining.slice(0, nextBold) });
    }
    remaining = remaining.slice(nextBold);
    // If the `**` doesn't close, advance past it and treat the rest as plain.
    const closingMatch = remaining.match(/^\*\*([^*\n]+?)\*\*/);
    if (!closingMatch) {
      segments.push({ text: remaining.slice(0, 2) });
      remaining = remaining.slice(2);
    }
  }
  return segments;
}

/**
 * Markdown horizontal-rule detection: a line consisting of three or more
 * `-`, `_`, or `*` characters (with optional internal whitespace).
 *
 * Opus drops these between letterhead and body. We strip them in the
 * rendered output because the card layout already provides visual
 * separation and a docx looks unprofessional with a stray `---` line.
 */
export function isHorizontalRule(line: string): boolean {
  return /^\s*([-_*]\s*){3,}\s*$/.test(line);
}

/** Strip a leading markdown heading prefix (`#`, `##`, …) and return the rest. */
export function stripHeadingMarker(line: string): {
  text: string;
  isHeading: boolean;
} {
  const m = line.match(/^\s*(#{1,6})\s+(.*)$/);
  if (m) return { text: m[2]!, isHeading: true };
  return { text: line, isHeading: false };
}

/**
 * Split a draft body into renderable paragraphs.
 *
 * Rules:
 *   * Split on blank lines (one or more) → paragraph boundaries.
 *   * Inside a paragraph, single newlines are preserved as soft breaks
 *     (collapsed to spaces here because both renderers wrap text anyway).
 *   * Horizontal rules become blank spacer paragraphs (one each) — gives
 *     the .docx a beat of vertical space without leaving the `---` text.
 *   * Headings are flagged so the renderer can give them weight.
 *
 * Returns paragraphs ready for direct rendering — no further markdown
 * parsing is needed by callers.
 */
export function parseDraftBody(draft: string): DraftParagraph[] {
  const normalised = draft.replace(/\r\n/g, '\n');
  const blocks = normalised.split(/\n{2,}/);
  const paragraphs: DraftParagraph[] = [];

  for (const block of blocks) {
    // Drop pure-horizontal-rule blocks entirely. A horizontal rule is a
    // visual marker only — no text to surface.
    if (isHorizontalRule(block.trim())) continue;

    // Within a block, collapse single newlines to spaces. Address blocks
    // (multi-line letterhead) become a single paragraph each, which is
    // what we want for both the docx (one paragraph per address block)
    // and the web preview (one rendered line per block).
    //
    // EXCEPTION: when a block contains multiple lines that each look like
    // address/recipient lines (no sentence punctuation), keep them as
    // separate paragraphs so the letterhead reads naturally.
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    if (lines.length > 1 && looksLikeAddressBlock(lines)) {
      for (const line of lines) {
        const { text, isHeading } = stripHeadingMarker(line);
        paragraphs.push({
          segments: parseInlineMarkdown(text),
          isHeading,
        });
      }
      continue;
    }

    // Otherwise treat the whole block as one paragraph.
    const joined = lines.join(' ');
    const { text, isHeading } = stripHeadingMarker(joined);
    paragraphs.push({
      segments: parseInlineMarkdown(text),
      isHeading,
    });
  }

  return paragraphs;
}

/**
 * Heuristic: a block where most lines are short and don't end in a sentence
 * terminator looks like an address block (recipient or sender header) and
 * should preserve its line breaks.
 */
function looksLikeAddressBlock(lines: string[]): boolean {
  let shortNoPunct = 0;
  for (const line of lines) {
    const bare = line.replace(/\*\*/g, '').trim();
    const ends = bare.slice(-1);
    if (bare.length <= 90 && ends !== '.' && ends !== '?') {
      shortNoPunct += 1;
    }
  }
  // ≥ 2/3 of the lines need to look address-like.
  return shortNoPunct >= Math.ceil((lines.length * 2) / 3);
}

/**
 * Detect whether the AI draft already includes a complete formal letter
 * (sender / recipient block, greeting, body, sign-off). When true, the
 * `.docx` exporter SKIPS its synthetic letterhead + sign-off scaffolding
 * to avoid the duplicate-letter bug we shipped on 2026-05-21.
 *
 * Detection criteria — must satisfy ALL:
 *   1. Contains a greeting line: `Dear ...,`
 *   2. Contains a sign-off phrase: "Yours sincerely" / "Yours faithfully"
 *      / "Sincerely" / "Best regards" / "Respectfully" / "Kind regards"
 *
 * If either is missing, we fall back to wrapping the body in our default
 * letterhead so the user always gets a sendable letter even when Opus
 * returns only a body paragraph.
 */
export function draftIncludesLetterhead(draft: string): boolean {
  const hasGreeting = /^\s*Dear [^\n]+,/m.test(draft);
  const hasSignOff =
    /\b(Yours sincerely|Yours faithfully|Sincerely(?: yours)?|Best regards|Kind regards|Respectfully(?: yours)?)\b/i.test(
      draft,
    );
  return hasGreeting && hasSignOff;
}

/**
 * Strip all markdown markers from a draft so it copies cleanly to the
 * clipboard. Removes `**`, `# / ## / ###` heading prefixes, and `---`
 * horizontal rules. Preserves all other content verbatim including
 * line breaks (the user typically wants paragraph structure).
 */
export function stripMarkdownToPlainText(draft: string): string {
  return draft
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !isHorizontalRule(line))
    .map((line) => line.replace(/^\s*#{1,6}\s+/, '').replace(/\*\*/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
