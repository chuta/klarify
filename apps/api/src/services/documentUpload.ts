// =============================================================================
// Document upload service (CLAUDE.md S3-A1).
//
// Validates an uploaded regulatory document, writes the bytes to S3 with
// server-side encryption, and persists an `uploaded_documents` row in the
// `pending` state — ready for the analysis queue to advance.
//
// SECURITY (CLAUDE.md §16 Rule 3 — RLS + secure storage):
//   * Filename is treated as untrusted user input. We accept a sanitised
//     copy for display purposes but NEVER use it as part of the S3 key.
//     The S3 key is `{orgId}/{userId}/{uuid}.{safeExt}` — path-traversal
//     attempts (`../`, NUL bytes, leading slashes) are rejected at the
//     validation step before any I/O happens.
//   * File type is constrained to the whitelist below; the magic-bytes
//     check is delegated to S3 + downstream OCR (pdf-parse / Textract)
//     because both produce useful errors on type mismatch.
//   * Size is hard-capped at 10 MB.
// =============================================================================
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { putObject } from './s3.js';

/** Files we accept for analysis. Anything else → 415. */
export const ALLOWED_MIME_TYPES = new Set<string>([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

/** Extension by mime (used to build the safe S3 key). */
const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

export class DocumentUploadError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_FILENAME'
      | 'INVALID_FILE_TYPE'
      | 'FILE_TOO_LARGE'
      | 'FILE_EMPTY'
      | 'NO_ORG',
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'DocumentUploadError';
  }
}

export interface UploadDocumentInput {
  userId: string;
  orgId: string;
  /** User-supplied filename — sanitised before storage. */
  originalFilename: string;
  /** MIME type as detected from the multipart upload. */
  contentType: string;
  /** File bytes — already buffered (S3-A1 spec is in-memory only, no disk). */
  bytes: Buffer;
}

export interface UploadDocumentResult {
  documentId: string;
  s3Key: string;
  /** Sanitised filename suitable for display. */
  displayFilename: string;
  status: 'pending';
}

/**
 * End-to-end upload path: validate → upload to S3 → persist row.
 *
 * Returns the document id so the caller can return 202 Accepted + a polling
 * URL. The analysis queue picks this up asynchronously.
 */
export async function uploadDocument(
  input: UploadDocumentInput,
): Promise<UploadDocumentResult> {
  // ----- 1. Validate filename -----
  // Filename is untrusted. We need a sanitised copy for display but the S3
  // key must be uuid-only — never derived from the filename.
  const displayFilename = sanitiseDisplayFilename(input.originalFilename);
  if (!displayFilename) {
    throw new DocumentUploadError(
      'Please choose a file with a regular name (letters, numbers, dashes).',
      'INVALID_FILENAME',
      400,
    );
  }

  // ----- 2. Validate content type -----
  const mime = input.contentType.toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    throw new DocumentUploadError(
      'Klarify analyses PDF documents or images (JPG, PNG, WEBP). Please upload one of these formats.',
      'INVALID_FILE_TYPE',
      415,
    );
  }
  const ext = EXT_BY_MIME[mime];
  if (!ext) {
    throw new DocumentUploadError(
      'Klarify analyses PDF documents or images (JPG, PNG, WEBP). Please upload one of these formats.',
      'INVALID_FILE_TYPE',
      415,
    );
  }

  // ----- 3. Validate size -----
  if (input.bytes.length === 0) {
    throw new DocumentUploadError('The file is empty.', 'FILE_EMPTY', 400);
  }
  if (input.bytes.length > MAX_FILE_BYTES) {
    throw new DocumentUploadError(
      `File is too large. Maximum size is ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)} MB.`,
      'FILE_TOO_LARGE',
      413,
    );
  }

  // ----- 4. Build secure S3 key -----
  // `${orgId}/${userId}/${uuid}.${ext}` — never includes the original
  // filename. This is the critical line: every other defence is
  // belt-and-braces, but this guarantees S3 keys are not a vector for
  // PII leakage or path-traversal.
  const fileId = randomUUID();
  const s3Key = `${input.orgId}/${input.userId}/${fileId}.${ext}`;

  // ----- 5. Upload to S3 (encrypted) -----
  await putObject({
    key: s3Key,
    body: input.bytes,
    contentType: mime,
    downloadFilename: displayFilename,
  });

  // ----- 6. Persist `uploaded_documents` row -----
  const doc = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true)`,
      input.userId,
    );
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_org_id', $1, true)`,
      input.orgId,
    );
    return tx.uploadedDocument.create({
      data: {
        orgId: input.orgId,
        userId: input.userId,
        filename: displayFilename,
        originalFilename: displayFilename,
        fileType: mime,
        fileSize: input.bytes.length,
        s3Key,
        status: 'pending',
      },
      select: { id: true },
    });
  });

  return {
    documentId: doc.id,
    s3Key,
    displayFilename,
    status: 'pending',
  };
}

