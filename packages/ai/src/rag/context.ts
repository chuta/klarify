// =============================================================================
// Context assembler — builds the regulatory-context block that's appended to
// the Klarify base system prompt before each FounderCounsel call.
//
// Constraints:
//   - 8000-token budget total (CLAUDE.md §3 — leaves Claude ~30K tokens of
//     conversation history + response budget on the 200K context window).
//   - Top-3 chunks ALWAYS make it in, even if they push the budget. The
//     budget only kicks in for chunks 4..N. Better to overflow by 200 tokens
//     than to drop a high-similarity citation.
//   - User profile sentence (product types, target markets, stage, readiness
//     score) is appended last, BEFORE the user message in the Claude call.
//     Adding it here keeps the per-call wiring trivial.
//
// Format per chunk (matches CLAUDE.md §3 "[SOURCE: doc, section] content"):
//   [SOURCE: ISA 2025, Section 357]
//   <chunk content>
//
//   [SOURCE: MLPPA 2022, Section 4]
//   <chunk content>
//
// Followed by a user profile blurb (when provided):
//   User context: Building a DAX product, targeting NG, currently at
//   the building stage, readiness score 42/100.
// =============================================================================
import { encode } from 'gpt-tokenizer';
import type { RetrievedChunk } from './search.js';

export interface UserProfileForContext {
  productTypes?: string[];
  targetMarkets?: string[];
  stage?: string | null;
  readinessScore?: number | null;
}

export interface AssembleContextOptions {
  /** Hard token cap for the entire context block. Default 8000. */
  tokenBudget?: number;
  /** Chunks that must never be dropped, regardless of budget. Default 3. */
  alwaysKeepTopN?: number;
}

export interface AssembledContext {
  /** Final text ready to drop into the Claude system prompt. */
  text: string;
  /** Number of chunks that made it into the block. */
  chunksUsed: number;
  /** Approximate token count (gpt-tokenizer cl100k). */
  tokenCount: number;
}

const DEFAULT_BUDGET = 8000;
const DEFAULT_ALWAYS_KEEP = 3;
const PROFILE_RESERVE_TOKENS = 80; // typical "User context: ..." line

/**
 * Assemble the regulatory context block from retrieved chunks. Returns an
 * empty-string `text` (and zero counts) when chunks is empty — callers
 * MUST handle that case as a configuration error rather than passing an
 * empty block to Claude (would silently produce un-cited responses).
 */
export function assembleContext(
  chunks: RetrievedChunk[],
  profile: UserProfileForContext | null,
  options: AssembleContextOptions = {},
): AssembledContext {
  const budget = options.tokenBudget ?? DEFAULT_BUDGET;
  const alwaysKeep = options.alwaysKeepTopN ?? DEFAULT_ALWAYS_KEEP;

  if (chunks.length === 0) {
    return { text: '', chunksUsed: 0, tokenCount: 0 };
  }

  // Chunks are pre-sorted by rankedScore desc out of retrieveRelevantChunks.
  // We still defensively sort here in case a caller hand-rolls the input.
  const sorted = [...chunks].sort((a, b) => b.rankedScore - a.rankedScore);

  // Reserve room for the profile blurb so we don't have to truncate at the
  // very end.
  const reserve = profile ? PROFILE_RESERVE_TOKENS : 0;
  const chunkBudget = Math.max(budget - reserve, 1000);

  const blocks: string[] = [];
  let runningTokens = 0;
  let used = 0;

  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i]!;
    const block = formatChunk(c);
    const tokens = encode(block).length;
    const overBudget = runningTokens + tokens > chunkBudget;
    const protectedTop = i < alwaysKeep;
    if (overBudget && !protectedTop) break;
    blocks.push(block);
    runningTokens += tokens;
    used++;
  }

  let text = blocks.join('\n\n');
  if (profile) {
    const profileLine = formatProfile(profile);
    if (profileLine) {
      text = text.length > 0 ? `${text}\n\n${profileLine}` : profileLine;
      runningTokens += encode(profileLine).length;
    }
  }

  return { text, chunksUsed: used, tokenCount: runningTokens };
}

function formatChunk(c: RetrievedChunk): string {
  const headerBits = [c.sourceDocument];
  if (c.sectionReference) headerBits.push(c.sectionReference);
  return `[SOURCE: ${headerBits.join(', ')}]\n${c.content}`;
}

function formatProfile(p: UserProfileForContext): string {
  const parts: string[] = [];
  const products = (p.productTypes ?? []).filter(Boolean);
  if (products.length > 0) {
    parts.push(`Building a ${products.join(' / ')} product`);
  }
  const markets = (p.targetMarkets ?? []).filter(Boolean);
  if (markets.length > 0) {
    parts.push(`targeting ${markets.join(', ')}`);
  }
  if (p.stage) parts.push(`currently at the ${p.stage} stage`);
  if (typeof p.readinessScore === 'number') {
    parts.push(`readiness score ${p.readinessScore}/100`);
  }
  if (parts.length === 0) return '';
  return `User context: ${parts.join(', ')}.`;
}
