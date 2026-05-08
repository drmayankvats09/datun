// ═══════════════════════════════════════════════════════════════
// S3 STREAMER — multipart upload of large export files
// ═══════════════════════════════════════════════════════════════

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';

export interface S3UploadOptions {
  readonly bucket: string;
  readonly key: string;
  readonly localPath: string;
  readonly contentType?: string;
  readonly metadata?: Readonly<Record<string, string>>;
  readonly storageClass?: 'STANDARD' | 'STANDARD_IA' | 'GLACIER' | 'DEEP_ARCHIVE';
  readonly serverSideEncryption?: boolean;
}

export interface S3UploadResult {
  readonly success: boolean;
  readonly bucket: string;
  readonly key: string;
  readonly bytesUploaded: number;
  readonly etag?: string;
  readonly durationMs: number;
  readonly error?: string;
}

/**
 * Streams a local file to S3 using multipart upload.
 * Requires `@aws-sdk/client-s3` + `@aws-sdk/lib-storage`.
 * If AWS SDK not installed, returns clear error so caller can shell out to `aws s3 cp`.
 */
export async function uploadToS3(opts: S3UploadOptions): Promise<S3UploadResult> {
  const start = Date.now();
  const fileSize = (await stat(opts.localPath)).size;

  try {
    const { S3Client } = await import('@aws-sdk/client-s3');
    const { Upload } = await import('@aws-sdk/lib-storage');
    const client = new S3Client({});
    const upload = new Upload({
      client,
      params: {
        Bucket: opts.bucket,
        Key: opts.key,
        Body: createReadStream(opts.localPath),
        ContentType: opts.contentType ?? 'application/octet-stream',
        Metadata: opts.metadata as Record<string, string> | undefined,
        StorageClass: opts.storageClass,
        ServerSideEncryption: opts.serverSideEncryption ? 'AES256' : undefined,
      },
      queueSize: 4,
      partSize: 1024 * 1024 * 8,
    });
    const result = (await upload.done()) as { ETag?: string };
    return {
      success: true,
      bucket: opts.bucket,
      key: opts.key,
      bytesUploaded: fileSize,
      etag: result.ETag,
      durationMs: Date.now() - start,
    };
  } catch (e) {
    return {
      success: false,
      bucket: opts.bucket,
      key: opts.key,
      bytesUploaded: 0,
      durationMs: Date.now() - start,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