/**
 * Persist a document supplied as already-extracted text (the "paste text"
 * upload mode from CLAUDE.md S3-B1). Skips S3 entirely because there's
 * no file to store — just text.
 *
 * Returns a document id in the `extracting`-equivalent state but with
 * `ocr_method = 'paste'` and `extracted_text` already populated, so the
 * analysis queue can skip the OCR stage and jump straight to analysis.
 */
export async function createPastedDocument(args: {
  userId: string;
  orgId: string;
  text: string;
}): Promise<{ documentId: string }> {
  const cleaned = args.text.trim();
  if (cleaned.length < 100) {
    throw new DocumentUploadError(
      'Please paste at least 100 characters of the document text.',
      'FILE_EMPTY',
      400,
    );
  }
  if (cleaned.length > 200_000) {
    // Hard cap — Textract caps individual text blocks at 5 MB; we leave
    // headroom for the analyser's Claude context budget.
    throw new DocumentUploadError(
      'Pasted text is too long. Please trim to 200,000 characters or upload the original PDF instead.',
      'FILE_TOO_LARGE',
      413,
    );
  }

  const doc = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_user_id', $1, true)`,
      args.userId,
    );
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_org_id', $1, true)`,
      args.orgId,
    );
    return tx.uploadedDocument.create({
      data: {
        orgId: args.orgId,
        userId: args.userId,
        filename: `Pasted text (${new Date().toISOString().slice(0, 10)})`,
        originalFilename: null,
        fileType: 'text/plain',
        fileSize: cleaned.length,
        // No real file in S3 for paste-text; use a sentinel key.
        s3Key: `paste/${args.orgId}/${args.userId}/${randomUUID()}.txt`,
        extractedText: cleaned,
        ocrMethod: 'paste',
        ocrCompletedAt: new Date(),
        status: 'analysing', // ready for analysis stage
      },
      select: { id: true },
    });
  });

  return { documentId: doc.id };
}

/**
 * Reduce a user-supplied filename to a safe display string.
 *
 * Rules:
 *   * Strip any path components (`../`, `../../`, leading `/`, backslashes,
 *     NUL bytes). Filenames are not allowed to traverse.
 *   * Keep only `[A-Za-z0-9 ._-]` characters; everything else becomes `_`.
 *   * Collapse runs of whitespace + underscores.
 *   * Truncate to 120 characters so it fits the DB column comfortably.
 *
 * Returns `''` if the result is empty (caller should treat as invalid).
 */
export function sanitiseDisplayFilename(raw: string): string {
  if (typeof raw !== 'string') return '';
  // Strip control chars + NULs.
  // eslint-disable-next-line no-control-regex
  let s = raw.replace(/[\x00-\x1f\x7f]/g, '');
  // Strip path traversal markers + any directory prefixes — every safe
  // filename has no `/` or `\` in it.
  s = s.replace(/^.*[\\/]/, '');
  // Whitelist allowed chars.
  s = s.replace(/[^A-Za-z0-9 ._-]/g, '_');
  // Collapse runs.
  s = s.replace(/_{2,}/g, '_').replace(/\s{2,}/g, ' ').trim();
  // Strip leading dots so we never produce dotfiles like `.htaccess`.
  s = s.replace(/^\.+/, '');
  if (s.length > 120) s = s.slice(0, 120);
  return s;
}
