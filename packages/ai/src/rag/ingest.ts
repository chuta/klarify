// =============================================================================
// Corpus ingestion orchestrator.
//
// Single entry point: `ingestFile(absPath, opts)` runs the full pipeline for
// one PDF:
//
//   1. Parse filename → jurisdiction / regulation key / display name.
//   2. Extract PDF text.
//   3. Chunk into 512-token windows with 50-token overlap.
//   4. (optionally) embed each chunk via Voyage (or OpenAI fallback).
//   5. Open a transaction:
//        - DELETE FROM regulatory_corpus WHERE source_document = <displayName>
//          (idempotent — re-ingest replaces the prior version)
//        - Batch INSERT every chunk + embedding.
//   6. Write progress to the ingestion_log table at each phase change.
//
// The orchestrator is intentionally NOT a CLI — that lives in
// `scripts/ingest.ts` so it can be invoked with `pnpm ingest`.
// =============================================================================
import { basename } from 'node:path';
import type { Pool } from 'pg';
import { extractPdf } from './extract.js';
import { chunkText, type ChunkRecord } from './chunker.js';
import { parseFilename, type ParsedFilename } from './filename.js';
import { embedBatch, EMBEDDING_DIM } from './embed.js';
import { getPool, vectorLiteral } from './db.js';

export interface IngestOptions {
  /** If true, skip the embedding + DB-write phases. */
  dryRun?: boolean;
  /**
   * Per-chunk write batch size. Each INSERT carries N chunks. Lower values
   * lower memory pressure; higher values reduce network round-trips. 50 is
   * a sweet spot for Supabase's pooler.
   */
  insertBatchSize?: number;
}

export interface IngestResult {
  filename: string;
  jurisdiction: ParsedFilename['jurisdiction'];
  documentName: string;
  pages: number;
  chunkCount: number;
  embeddingTokens: number;
  elapsedMs: number;
  /** ingestion_log row id (null when dryRun). */
  logId: string | null;
}

const DEFAULT_INSERT_BATCH = 50;

export async function ingestFile(
  absPath: string,
  opts: IngestOptions = {},
): Promise<IngestResult> {
  const filename = basename(absPath);
  const parsed = parseFilename(filename);
  const start = Date.now();

  const pool: Pool | null = opts.dryRun ? null : getPool();
  let logId: string | null = null;

  // 1. Open ingestion_log row (status = extracting).
  if (pool && !opts.dryRun) {
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO ingestion_log
        (filename, embedding_model, status, started_at)
        VALUES ($1, $2, 'extracting', NOW())
        RETURNING id`,
      [filename, process.env.VOYAGE_MODEL ?? 'voyage-law-2'],
    );
    logId = inserted.rows[0]?.id ?? null;
  }

  try {
    // 2. Extract.
    const { text, pages, charCount } = await extractPdf(absPath);
    console.warn(
      `  • extracted ${pages} pages / ${charCount.toLocaleString()} chars`,
    );

    // 3. Chunk.
    const chunks = chunkText(text);
    console.warn(`  • produced ${chunks.length} chunks`);

    if (opts.dryRun || pool === null) {
      return {
        filename,
        jurisdiction: parsed.jurisdiction,
        documentName: parsed.documentName,
        pages,
        chunkCount: chunks.length,
        embeddingTokens: 0,
        elapsedMs: Date.now() - start,
        logId: null,
      };
    }

    // 4. Embed in 100-chunk batches via the shared embedBatch helper.
    if (logId) {
      await pool.query(`UPDATE ingestion_log SET status = 'embedding' WHERE id = $1`, [logId]);
    }
    const embedResult = await embedBatch(
      chunks.map((c) => c.content),
      { inputType: 'document' },
    );
    if (embedResult.vectors.length !== chunks.length) {
      throw new Error(
        `ingestFile: embedBatch returned ${embedResult.vectors.length} vectors for ` +
          `${chunks.length} chunks (provider=${embedResult.provider})`,
      );
    }
    console.warn(
      `  • embedded ${chunks.length} chunks via ${embedResult.provider} ` +
        `(${embedResult.tokensUsed.toLocaleString()} tokens)`,
    );

    // 5. Transactional replace.
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const del = await client.query(
        `DELETE FROM regulatory_corpus WHERE source_document = $1`,
        [parsed.documentName],
      );
      if ((del.rowCount ?? 0) > 0) {
        console.warn(`  • replaced ${del.rowCount} existing chunks`);
      }

      const batchSize = opts.insertBatchSize ?? DEFAULT_INSERT_BATCH;
      for (let i = 0; i < chunks.length; i += batchSize) {
        const slice = chunks.slice(i, i + batchSize);
        const sliceVectors = embedResult.vectors.slice(i, i + batchSize);
        await insertChunkBatch(client, parsed, slice, sliceVectors);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    // 6. Close out ingestion_log row.
    if (logId) {
      await pool.query(
        `UPDATE ingestion_log
            SET status = 'complete',
                chunk_count = $2,
                completed_at = NOW()
          WHERE id = $1`,
        [logId, chunks.length],
      );
    }

    return {
      filename,
      jurisdiction: parsed.jurisdiction,
      documentName: parsed.documentName,
      pages,
      chunkCount: chunks.length,
      embeddingTokens: embedResult.tokensUsed,
      elapsedMs: Date.now() - start,
      logId,
    };
  } catch (err) {
    // Record the failure in ingestion_log so the operator can see why.
    if (pool && logId) {
      const msg = err instanceof Error ? err.message : String(err);
      await pool
        .query(
          `UPDATE ingestion_log
              SET status = 'error',
                  error_msg = $2,
                  completed_at = NOW()
            WHERE id = $1`,
          [logId, msg.slice(0, 2000)],
        )
        .catch(() => {
          /* best effort */
        });
    }
    throw err;
  }
}

/**
 * Build a multi-row INSERT for one batch of chunks. Uses positional
 * parameters so pg's parameter sanitiser handles escaping — never
 * concatenate untrusted values into the SQL string.
 */
async function insertChunkBatch(
  client: import('pg').PoolClient,
  parsed: ParsedFilename,
  chunks: ChunkRecord[],
  vectors: number[][],
): Promise<void> {
  // regulatory_corpus columns we set:
  //   source_document, jurisdiction, section_reference, content,
  //   embedding (vector(1024)), metadata jsonb
  //
  // 6 columns × N rows → 6N positional params.
  const rows: string[] = [];
  const params: unknown[] = [];
  let p = 1;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const vec = vectors[i];
    if (!chunk || !vec) {
      throw new Error(`insertChunkBatch: missing chunk/vector at index ${i}`);
    }
    if (vec.length !== EMBEDDING_DIM) {
      throw new Error(
        `insertChunkBatch: vector at index ${i} has ${vec.length} dims, expected ${EMBEDDING_DIM}`,
      );
    }

    const metadata = {
      source_file: parsed.filename,
      regulation_key: parsed.regulationKey,
      year: parsed.year,
      chunk_index: chunk.chunkIndex,
      total_chunks: chunks.length,
    };

    rows.push(
      `($${p++}, $${p++}, $${p++}, $${p++}, $${p++}::vector, $${p++}::jsonb)`,
    );
    params.push(
      parsed.documentName,
      parsed.jurisdiction,
      chunk.sectionHeader,
      chunk.content,
      vectorLiteral(vec),
      JSON.stringify(metadata),
    );
  }

  const sql = `
    INSERT INTO regulatory_corpus
      (source_document, jurisdiction, section_reference, content, embedding, metadata)
    VALUES ${rows.join(', ')}
  `;
  await client.query(sql, params);
}
