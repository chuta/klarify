// =============================================================================
// Embedding client for the RAG ingest + retrieval pipeline.
//
// Two modes:
//   - "document"  used at ingest time. Input is the corpus chunk text.
//   - "query"     used at search time. Voyage's bi-encoder family benefits
//                  measurably (~3-5% NDCG@10) from differentiating the two.
//
// Primary: Voyage AI `voyage-law-2` — purpose-built for legal/regulatory
//   text, 1024 dimensions (matches the regulatory_corpus.embedding column).
// Fallback: OpenAI `text-embedding-3-small` — only triggered if VOYAGE_API_KEY
//   is unset AND OPENAI_API_KEY is present. v3 supports `dimensions: 1024`
//   so we get a vector that matches the column shape natively.
//
// We call both providers via fetch rather than their SDKs. The voyageai
// official SDK (0.2.1) ships a broken ESM build that imports
// `api/index.jsx`, so a bare REST integration is more reliable and
// eliminates a heavy transitive dependency tree.
// =============================================================================

export const EMBEDDING_DIM = 1024;
export type EmbedInputType = 'document' | 'query';

export interface EmbedOptions {
  inputType?: EmbedInputType;
  signal?: AbortSignal;
}

export interface EmbedResult {
  /** Order-preserved 1024-dim embeddings, one per input text. */
  vectors: number[][];
  /** Provider that actually served the request. */
  provider: 'voyage' | 'openai';
  /** Total tokens billed (for cost reporting in the ingest CLI). */
  tokensUsed: number;
}

// Voyage's hard batch limit per their API docs (2026).
const VOYAGE_BATCH_SIZE = 100;
const OPENAI_BATCH_SIZE = 100;
const VOYAGE_ENDPOINT = 'https://api.voyageai.com/v1/embeddings';
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/embeddings';
const INITIAL_BACKOFF_MS = 500;
const MAX_RETRIES = 5;

interface VoyageEmbeddingResponse {
  object: string;
  data: Array<{ object: string; embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
}

interface OpenAIEmbeddingResponse {
  data: Array<{ embedding: number[]; index: number }>;
  usage: { prompt_tokens: number; total_tokens: number };
}

/**
 * Generate embeddings for a list of input texts. Single entry point —
 * call sites should NOT hit either provider directly.
 *
 * Throws if no provider is configured. Callers must surface this as a
 * configuration error, never silently produce zero vectors.
 */
export async function embedBatch(
  texts: string[],
  opts: EmbedOptions = {},
): Promise<EmbedResult> {
  if (texts.length === 0) {
    return { vectors: [], provider: 'voyage', tokensUsed: 0 };
  }
  const inputType: EmbedInputType = opts.inputType ?? 'document';

  const voyageKey = process.env.VOYAGE_API_KEY;
  if (voyageKey && !voyageKey.startsWith('your_') && voyageKey.trim() !== '') {
    return embedWithVoyage(voyageKey, texts, inputType, opts.signal);
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && !openaiKey.startsWith('your_') && openaiKey.trim() !== '') {
    return embedWithOpenAI(openaiKey, texts, opts.signal);
  }

  throw new Error(
    'embedBatch: no embedding provider configured. ' +
      'Set VOYAGE_API_KEY (preferred) or OPENAI_API_KEY in .env.',
  );
}

/** Convenience wrapper for single-query embedding at retrieval time. */
export async function embedQuery(text: string, opts: EmbedOptions = {}): Promise<number[]> {
  const { vectors } = await embedBatch([text], { ...opts, inputType: 'query' });
  const first = vectors[0];
  if (!first) {
    throw new Error('embedQuery: provider returned no vector for input');
  }
  return first;
}

// ---------------------------------------------------------------------------
// Provider: Voyage AI
// ---------------------------------------------------------------------------

async function embedWithVoyage(
  apiKey: string,
  texts: string[],
  inputType: EmbedInputType,
  signal?: AbortSignal,
): Promise<EmbedResult> {
  const model = process.env.VOYAGE_MODEL ?? 'voyage-law-2';
  const vectors: number[][] = new Array(texts.length);
  let tokensUsed = 0;

  for (let i = 0; i < texts.length; i += VOYAGE_BATCH_SIZE) {
    if (signal?.aborted) throw new Error('embedBatch aborted');
    const batch = texts.slice(i, i + VOYAGE_BATCH_SIZE);

    const json = await withRetry(async () => {
      const res = await fetch(VOYAGE_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: batch,
          model,
          // Voyage's docs accept "query" | "document" | null (default).
          input_type: inputType,
        }),
        signal,
      });
      if (!res.ok) {
        const body = await res.text();
        const err = new Error(`voyage embeddings ${res.status}: ${body}`);
        (err as Error & { retryable?: boolean; statusCode?: number }).retryable =
          res.status === 429 || res.status >= 500;
        (err as Error & { statusCode?: number }).statusCode = res.status;
        throw err;
      }
      return (await res.json()) as VoyageEmbeddingResponse;
    });

    if (json.data.length !== batch.length) {
      throw new Error(
        `embedWithVoyage: expected ${batch.length} vectors, got ${json.data.length}`,
      );
    }
    for (const item of json.data) {
      if (item.embedding.length !== EMBEDDING_DIM) {
        throw new Error(
          `embedWithVoyage: expected ${EMBEDDING_DIM}-dim vector, got ${item.embedding.length}. ` +
            `Model "${model}" doesn't match regulatory_corpus.embedding column type.`,
        );
      }
      vectors[i + item.index] = item.embedding;
    }
    tokensUsed += json.usage.total_tokens;
  }

  return { vectors, provider: 'voyage', tokensUsed };
}

