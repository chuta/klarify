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

// =============================================================================
// Markdown ↔ HTML bridge for the TinyMCE draft editor.
//
// TinyMCE works in HTML. Our AI draft + .docx exporter work in markdown. We
// keep markdown as the single source of truth (it's what the AI emits and
// what we render to Word). When the user opens the editor we convert
// markdown → HTML; when they save we convert HTML → markdown.
//
// Both converters target a deliberately small subset so the round-trip is
// stable: paragraphs, headings (h1–h6), bold, italic, underline, bullet/
// numbered lists, horizontal rules, hard line breaks. Anything else
// TinyMCE produces is degraded to plain text rather than thrown away —
// safer for legal correspondence than silent data loss.
// =============================================================================

/**
 * Convert a draft body (markdown) into the HTML form TinyMCE expects on
 * `initialValue` / `value`. Uses `parseDraftBody` so the editor opens with
 * the exact same paragraph + bold structure as the read-only preview.
 *
 * Output guarantees:
 *   * Every paragraph is wrapped in `<p>` so TinyMCE treats Enter-to-new-
 *     paragraph naturally.
 *   * Headings (`#`, `##`, …) become `<h2>` so the visual hierarchy
 *     matches the preview.
 *   * Address-block multi-line paragraphs use `<p>` per line (parseDraftBody
 *     already returns them as separate paragraphs).
 *   * All text is HTML-escaped — protects against any stray `<` / `&` in the
 *     AI output ending up as malformed HTML in the editor.
 */
export function markdownToHtml(markdown: string): string {
  const paragraphs = parseDraftBody(markdown);
  if (paragraphs.length === 0) return '<p></p>';
  return paragraphs
    .map((para) => {
      if (para.segments.length === 0) return '<p></p>';
      const inner = para.segments
        .map((seg) => {
          const escaped = escapeHtml(seg.text);
          return seg.bold ? `<strong>${escaped}</strong>` : escaped;
        })
        .join('');
      return para.isHeading ? `<h2>${inner}</h2>` : `<p>${inner}</p>`;
    })
    .join('\n');
}

/**
 * Convert TinyMCE's HTML back into markdown for our storage / .docx pipeline.
 *
 * Implementation notes:
 *   * Uses a regex-driven tag walker rather than DOMParser so this works
 *     both in the browser (TinyMCE) and in Node (tests). The HTML subset
 *     we accept is tiny and TinyMCE's output is well-formed.
 *   * Unknown tags are dropped but their text content is preserved.
 *   * Whitespace inside paragraphs is collapsed; paragraph boundaries
 *     become blank lines in the markdown output.
 *   * `<br>` becomes a single newline within the current paragraph.
 *   * Heading levels 1–3 round-trip to `## ` (we don't need finer
 *     distinction in regulator letters and our exporter only renders one
 *     heading style anyway).
 */
export function htmlToMarkdown(html: string): string {
  if (!html || html.trim() === '') return '';

  // IMPORTANT: entities are decoded LAST, not first.
  // If we decoded `&lt;` → `<` up front, the later `<[^>]+>` strip step
  // would treat a legitimate "<" in body text (e.g. "5 < 10") as the start
  // of a tag and silently eat it. By keeping entities encoded through all
  // tag-processing passes, we guarantee body text is never misread.
  let s = html.replace(/\r\n/g, '\n').replace(/&nbsp;/gi, ' ');

  // <br> → soft line break inside the current paragraph.
  s = s.replace(/<br\s*\/?>/gi, '\n');

  // <hr> → markdown horizontal rule on its own paragraph.
  s = s.replace(/<hr\s*\/?>/gi, '\n\n---\n\n');

  // Headings → `## ` (single canonical level — see comment above).
  s = s.replace(
    /<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi,
    (_, inner: string) => `\n\n## ${stripTagsInline(inner)}\n\n`,
  );

  // Bullet list items → `- item`.
  s = s.replace(
    /<li[^>]*>([\s\S]*?)<\/li>/gi,
    (_, inner: string) => `- ${stripTagsInline(inner)}\n`,
  );
  s = s.replace(/<\/?(ul|ol)[^>]*>/gi, '\n');

  // Bold: <strong> or <b>.
  s = s.replace(
    /<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi,
    (_, _tag: string, inner: string) => {
      const t = stripTagsInline(inner).trim();
      return t ? `**${t}**` : '';
    },
  );

  // Italic: <em> or <i> — we still emit single-asterisk markers for the
  // editor user's intent even though our markdown parser ignores italics.
  s = s.replace(
    /<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi,
    (_, _tag: string, inner: string) => {
      const t = stripTagsInline(inner).trim();
      return t ? `*${t}*` : '';
    },
  );

  // Underline / span — strip the tag, keep the contents.
  s = s.replace(/<\/?(u|span|font)[^>]*>/gi, '');

  // Paragraphs → text + blank line.
  s = s.replace(
    /<p[^>]*>([\s\S]*?)<\/p>/gi,
    (_, inner: string) => `${stripTagsInline(inner).trim()}\n\n`,
  );

  // Strip any remaining tags as a safety net.
  s = s.replace(/<[^>]+>/g, '');

  // Decode entities now that no further tag parsing will happen — see
  // comment at the top of the function.
  s = s
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

  // Collapse 3+ blank lines and trim.
  return s
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** HTML-escape a string for safe embedding in attribute or text contexts. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Remove inline tags from a captured group, preserving emphasis markers.
 *
 * Entity decoding stays deferred to the outer caller (`htmlToMarkdown`)
 * so we don't accidentally re-introduce raw `<` / `>` that the final tag
 * strip pass would eat. See the comment at the top of `htmlToMarkdown`.
 */
function stripTagsInline(s: string): string {
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(strong|b)[^>]*>/gi, '**')
    .replace(/<\/?(em|i)[^>]*>/gi, '*')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ');
}
