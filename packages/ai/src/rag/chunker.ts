// =============================================================================
// Token-aware chunker for the RAG ingest pipeline.
//
// Why token-aware (not character-aware):
//   - Voyage and OpenAI embedding APIs charge and limit by tokens, not chars.
//   - Legal text is dense with high tokens-per-char ratios — char chunking
//     blows past the 8K embedding context window on long sections.
//
// Why section-aware:
//   - Search retrieves chunks one at a time. A chunk that loses its parent
//     section heading ("Section 357 — Definitions") is much harder for the
//     LLM to cite correctly. We carry the most recent heading forward into
//     every following chunk's metadata, and prepend it to the chunk content
//     so the model sees the context it needs to ground a citation.
//
// The chosen tokeniser is `gpt-tokenizer` (cl100k_base — OpenAI). Voyage uses
// its own tokeniser, but cl100k is within ~10% — close enough for chunk-size
// budgeting where we already leave a comfortable headroom (512 target vs the
// 8K Voyage / 8K OpenAI input limit).
// =============================================================================
import { encode, decode } from 'gpt-tokenizer';

export interface ChunkOptions {
  /** Target chunk size in tokens. */
  targetTokens?: number;
  /** Token overlap between consecutive chunks. */
  overlapTokens?: number;
}

export interface ChunkRecord {
  /** Final chunk text, with section-header prefix when applicable. */
  content: string;
  /** Section heading inherited by this chunk (e.g. "Section 357"), or null. */
  sectionHeader: string | null;
  /** 0-indexed position of this chunk within the source document. */
  chunkIndex: number;
}

const DEFAULT_TARGET_TOKENS = 512;
const DEFAULT_OVERLAP_TOKENS = 50;

/**
 * Heading detector. Matches the common Nigerian regulatory document patterns:
 *   - "SECTION 357" / "Section 357"
 *   - "RULE 5.2" / "Rule 5.2(a)"
 *   - "PART III" / "Part III"
 *   - "ARTICLE 4" / "Article 4"
 *   - "CHAPTER 2" / "Chapter 2"
 *   - "4.1 KYC Tiering" (lone numeric heading, 1–3 digits)
 *   - Anything in ALL CAPS shorter than 80 chars on its own line
 *
 * Returns the canonical heading text for storage, or null if the line is body.
 *
 * Exported for unit testing — keep the regexes tight, false positives bleed
 * into chunk metadata.
 */
export function detectSectionHeader(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.length > 120) return null;

  // SECTION / RULE / PART / ARTICLE / CHAPTER patterns
  const structural = trimmed.match(
    /^(SECTION|Section|RULE|Rule|PART|Part|ARTICLE|Article|CHAPTER|Chapter|SCHEDULE|Schedule|APPENDIX|Appendix)\s+([IVXLC]+|[0-9]+(?:\.[0-9]+)*(?:\([a-z]\))?)\b.*$/,
  );
  if (structural) return trimmed;

  // Standalone numeric subsection heading e.g. "4.1 KYC Tiering Framework"
  const numericHead = trimmed.match(/^([0-9]+\.[0-9]+(?:\.[0-9]+)?)\s+[A-Z]/);
  if (numericHead && trimmed.length <= 100) return trimmed;

  // All-caps short line — common chapter title style in legislative PDFs.
  // Heuristic: ≥3 chars, ≥60% uppercase letters, no terminal punctuation.
  if (
    trimmed.length >= 3 &&
    trimmed.length <= 80 &&
    /^[A-Z][A-Z0-9 \-&,'/().]+$/.test(trimmed) &&
    !/[.!?]$/.test(trimmed)
  ) {
    const letters = trimmed.replace(/[^A-Za-z]/g, '');
    const upper = trimmed.replace(/[^A-Z]/g, '');
    if (letters.length > 0 && upper.length / letters.length >= 0.6) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Chunk a document into overlapping token windows, carrying the most recent
 * detected section heading into the metadata + content of each chunk.
 *
 * The algorithm:
 *   1. Walk the text line-by-line. Detect headings; update a rolling
 *      "current heading" pointer.
 *   2. Maintain a running buffer of pending lines.
 *   3. When the buffer's token count would exceed `targetTokens`, flush a
 *      chunk. Carry the trailing `overlapTokens` of tokens forward as the
 *      seed of the next chunk (this preserves context across the chunk
 *      boundary — important for sentences that span splits).
 *   4. Prepend "[Section: <heading>]\n" to the chunk content when a heading
 *      is active, so retrieval results carry section context inline as well
 *      as in metadata.
 */
export function chunkText(text: string, opts: ChunkOptions = {}): ChunkRecord[] {
  const target = opts.targetTokens ?? DEFAULT_TARGET_TOKENS;
  const overlap = Math.min(opts.overlapTokens ?? DEFAULT_OVERLAP_TOKENS, target - 1);

  if (text.trim().length === 0) return [];

  const lines = text.split('\n');
  const chunks: ChunkRecord[] = [];
  let currentHeader: string | null = null;
  let buffer: string[] = [];
  let bufferTokens = 0;
  let chunkIndex = 0;
  // The heading that was active when the *current* buffer started filling.
  // We snapshot at buffer-start so a chunk that's mostly body text under
  // Section 357 stays attributed to Section 357 even if a new heading
  // appears in the trailing overlap.
  let bufferHeader: string | null = null;

  const flush = (): void => {
    if (buffer.length === 0) return;
    const bodyText = buffer.join('\n').trim();
    if (bodyText.length === 0) return;

    const content = bufferHeader
      ? `[Section: ${bufferHeader}]\n${bodyText}`
      : bodyText;

    chunks.push({
      content,
      sectionHeader: bufferHeader,
      chunkIndex: chunkIndex++,
    });
  };

  for (const line of lines) {
    const heading = detectSectionHeader(line);
    if (heading) {
      // A heading flushes the in-progress chunk first (so the new section
      // gets its own chunk start), then becomes the active header.
      flush();
      buffer = [];
      bufferTokens = 0;
      currentHeader = heading;
      bufferHeader = heading;
      // Don't include the heading line in the body — it's already in the
      // metadata + prepended via the [Section: ...] prefix.
      continue;
    }

    // Estimate token cost of adding this line. We tokenise the line ALONE
    // (small overhead) rather than re-tokenising the whole buffer each loop
    // iteration, which would be O(n²).
    const lineTokens = encode(line).length;

    if (bufferTokens + lineTokens > target && buffer.length > 0) {
      // Take the trailing `overlap` tokens to seed the next buffer.
      const flatBuffer = buffer.join('\n');
      const tokens = encode(flatBuffer);
      const overlapSlice = tokens.slice(Math.max(0, tokens.length - overlap));
      const overlapText = decode(overlapSlice);

      flush();
      buffer = overlapText.length > 0 ? [overlapText] : [];
      bufferTokens = overlapSlice.length;
      // Carry the active header into the next chunk — overlap preserves context.
      bufferHeader = currentHeader;
    }

    if (buffer.length === 0) bufferHeader = currentHeader;
    buffer.push(line);
    bufferTokens += lineTokens;
  }

  flush();
  return chunks;
}
