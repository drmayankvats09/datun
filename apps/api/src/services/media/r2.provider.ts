// ═══════════════════════════════════════════════════════════════
// CLOUDFLARE R2 PROVIDER — Task #46 primary origin adapter
//
// R2 is S3-compatible. We reuse the AWS SDK clients that ship with
// `packages/db` (already in production for seed export). No new
// account, no new credentials format, no new SDK to learn.
//
// Two buckets are addressed per environment:
//   private  — clinical PHI (CONSULTATION_PHOTO, PRESCRIPTION_DOC,
//              USER_AVATAR). Signed URL access only. CDN cache off.
//   public   — marketing & content (CLINIC_*, DOCTOR_AVATAR,
//              BLOG_IMAGE, OG_IMAGE, BRAND_ASSET). Direct CDN.
//
// Selection is driven by `MEDIA_KIND_CONFIG[kind].accessClass`.
//
// Pattern: services/email/resend.provider.ts — same class shape,
//          isConfigured / explicit error wrapping / lazy client.
// ═══════════════════════════════════════════════════════════════

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  NoSuchKey,
  NotFound,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { Sentry } from '../../lib/sentry.js';

import { getMediaKindConfig, type R2StorageKey, type MediaProvider } from '@repo/shared';

import {
  StorageNotFoundError,
  StorageProviderError,
  type StorageProvider,
  type SignedUploadDescriptor,
  type CreateSignedUploadOptions,
  type HeadObjectResult,
  type WriteObjectOptions,
} from './storage.types.js';

/**
 * Type assertion helper — narrows an unknown error from the AWS SDK to
 * something we can classify. The SDK wraps responses in error classes
 * that don't always extend the same prototype across versions, so we
 * inspect the `name`/`Code` properties defensively.
 */
function isNotFoundError(err: unknown): boolean {
  if (err instanceof NoSuchKey || err instanceof NotFound) return true;
  const e = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  if (e?.name === 'NoSuchKey' || e?.name === 'NotFound') return true;
  if (e?.Code === 'NoSuchKey' || e?.Code === 'NotFound') return true;
  if (e?.$metadata?.httpStatusCode === 404) return true;
  return false;
}

export class R2Provider implements StorageProvider {
  readonly name: MediaProvider = 'R2';

  private clientCache: S3Client | null = null;

