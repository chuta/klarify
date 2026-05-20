// Sprint 2 (RAG pipeline) — public surface for consumers in apps/api +
// apps/web. Internals (db.ts, ingest.ts) are intentionally NOT re-exported:
// callers should never touch the Postgres pool directly.
export { extractPdf, normaliseExtractedText, type ExtractedPdf } from './extract.js';
export {
  chunkText,
  detectSectionHeader,
  type ChunkRecord,
  type ChunkOptions,
} from './chunker.js';
export {
  parseFilename,
  tryParseFilename,
  type ParsedFilename,
  type JurisdictionCode,
} from './filename.js';
export {
  embedBatch,
  embedQuery,
  EMBEDDING_DIM,
  type EmbedInputType,
  type EmbedOptions,
  type EmbedResult,
} from './embed.js';
export {
  retrieveRelevantChunks,
  type SearchOptions,
  type RetrievedChunk,
} from './search.js';
export {
  assembleContext,
  type AssembledContext,
  type AssembleContextOptions,
  type UserProfileForContext,
} from './context.js';
