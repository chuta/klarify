#!/usr/bin/env node
// =============================================================================
// RAG end-to-end smoke harness (S2-A5).
//
// Verifies the full retrieval pipeline against the live regulatory_corpus:
//   1. embedQuery on a realistic Founder question
//   2. retrieveRelevantChunks → ranked chunk list
//   3. assembleContext → final prompt block
//
// Exits non-zero on any sanity check failure so CI / pre-Sprint checkpoints
// can gate on it. Designed to be run AFTER `pnpm ingest --all`.
//
// Usage (from packages/ai):
//   pnpm tsx scripts/test-rag.ts
//
// Optional override: pass a single query as the first positional arg.
//   pnpm tsx scripts/test-rag.ts "what licences does a Nigerian DAX need?"
// =============================================================================
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Same .env loader pattern as ingest.ts — must run before any module reads env.
(function loadRootEnv() {
  try {
    const envPath = resolve(process.cwd(), '../../.env');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (key && !(key in process.env)) process.env[key] = val;
    }
  } catch (err) {
    console.warn('[test-rag] could not load ../../.env:', (err as Error).message);
  }
})();

import { retrieveRelevantChunks } from '../src/rag/search.js';
import { assembleContext } from '../src/rag/context.js';
import { closePool } from '../src/rag/db.js';

const DEFAULT_QUERY =
  'What licences does a Nigerian crypto exchange need under ISA 2025?';

const MIN_EXPECTED_SIMILARITY = 0.5;
const MIN_EXPECTED_CHUNKS = 3;

interface SanityCheck {
  name: string;
  passed: boolean;
  detail: string;
}

async function main(): Promise<void> {
  const query = process.argv[2] ?? DEFAULT_QUERY;

  console.log('─'.repeat(72));
  console.log('RAG end-to-end smoke harness');
  console.log('─'.repeat(72));
  console.log(`query: "${query}"\n`);

  const t0 = Date.now();
  const chunks = await retrieveRelevantChunks(query, {
    topK: 8,
    jurisdictions: ['NG'],
    minSimilarity: 0.4,
  });
  const retrieveMs = Date.now() - t0;

  console.log(`retrieved ${chunks.length} chunks in ${retrieveMs}ms\n`);

  console.log('top results:');
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i]!;
    const preview = c.content.replace(/\s+/g, ' ').slice(0, 100);
    console.log(
      `  ${i + 1}. [${c.jurisdiction}] ${c.sourceDocument}` +
        (c.sectionReference ? ` § ${c.sectionReference}` : '') +
        ` (sim=${c.similarity.toFixed(3)} ranked=${c.rankedScore.toFixed(3)})`,
    );
    console.log(`     ${preview}…`);
  }
  console.log();

  const context = assembleContext(chunks, {
    productTypes: ['DAX'],
    targetMarkets: ['NG'],
    stage: 'building',
    readinessScore: 28,
  });

  console.log(
    `assembled context: ${context.chunksUsed} chunks, ${context.tokenCount} tokens\n`,
  );
  console.log('────── context preview (first 800 chars) ──────');
  console.log(context.text.slice(0, 800) + '\n…');
  console.log('──────\n');

  // Sanity checks — these gate the harness exit code.
  const checks: SanityCheck[] = [];

  checks.push({
    name: 'retrieved enough chunks',
    passed: chunks.length >= MIN_EXPECTED_CHUNKS,
    detail: `got ${chunks.length}, expected ≥ ${MIN_EXPECTED_CHUNKS}`,
  });

  const topSim = chunks[0]?.similarity ?? 0;
  checks.push({
    name: 'top result has reasonable similarity',
    passed: topSim >= MIN_EXPECTED_SIMILARITY,
    detail: `top sim=${topSim.toFixed(3)}, expected ≥ ${MIN_EXPECTED_SIMILARITY}`,
  });

  const hasNigeriaContent = chunks.some((c) => c.jurisdiction === 'NG');
  checks.push({
    name: 'Nigerian content present (NG-filter respected)',
    passed: hasNigeriaContent,
    detail: hasNigeriaContent ? 'yes' : 'no NG chunks returned',
  });

  // For an ISA 2025 question we expect ISA content among the top hits.
  const isaQuery = /ISA|securities|digital asset/i.test(query);
  if (isaQuery) {
    const hasIsa = chunks
      .slice(0, 5)
      .some((c) => /ISA|Investments and Securities/i.test(c.sourceDocument));
    checks.push({
      name: 'ISA 2025 appears in top 5 for ISA-flavoured query',
      passed: hasIsa,
      detail: hasIsa
        ? 'found ISA content'
        : 'no ISA 2025 chunk in top 5 — check ingestion',
    });
  }

  checks.push({
    name: 'context within 8K token budget',
    passed: context.tokenCount <= 8000,
    detail: `tokens=${context.tokenCount}`,
  });

  checks.push({
    name: 'user profile sentence appended',
    passed: context.text.includes('User context: Building a DAX product'),
    detail: 'looks for canonical profile sentence',
  });

  console.log('sanity checks:');
  let failed = 0;
  for (const check of checks) {
    const icon = check.passed ? '✔' : '✘';
    console.log(`  ${icon} ${check.name} — ${check.detail}`);
    if (!check.passed) failed++;
  }
  console.log();

  await closePool();

  if (failed > 0) {
    console.error(`${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('all checks passed');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('[test-rag] fatal:', err);
  await closePool().catch(() => {});
  process.exit(1);
});
