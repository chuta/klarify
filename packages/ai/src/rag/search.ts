// =============================================================================
// Vector retrieval — the read-side of the RAG pipeline.
//
// Flow:
//   1. Embed the query with embedQuery() (input_type=query, NOT document).
//   2. SELECT from regulatory_corpus with pgvector cosine distance.
//   3. Apply optional jurisdiction filter (e.g. only retrieve NG + FATF
//      chunks when the user's target_markets are Nigeria-only).
//   4. Re-rank in JS: similarity × jurisdiction weight (CLAUDE.md §11 calls
//      out Nigeria-first prioritisation for the African legal corpus).
//   5. Drop anything below minSimilarity (default 0.75 — keeps low-quality
//      partial matches out of the Claude context).
// =============================================================================
import { getPool, vectorLiteral } from './db.js';
import { embedQuery } from './embed.js';
import type { JurisdictionCode } from './filename.js';

export interface SearchOptions {
  /** Maximum number of chunks to return after re-ranking. */
  topK?: number;
  /**
   * Optional jurisdiction filter. When provided, the SQL WHERE clause limits
   * the corpus to these jurisdictions. INTL + FATF are auto-included if any
   * Nigerian jurisdiction is requested (the user's regulator environment is
   * Nigerian but FATF/GIABA standards apply transitively).
   */
  jurisdictions?: JurisdictionCode[];
  /** Drop results below this cosine similarity. Default 0.75. */
  minSimilarity?: number;
  /**
   * Over-fetch factor. We ask Postgres for `topK * fetchMultiplier` rows
   * before re-ranking — this lets a high-jurisdiction-weight chunk overtake
   * a lower-weight chunk that scored marginally higher in raw cosine.
   */
  fetchMultiplier?: number;
}

export interface RetrievedChunk {
  /** Chunk text (already prefixed with [Section: …] by the ingest pipeline). */
  content: string;
  /** Display name of the source document (e.g. "ISA 2025"). */
  sourceDocument: string;
  /** Jurisdiction code (NG, GH, FATF, etc.). */
  jurisdiction: JurisdictionCode;
  /** Section reference if present (e.g. "Section 357"), else null. */
  sectionReference: string | null;
  /** Cosine similarity, range [0, 1]. */
  similarity: number;
  /** Re-ranked score = similarity × jurisdictionWeight. */
  rankedScore: number;
  /** Free-form metadata as stored in regulatory_corpus.metadata. */
  metadata: Record<string, unknown>;
}

const DEFAULT_TOP_K = 8;
const DEFAULT_MIN_SIM = 0.75;
const DEFAULT_FETCH_MULT = 3;

// CLAUDE.md §11 priority — Nigeria is always highest.
const JURISDICTION_WEIGHT: Record<string, number> = {
  NG: 1.0,
  FATF: 0.9,
  INTL: 0.85,
  GH: 0.8,
  KE: 0.8,
  MU: 0.75,
  ZA: 0.75,
  REF: 0.95, // Founder's Guide is canonical interpretive material.
};
const DEFAULT_WEIGHT = 0.7;

function weightFor(jurisdiction: string): number {
  return JURISDICTION_WEIGHT[jurisdiction] ?? DEFAULT_WEIGHT;
}

/**
 * Expand the user-requested jurisdictions to include the always-on
 * "supranational" tier. A Nigerian user querying about transaction
 * monitoring needs FATF guidance to surface alongside MLPPA; we don't want
 * an aggressive jurisdiction filter to hide it.
 */
function expandJurisdictions(input: JurisdictionCode[]): JurisdictionCode[] {
  const set = new Set<JurisdictionCode>(input);
  // Always include FATF + REF — they're never market-specific.
  set.add('FATF');
  set.add('REF');
  // If any African market is selected, INTL (e.g. GIABA) becomes relevant.
  if (input.some((j) => ['NG', 'GH', 'KE', 'MU', 'ZA'].includes(j))) {
    set.add('INTL');
  }
  return [...set];
}

/**
 * Retrieve and re-rank the top regulatory chunks for a free-text query.
 *
 * Returns a length-`topK` array sorted by `rankedScore` desc. Below
 * `minSimilarity` raw similarity, chunks are dropped before re-ranking.
 *
 * Empty corpus → returns []. Caller should treat that as a configuration
 * error (CLAUDE.md §16 Rule 4 — never produce un-cited regulatory claims).
 */
export async function retrieveRelevantChunks(
  query: string,
  options: SearchOptions = {},
): Promise<RetrievedChunk[]> {
  const topK = options.topK ?? DEFAULT_TOP_K;
  const minSim = options.minSimilarity ?? DEFAULT_MIN_SIM;
  const fetchMult = options.fetchMultiplier ?? DEFAULT_FETCH_MULT;
  const overFetch = Math.max(topK * fetchMult, topK + 5);

  const queryVec = await embedQuery(query, { inputType: 'query' });
  const pool = getPool();

  // pgvector: `<=>` is cosine distance (lower = closer). Similarity = 1 - dist.
  let sql: string;
  const params: unknown[] = [vectorLiteral(queryVec), overFetch];
  if (options.jurisdictions && options.jurisdictions.length > 0) {
    const expanded = expandJurisdictions(options.jurisdictions);
    sql = `
      SELECT
        content,
        source_document,
        jurisdiction,
        section_reference,
        metadata,
        1 - (embedding <=> $1::vector) AS similarity
      FROM regulatory_corpus
      WHERE embedding IS NOT NULL
        AND jurisdiction = ANY($3::text[])
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `;
    params.push(expanded);
  } else {
    sql = `
      SELECT
        content,
        source_document,
        jurisdiction,
        section_reference,
        metadata,
        1 - (embedding <=> $1::vector) AS similarity
      FROM regulatory_corpus
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `;
  }

  const result = await pool.query<{
    content: string;
    source_document: string;
    jurisdiction: string;
    section_reference: string | null;
    metadata: Record<string, unknown>;
    similarity: number;
  }>(sql, params);

  const ranked: RetrievedChunk[] = result.rows
    .filter((r) => r.similarity >= minSim)
    .map((r) => {
      const similarity = Number(r.similarity);
      const weight = weightFor(r.jurisdiction);
      return {
        content: r.content,
        sourceDocument: r.source_document,
        jurisdiction: r.jurisdiction as JurisdictionCode,
        sectionReference: r.section_reference,
        similarity,
        rankedScore: similarity * weight,
        metadata: r.metadata ?? {},
      };
    })
    .sort((a, b) => b.rankedScore - a.rankedScore)
    .slice(0, topK);

  return ranked;
}
