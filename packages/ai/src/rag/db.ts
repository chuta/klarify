// =============================================================================
// Postgres client for the RAG pipeline.
//
// We use `pg` directly (not Prisma) because:
//   1. Prisma cannot type vector(1024) — it falls back to Unsupported and any
//      $executeRaw / $queryRaw involving vectors becomes string templating.
//   2. pg's COPY-style multi-row INSERTs are 5–10x faster than Prisma for
//      bulk loads (we'll insert ~5000 chunks in the full corpus run).
//   3. The ingest script lives outside the Hono server, so connection-pool
//      sharing with apps/api isn't a concern.
//
// Connection URL: prefer DIRECT_URL (direct connection — needed for COPY)
// and fall back to DATABASE_URL.
// =============================================================================
import { Pool, type PoolConfig } from 'pg';

let cached: Pool | undefined;

export function getPool(): Pool {
  if (cached) return cached;

  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'getPool: neither DIRECT_URL nor DATABASE_URL is set. ' +
        'See packages/ai/scripts/ingest.ts.',
    );
  }

  const config: PoolConfig = {
    connectionString: url,
    // Single-writer ingestion: 2 connections is enough. Leaves headroom on
    // the Supabase plan's 60-connection cap for other workloads.
    max: 2,
    // The full corpus run takes ~20 minutes — set idle timeout high enough
    // to keep the connection warm across Voyage rate-limit waits.
    idleTimeoutMillis: 30_000,
    // SSL is required by Supabase. The direct host's cert is signed by
    // Amazon, not a public CA we have a local store for, so we relax.
    ssl: url.includes('supabase.co') ? { rejectUnauthorized: false } : undefined,
  };
  cached = new Pool(config);
  return cached;
}

export async function closePool(): Promise<void> {
  if (cached) {
    await cached.end();
    cached = undefined;
  }
}

/**
 * Format a number[] as a pgvector literal string: `[0.1,0.2,...]`.
 *
 * pgvector accepts the literal in either VALUES (...) or COPY format. We
 * pass it as a parameter and cast inside the SQL: `$N::vector`.
 *
 * Performance note: doing this once per row in JS is ~30µs/chunk on Node 20;
 * the bottleneck is the network round-trip, not the formatting.
 */
export function vectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`;
}
