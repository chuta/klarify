#!/usr/bin/env node
// =============================================================================
// Corpus integrity verifier — run after ingest or when auditing RAG data.
//
// Checks:
//   • DB: no poisoned "SEC Digital Asset Rules 2022" rows (MCR circular misfile)
//   • DB: NG_SEC_MCR_CIRCULAR_2026 is present with VASP MCR table content
//   • DB: no DAR-labelled source_document contains MCR circular sentinels
//   • disk: raw PDFs named NG_SEC_DAR_* must not contain Circular 26-1 text
//
// Usage (from packages/ai):
//   pnpm verify:corpus
//   pnpm verify:corpus --purge-dar-2022   # idempotent delete of poisoned rows
//   pnpm verify:corpus --disk-only        # skip DB checks (no DATABASE_URL)
// =============================================================================
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

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
    console.warn('[verify-corpus] could not load ../../.env:', (err as Error).message);
  }
})();

import { extractPdf } from '../src/rag/extract.js';
import { getPool, closePool } from '../src/rag/db.js';
import {
  contentHasDaxMcrThreshold,
  contentHasMcrCircularSentinel,
  MCR_SOURCE_DOCUMENT,
  MCR_SOURCE_FILE,
} from '../src/rag/corpusIntegrity.js';

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

function parseArgs(argv: string[]): { purgeDar2022: boolean; diskOnly: boolean } {
  return {
    purgeDar2022: argv.includes('--purge-dar-2022'),
    diskOnly: argv.includes('--disk-only'),
  };
}

async function purgePoisonedDar2022(): Promise<number> {
  const pool = getPool();
  const result = await pool.query(
    `DELETE FROM regulatory_corpus
      WHERE source_document = 'SEC Digital Asset Rules 2022'
         OR metadata->>'source_file' = 'NG_SEC_DAR_2022.pdf'`,
  );
  return result.rowCount ?? 0;
}

async function verifyDatabase(): Promise<CheckResult[]> {
  const pool = getPool();
  const checks: CheckResult[] = [];

  const dar2022 = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM regulatory_corpus
      WHERE source_document = 'SEC Digital Asset Rules 2022'
         OR metadata->>'source_file' = 'NG_SEC_DAR_2022.pdf'`,
  );
  const darCount = Number.parseInt(dar2022.rows[0]?.n ?? '0', 10);
  checks.push({
    name: 'no poisoned SEC Digital Asset Rules 2022 rows in DB',
    passed: darCount === 0,
    detail: darCount === 0 ? '0 rows' : `${darCount} row(s) still present — run --purge-dar-2022`,
  });

  const darWithMcr = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM regulatory_corpus
      WHERE source_document ILIKE 'SEC Digital Asset Rules%'
        AND (content ILIKE '%CIRCULAR Number 26-1%'
          OR content ILIKE '%REVISED MINIMUM CAPITAL (MC)%')`,
  );
  const crossCount = Number.parseInt(darWithMcr.rows[0]?.n ?? '0', 10);
  checks.push({
    name: 'no DAR-labelled chunks contain MCR circular text',
    passed: crossCount === 0,
    detail: crossCount === 0 ? 'clean' : `${crossCount} contaminated chunk(s)`,
  });

  const mcr = await pool.query<{ n: string; dax: string }>(
    `SELECT COUNT(*)::text AS n,
            COUNT(*) FILTER (
              WHERE content ILIKE '%Digital Assets Exchange (DAX)%'
                AND content ILIKE '%2.00 billion%'
            )::text AS dax
       FROM regulatory_corpus
      WHERE source_document = $1
         OR metadata->>'source_file' = $2`,
    [MCR_SOURCE_DOCUMENT, MCR_SOURCE_FILE],
  );
  const mcrChunks = Number.parseInt(mcr.rows[0]?.n ?? '0', 10);
  const mcrHasDax = Number.parseInt(mcr.rows[0]?.dax ?? '0', 10);
  checks.push({
    name: 'MCR circular ingested (NG_SEC_MCR_CIRCULAR_2026)',
    passed: mcrChunks >= 1,
    detail: `${mcrChunks} chunk(s) under "${MCR_SOURCE_DOCUMENT}"`,
  });
  checks.push({
    name: 'MCR circular contains DAX ₦2.00 billion revised threshold',
    passed: mcrHasDax >= 1,
    detail:
      mcrHasDax >= 1
        ? 'VASP table row found'
        : 'missing DAX 2.00 billion — re-ingest NG_SEC_MCR_CIRCULAR_2026.pdf',
  });

  return checks;
}

async function verifyDisk(): Promise<CheckResult[]> {
  const rawDir = resolve(process.cwd(), 'corpus/raw');
  const checks: CheckResult[] = [];

  if (!existsSync(rawDir)) {
    checks.push({
      name: 'corpus/raw directory exists',
      passed: false,
      detail: rawDir,
    });
    return checks;
  }

  const mcrPath = join(rawDir, MCR_SOURCE_FILE);
  checks.push({
    name: 'MCR circular PDF on disk',
    passed: existsSync(mcrPath),
    detail: existsSync(mcrPath) ? MCR_SOURCE_FILE : `missing ${MCR_SOURCE_FILE}`,
  });

  const pdfs = readdirSync(rawDir).filter((f) => f.endsWith('.pdf'));
  for (const filename of pdfs) {
    if (!/^NG_SEC_DAR_/i.test(filename)) continue;
    const absPath = join(rawDir, filename);
    try {
      const { text, pages } = await extractPdf(absPath);
      const poisoned = contentHasMcrCircularSentinel(text);
      checks.push({
        name: `disk: ${filename} is not the MCR circular`,
        passed: !poisoned,
        detail: poisoned
          ? `${pages} pages — contains Circular 26-1 text; replace with authentic DAR PDF`
          : `${pages} pages — OK`,
      });
    } catch (err) {
      checks.push({
        name: `disk: ${filename} readable`,
        passed: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return checks;
}

async function main(): Promise<void> {
  const { purgeDar2022, diskOnly } = parseArgs(process.argv.slice(2));

  console.log('─'.repeat(72));
  console.log('Klarify corpus integrity verifier');
  console.log('─'.repeat(72));

  if (purgeDar2022 && !diskOnly) {
    const deleted = await purgePoisonedDar2022();
    console.log(`purged ${deleted} poisoned DAR 2022 row(s)\n`);
  }

  const allChecks: CheckResult[] = [];

  if (!diskOnly) {
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set — use --disk-only or configure .env');
      process.exit(2);
    }
    allChecks.push(...(await verifyDatabase()));
  }

  allChecks.push(...(await verifyDisk()));

  console.log('checks:');
  let failed = 0;
  for (const check of allChecks) {
    const icon = check.passed ? '✔' : '✘';
    console.log(`  ${icon} ${check.name} — ${check.detail}`);
    if (!check.passed) failed++;
  }
  console.log();

  if (!diskOnly) await closePool();

  if (failed > 0) {
    console.error(`${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('all checks passed');
  process.exit(0);
}

main().catch(async (err) => {
  console.error('[verify-corpus] fatal:', err);
  await closePool().catch(() => {});
  process.exit(1);
});