// ---------------------------------------------------------------------------
// Provider: OpenAI (fallback)
// ---------------------------------------------------------------------------

async function embedWithOpenAI(
  apiKey: string,
  texts: string[],
  signal?: AbortSignal,
): Promise<EmbedResult> {
  // text-embedding-3-small supports the `dimensions` parameter via
  // Matryoshka-style truncation. We request 1024 dims to match the
  // regulatory_corpus.embedding column.
  const model = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
  const vectors: number[][] = new Array(texts.length);
  let tokensUsed = 0;

  for (let i = 0; i < texts.length; i += OPENAI_BATCH_SIZE) {
    if (signal?.aborted) throw new Error('embedBatch aborted');
    const batch = texts.slice(i, i + OPENAI_BATCH_SIZE);

    const json = await withRetry(async () => {
      const res = await fetch(OPENAI_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, input: batch, dimensions: EMBEDDING_DIM }),
        signal,
      });
      if (!res.ok) {
        const body = await res.text();
        const err = new Error(`openai embeddings ${res.status}: ${body}`);
        (err as Error & { retryable?: boolean; statusCode?: number }).retryable =
          res.status === 429 || res.status >= 500;
        (err as Error & { statusCode?: number }).statusCode = res.status;
        throw err;
      }
      return (await res.json()) as OpenAIEmbeddingResponse;
    });

    for (const item of json.data) {
      if (item.embedding.length !== EMBEDDING_DIM) {
        throw new Error(
          `embedWithOpenAI: expected ${EMBEDDING_DIM}-dim vector, got ${item.embedding.length}. ` +
            `OpenAI rejected the dimensions hint silently — verify model "${model}".`,
        );
      }
      vectors[i + item.index] = item.embedding;
    }
    tokensUsed += json.usage.total_tokens;
  }

  return { vectors, provider: 'openai', tokensUsed };
}

// ---------------------------------------------------------------------------
// Retry helper — exponential backoff on 429 / 5xx.
// ---------------------------------------------------------------------------

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  let delay = INITIAL_BACKOFF_MS;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === MAX_RETRIES) break;
      await sleep(delay);
      delay *= 2;
    }
  }
  throw lastErr;
}

function isRetryable(err: unknown): boolean {
  if (err instanceof Error) {
    if ((err as { retryable?: boolean }).retryable === true) return true;
    if (err.message.includes('ECONNRESET') || err.message.includes('ETIMEDOUT')) {
      return true;
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
