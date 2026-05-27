// US-008B — White paper upload (mirrors documentUpload.ts for white_paper_analyses).
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { Prisma } from '@prisma/client';
import type { WhitePaperLicenceCategory, WhitePaperSourceJurisdiction } from '@klarify/core';
import { prisma } from '../db.js';
import { putObject } from './s3.js';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_BYTES,
  sanitiseDisplayFilename,
} from './documentUpload.js';

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export class WhitePaperUploadError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_FILENAME'
      | 'INVALID_FILE_TYPE'
      | 'FILE_TOO_LARGE'
      | 'FILE_EMPTY'
      | 'INSUFFICIENT_TEXT',
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = 'WhitePaperUploadError';
  }
}

export interface WhitePaperMetadata {
  sourceJurisdiction: WhitePaperSourceJurisdiction;
  licenceCategorySought: WhitePaperLicenceCategory;
  existingSourceLicence?: string | null;
}

export async function uploadWhitePaper(args: {
  userId: string;
  orgId: string;
  originalFilename: string;
  contentType: string;
  bytes: Buffer;
  metadata: WhitePaperMetadata;
}): Promise<{ analysisId: string; status: 'pending' }> {
  const displayFilename = sanitiseDisplayFilename(args.originalFilename);
  if (!displayFilename) {
    throw new WhitePaperUploadError(
      'Please choose a file with a regular name (letters, numbers, dashes).',
      'INVALID_FILENAME',
      400,
    );
  }

  const mime = args.contentType.toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    throw new WhitePaperUploadError(
      'Klarify analyses PDF documents or images (JPG, PNG, WEBP).',
      'INVALID_FILE_TYPE',
      415,
    );
  }
  const ext = EXT_BY_MIME[mime];
  if (!ext) {
    throw new WhitePaperUploadError(
      'Klarify analyses PDF documents or images (JPG, PNG, WEBP).',
      'INVALID_FILE_TYPE',
      415,
    );
  }

  if (args.bytes.length === 0) {
    throw new WhitePaperUploadError('The file is empty.', 'FILE_EMPTY', 400);
  }
  if (args.bytes.length > MAX_FILE_BYTES) {
    throw new WhitePaperUploadError(
      `File is too large. Maximum size is ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)} MB.`,
      'FILE_TOO_LARGE',
      413,
    );
  }

  const fileId = randomUUID();
  const s3Key = `${args.orgId}/${args.userId}/whitepaper/${fileId}.${ext}`;

  await putObject({
    key: s3Key,
    body: args.bytes,
    contentType: mime,
    downloadFilename: displayFilename,
  });

  const row = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, true)`, args.userId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_org_id', $1, true)`, args.orgId);
    return tx.whitePaperAnalysis.create({
      data: {
        orgId: args.orgId,
        userId: args.userId,
        sourceJurisdiction: args.metadata.sourceJurisdiction,
        licenceCategorySought: args.metadata.licenceCategorySought,
        existingSourceLicence: args.metadata.existingSourceLicence ?? null,
        originalFilename: displayFilename,
        fileType: mime,
        fileSize: args.bytes.length,
        s3Key,
        extractedText: '',
        status: 'pending',
      },
      select: { id: true },
    });
  });

  return { analysisId: row.id, status: 'pending' };
}

export async function createPastedWhitePaper(args: {
  userId: string;
  orgId: string;
  text: string;
  metadata: WhitePaperMetadata;
}): Promise<{ analysisId: string }> {
  const cleaned = args.text.trim();
  if (cleaned.length < 1000) {
    throw new WhitePaperUploadError(
      'Please paste at least 1,000 characters of the white paper text.',
      'INSUFFICIENT_TEXT',
      422,
    );
  }
  if (cleaned.length > 200_000) {
    throw new WhitePaperUploadError(
      'Pasted text is too long. Please trim to 200,000 characters or upload the original PDF.',
      'FILE_TOO_LARGE',
      413,
    );
  }

  const row = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_user_id', $1, true)`, args.userId);
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_org_id', $1, true)`, args.orgId);
    return tx.whitePaperAnalysis.create({
      data: {
        orgId: args.orgId,
        userId: args.userId,
        sourceJurisdiction: args.metadata.sourceJurisdiction,
        licenceCategorySought: args.metadata.licenceCategorySought,
        existingSourceLicence: args.metadata.existingSourceLicence ?? null,
        originalFilename: `Pasted white paper (${new Date().toISOString().slice(0, 10)})`,
        fileType: 'text/plain',
        fileSize: cleaned.length,
        s3Key: null,
        extractedText: cleaned,
        ocrMethod: 'paste',
        ocrCompletedAt: new Date(),
        status: 'analysing',
      },
      select: { id: true },
    });
  });

  return { analysisId: row.id };
}
