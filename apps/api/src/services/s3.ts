// =============================================================================
// Lazy AWS S3 client + signed-URL helpers.
//
// Used by the document analyser (S3-A1) for upload + (S3-B3) for signed-URL
// .docx draft downloads. We instantiate lazily because:
//   * Local unit tests should not require AWS_* env vars.
//   * Routes that don't touch S3 (the vast majority) shouldn't pay the
//     SDK boot cost.
//
// All Klarify document storage uses:
//   * server-side encryption (SSE-KMS if AWS_KMS_KEY_ARN is set, AES-256 otherwise)
//   * a uuid-only key path — original filename is NEVER persisted in S3
//     (CLAUDE.md §16 Rule 3: path traversal, filename PII)
//   * private ACL — access only via signed URLs minted by our API
// =============================================================================
import { Buffer } from 'node:buffer';
import { Readable } from 'node:stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    const region = process.env.AWS_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        'AWS S3 credentials missing — set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.',
      );
    }
    s3Client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return s3Client;
}

function getBucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error('AWS_S3_BUCKET is not set.');
  return bucket;
}

export interface PutObjectArgs {
  /** Pre-built S3 key. The caller is responsible for path safety. */
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
  /** Optional — defaults to the original filename for the Content-Disposition header. */
  downloadFilename?: string;
}

/**
 * Upload a buffer to S3 with SSE-KMS (preferred) or SSE-S3 (AES-256) encryption.
 * Returns the canonical key. Throws on any AWS error — the caller is
 * responsible for translating to a user-facing message.
 */
export async function putObject(args: PutObjectArgs): Promise<string> {
  const client = getS3Client();
  const bucket = getBucket();
  const kmsKey = process.env.AWS_KMS_KEY_ARN;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
      // Force private — never inherit the bucket default which could be
      // misconfigured. Klarify uploads are always private.
      ACL: 'private',
      // Encryption: prefer KMS if a CMK ARN is configured (per-object key
      // wrapping + audit trail in CloudTrail), fall back to AES-256.
      ServerSideEncryption: kmsKey ? 'aws:kms' : 'AES256',
      ...(kmsKey ? { SSEKMSKeyId: kmsKey } : {}),
      ...(args.downloadFilename
        ? {
            ContentDisposition: `attachment; filename="${sanitiseDownloadName(
              args.downloadFilename,
            )}"`,
          }
        : {}),
    }),
  );
  return args.key;
}

/** Read an object back into memory as a Buffer (used by the OCR service). */
export async function getObjectBuffer(key: string): Promise<Buffer> {
  const client = getS3Client();
  const bucket = getBucket();
  const result = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  if (!result.Body) {
    throw new Error(`S3 object ${key} returned no body.`);
  }
  const stream = result.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}

/**
 * Generate a short-lived signed GET URL. Used by the .docx draft exporter
 * (S3-B3) and by client downloads of analysed documents.
 *
 * `ttlSeconds` defaults to 3600 (1 hour) per CLAUDE.md §S3-B3 requirement.
 */
export async function getSignedDownloadUrl(
  key: string,
  ttlSeconds = 3600,
): Promise<string> {
  const client = getS3Client();
  const bucket = getBucket();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: ttlSeconds },
  );
}

/**
 * Strip characters from a download filename that would break the
 * Content-Disposition header (`"`, `\r`, `\n`). Does NOT URL-encode —
 * S3 will pass the header through verbatim and browsers handle the
 * quote-escaped form just fine.
 */
function sanitiseDownloadName(name: string): string {
  return name.replace(/[\r\n"]/g, '_');
}
