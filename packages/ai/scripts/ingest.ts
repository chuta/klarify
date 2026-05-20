#!/usr/bin/env node
// =============================================================================
// Corpus ingest CLI.
//
// Usage (from packages/ai):
//   pnpm ingest --file=NG_ISA_2025.pdf       # single file
//   pnpm ingest --all                        # everything in corpus/raw/
//   pnpm ingest --all --dry-run              # chunk only, no embedding/DB
//   pnpm ingest --file=NG_ISA_2025.pdf --dry-run
//
// --all walks corpus/raw/ in a deliberate order (CLAUDE.md §11 — the most
// canonical document, then Nigeria, then FATF, then African regional, then
// other). That way a partial run is still useful.
// =============================================================================
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Zero-dep .env loader, must run BEFORE we import anything that reads
// process.env (DATABASE_URL, VOYAGE_API_KEY, etc.).
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
    console.warn('[ingest] could not load ../../.env:', (err as Error).message);
  }
})();

import { ingestFile, type IngestResult } from '../src/rag/ingest.js';
import { closePool } from '../src/rag/db.js';
import { tryParseFilename } from '../src/rag/filename.js';

// Ingestion priority order — most-canonical first, then jurisdiction tier.
const JURISDICTION_PRIORITY: Record<string, number> = {
  REF: 0, // The Founder's Guide — always first.
  NG: 1,
  FATF: 2,
  GH: 3,
  KE: 3,
  MU: 3,
  ZA: 3,
  INTL: 4,
};

interface CliArgs {
  file: string | null;
  all: boolean;
  dryRun: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { file: null, all: false, dryRun: false };
  for (const raw of argv) {
    if (raw === '--all') args.all = true;
    else if (raw === '--dry-run') args.dryRun = true;
    else if (raw.startsWith('--file=')) args.file = raw.slice('--file='.length);
    else if (raw === '--help' || raw === '-h') {
      printUsage();
      process.exit(0);
    } else if (raw.startsWith('--')) {
      console.error(`unknown flag: ${raw}`);
      printUsage();
      process.exit(2);
    }
  }
  if (!args.file && !args.all) {
    console.error('error: must specify --file=<name.pdf> or --all');
    printUsage();
    process.exit(2);
  }
  return args;
}

function printUsage(): void {
  console.warn(
    `Usage:\n` +
      `  pnpm ingest --file=<name.pdf>     ingest a single PDF from corpus/raw/\n` +
      `  pnpm ingest --all                 ingest every PDF in corpus/raw/\n` +
      `  pnpm ingest --all --dry-run       chunk + count only, no embed/DB\n`,
  );
}

function corpusDir(): string {
  return resolve(process.cwd(), './corpus/raw');
}

function pickFiles(args: CliArgs): string[] {
  const dir = corpusDir();
  if (args.file) return [resolve(dir, args.file)];

  const all = readdirSync(dir)
    .filter((f) => f.endsWith('.pdf'))
    .map((f) => resolve(dir, f));

  return all.sort((a, b) => {
    const fa = a.split('/').pop() ?? a;
    const fb = b.split('/').pop() ?? b;
    const pa = tryParseFilename(fa);
    const pb = tryParseFilename(fb);
    const wa = pa ? (JURISDICTION_PRIORITY[pa.jurisdiction] ?? 99) : 99;
    const wb = pb ? (JURISDICTION_PRIORITY[pb.jurisdiction] ?? 99) : 99;
    if (wa !== wb) return wa - wb;
    return fa.localeCompare(fb);
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const files = pickFiles(args);

  console.warn(
    `[ingest] mode=${args.all ? 'all' : 'single'} ` +
      `count=${files.length} ` +
      `dry_run=${args.dryRun}\n`,
  );

  const results: IngestResult[] = [];
  const errors: Array<{ filename: string; message: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const path = files[i]!;
    const filename = path.split('/').pop() ?? path;
    console.warn(`[${i + 1}/${files.length}] ${filename}`);
    try {
      const result = await ingestFile(path, { dryRun: args.dryRun });
      results.push(result);
      console.warn(
        `  ✔ ${result.chunkCount} chunks, ${result.embeddingTokens.toLocaleString()} tokens, ` +
          `${(result.elapsedMs / 1000).toFixed(1)}s\n`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ filename, message });
      console.warn(`  ✘ FAILED: ${message}\n`);
    }
  }

  // Summary
  console.warn('─'.repeat(60));
  console.warn(`completed ${results.length} files`);
  if (errors.length > 0) {
    console.warn(`failed    ${errors.length} files`);
    for (const e of errors) console.warn(`  - ${e.filename}: ${e.message}`);
  }
  const totalChunks = results.reduce((s, r) => s + r.chunkCount, 0);
  const totalTokens = results.reduce((s, r) => s + r.embeddingTokens, 0);
  console.warn(`total chunks  ${totalChunks.toLocaleString()}`);
  console.warn(`total tokens  ${totalTokens.toLocaleString()} (embedding billing)`);

  await closePool();
  process.exit(errors.length > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('[ingest] fatal:', err);
  await closePool().catch(() => {});
  process.exit(1);
});