  isConfigured(): boolean {
    return Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);
  }

  /**
   * Lazily construct the S3 client pointed at the account's R2 endpoint.
   * R2 endpoints look like `https://<accountId>.r2.cloudflarestorage.com`.
   *
   * `region` is required by the SDK but ignored by R2 — we use 'auto'.
   * `forcePathStyle` is required for R2 compatibility (R2 does not
   * support virtual-hosted-style bucket addressing).
   */
  private getClient(): S3Client {
    if (this.clientCache) return this.clientCache;
    if (!this.isConfigured()) {
      throw new StorageProviderError(
        'R2 is not configured — set R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY',
        this.name,
      );
    }
    this.clientCache = new S3Client({
      region: 'auto',
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
    return this.clientCache;
  }

  /**
   * Choose the bucket name from the kind's access class. Centralised
   * here so no caller has to know about private/public split — they
   * just pass a `kind` and the adapter routes correctly.
   */
  private bucketFor(kind: CreateSignedUploadOptions['kind']): string {
    const cfg = getMediaKindConfig(kind);
    return cfg.accessClass === 'private' ? env.R2_BUCKET_PRIVATE : env.R2_BUCKET_PUBLIC;
  }

  /**
   * Compose the storage key for a freshly-created MediaAsset.
   *
   *   consultations/<consultationUuid>/<mediaUuid>.jpg
   *   doctors/<doctorUuid>/<mediaUuid>.jpg
   *   blog/<articleSlug-or-uuid>/<mediaUuid>.jpg
   *
   * Always derives from server-controlled inputs only — never user
   * filename — to defeat directory-traversal attempts.
   */
  private buildStorageKey(opts: CreateSignedUploadOptions): R2StorageKey {
    const cfg = getMediaKindConfig(opts.kind);
    const ext = mimeToExt(opts.mimeType);
    // Sanitize entityId: only [0-9a-f-] of canonical UUID chars allowed.
    const safeEntity = opts.entityId.replace(/[^0-9a-fA-F-]/g, '').slice(0, 36);
    const safeMediaId = opts.mediaId.replace(/[^0-9a-fA-F-]/g, '').slice(0, 36);
    return `${cfg.r2KeyPrefix}/${safeEntity}/${safeMediaId}.${ext}` as R2StorageKey;
  }

  async createSignedUpload(opts: CreateSignedUploadOptions): Promise<SignedUploadDescriptor> {
    const bucket = this.bucketFor(opts.kind);
    const storageKey = this.buildStorageKey(opts);

    // R2 enforces ContentLength on the signed PUT — any other body size
    // gets a 403 SignatureDoesNotMatch from R2 itself. This is our hard
    // physical guarantee that nobody can stuff a 500MB blob through a
    // signed URL meant for a 1MB consultation photo.
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      ContentType: opts.mimeType,
      ContentLength: opts.sizeBytes,
      Metadata: {
        // x-amz-meta-* prefixed by the SDK; readable by `headObject`.
        'datun-media-id': opts.mediaId,
        'datun-kind': opts.kind,
        'datun-entity-id': opts.entityId,
      },
    });

    try {
      const uploadUrl = await getSignedUrl(this.getClient(), command, {
        expiresIn: opts.ttlSeconds,
        // Allow only the headers we explicitly listed — anything else
        // sent by a buggy / malicious client triggers a signature
        // mismatch and R2 refuses the upload.
        signableHeaders: new Set(['host', 'content-type', 'content-length']),
      });

      return {
        uploadUrl,
        requiredHeaders: {
          'Content-Type': opts.mimeType,
          'Content-Length': String(opts.sizeBytes),
        },
        storageKey,
        bucket,
        ttlSeconds: opts.ttlSeconds,
        provider: this.name,
      };
    } catch (err) {
      Sentry.captureException(err, {
        tags: { service: 'media', adapter: 'r2', op: 'createSignedUpload' },
      });
      logger.error('[R2Provider] createSignedUpload failed', {
        mediaId: opts.mediaId,
        kind: opts.kind,
        error: (err as Error).message,
      });
      throw new StorageProviderError('R2 sign upload failed', this.name, err);
    }
  }

  async readObject(storageKey: R2StorageKey): Promise<Buffer> {
    // The bucket can be either private or public — we infer from the
    // key prefix because the orchestrator already knows the kind. But
    // for safety (callers may reuse old storage keys) we attempt the
    // private bucket first then fall back to public.
    const buckets = [env.R2_BUCKET_PRIVATE, env.R2_BUCKET_PUBLIC];

    let lastErr: unknown;
    for (const bucket of buckets) {
      try {
        const command = new GetObjectCommand({ Bucket: bucket, Key: storageKey });
        const response = await this.getClient().send(command);
        const body = response.Body;
        if (!body) {
          throw new StorageProviderError(`R2 returned empty body for ${storageKey}`, this.name);
        }
        // AWS SDK v3 returns a streaming body — use transformToByteArray
        // (Node 18+) and wrap in Buffer for downstream sharp / fetch.
        const bytes = await (
          body as { transformToByteArray: () => Promise<Uint8Array> }
        ).transformToByteArray();
        return Buffer.from(bytes);
      } catch (err) {
        if (isNotFoundError(err)) {
          lastErr = err;
          continue;
        }
        Sentry.captureException(err, {
          tags: { service: 'media', adapter: 'r2', op: 'readObject' },
        });
        throw new StorageProviderError(`R2 readObject failed for ${storageKey}`, this.name, err);
      }
    }
    throw new StorageNotFoundError(storageKey, lastErr);
  }

  async writeObject(
    storageKey: R2StorageKey,
    body: Buffer,
    options: WriteObjectOptions,
  ): Promise<void> {
    // Worker uses this for defensive re-encode. Bucket selection mirrors
    // readObject — try private first, then public. In practice the
    // orchestrator passes the same key it read from, so the bucket is
    // implicitly stable across the round-trip.
    const targetBucket = await this.findExistingBucket(storageKey, env.R2_BUCKET_PRIVATE);
    try {
      const command = new PutObjectCommand({
        Bucket: targetBucket,
        Key: storageKey,
        Body: body,
        ContentType: options.mimeType,
        CacheControl: options.cacheControl,
        Metadata: options.metadata,
      });
      await this.getClient().send(command);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { service: 'media', adapter: 'r2', op: 'writeObject' },
      });
      throw new StorageProviderError(`R2 writeObject failed for ${storageKey}`, this.name, err);
    }
  }

  async headObject(storageKey: R2StorageKey): Promise<HeadObjectResult | null> {
    const buckets = [env.R2_BUCKET_PRIVATE, env.R2_BUCKET_PUBLIC];
    for (const bucket of buckets) {
      try {
        const command = new HeadObjectCommand({ Bucket: bucket, Key: storageKey });
        const response = await this.getClient().send(command);
        return {
          sizeBytes: Number(response.ContentLength ?? 0),
          mimeType: response.ContentType ?? null,
          etag: response.ETag ?? null,
          lastModified: response.LastModified ?? null,
        };
      } catch (err) {
        if (isNotFoundError(err)) continue;
        Sentry.captureException(err, {
          tags: { service: 'media', adapter: 'r2', op: 'headObject' },
        });
        throw new StorageProviderError(`R2 headObject failed for ${storageKey}`, this.name, err);
      }
    }
    return null;
  }

  async getSignedReadUrl(storageKey: R2StorageKey, ttlSeconds: number): Promise<string> {
    // Signed reads are issued from the private bucket only. Public
    // bucket assets do not need signing — they resolve via the public
    // hostname configured on the bucket.
    const command = new GetObjectCommand({
      Bucket: env.R2_BUCKET_PRIVATE,
      Key: storageKey,
    });
    try {
      return await getSignedUrl(this.getClient(), command, { expiresIn: ttlSeconds });
    } catch (err) {
      Sentry.captureException(err, {
        tags: { service: 'media', adapter: 'r2', op: 'getSignedReadUrl' },
      });
      throw new StorageProviderError(
        `R2 getSignedReadUrl failed for ${storageKey}`,
        this.name,
        err,
      );
    }
  }

  async deleteObject(storageKey: R2StorageKey): Promise<void> {
    const buckets = [env.R2_BUCKET_PRIVATE, env.R2_BUCKET_PUBLIC];
    for (const bucket of buckets) {
      try {
        const command = new DeleteObjectCommand({ Bucket: bucket, Key: storageKey });
        await this.getClient().send(command);
      } catch (err) {
        if (isNotFoundError(err)) continue;
        Sentry.captureException(err, {
          tags: { service: 'media', adapter: 'r2', op: 'deleteObject' },
        });
        throw new StorageProviderError(`R2 deleteObject failed for ${storageKey}`, this.name, err);
      }
    }
  }

  /**
   * Best-effort bucket lookup — used by `writeObject` to ensure we put
   * the re-encoded bytes back into the same bucket the original landed
   * in. Falls back to the supplied default on miss.
   */
  private async findExistingBucket(
    storageKey: R2StorageKey,
    fallbackBucket: string,
  ): Promise<string> {
    for (const bucket of [env.R2_BUCKET_PRIVATE, env.R2_BUCKET_PUBLIC]) {
      try {
        await this.getClient().send(new HeadObjectCommand({ Bucket: bucket, Key: storageKey }));
        return bucket;
      } catch (err) {
        if (!isNotFoundError(err)) {
          // Surface non-404 errors — auth issues should not be silently
          // swallowed by bucket discovery.
          throw new StorageProviderError(
            `R2 bucket discovery failed for ${storageKey}`,
            this.name,
            err,
          );
        }
      }
    }
    return fallbackBucket;
  }
}

/**
 * Conservative MIME→extension map. The orchestrator already validated
 * that `mimeType` is in the input whitelist, so unknown values here
 * fall back to `.bin` rather than throwing — the upload still works,
 * just with a generic extension on the stored key.
 */
function mimeToExt(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    default:
      return 'bin';
  }
}
