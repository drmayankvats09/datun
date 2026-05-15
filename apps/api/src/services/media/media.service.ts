// ═══════════════════════════════════════════════════════════════
// MEDIA SERVICE — Task #46 orchestrator (single entry point)
//
// State machine driven business logic for every upload:
//
//   INITIATED → upload-intent issued, signed URL handed to client
//   UPLOADED  → client confirmed direct R2 upload, job enqueued
//   PROCESSING → worker is running EXIF strip / scan / moderation
//   READY     → variants generated, asset safe to render
//   REJECTED  → moderation/scan refused; soft-deleted
//   FAILED    → permanent failure (corrupt bytes, provider error)
//
// Responsibilities:
//   - Provider-factory wiring (R2 ↔ Cloudinary swap via one env var)
//   - Per-MediaKind limits (5 photos per consultation, 1 avatar etc.)
//   - DPDP consent verification (CONSULTATION_PHOTO / PRESCRIPTION_DOC)
//   - Access control on reads (entity-based, role-based, public bypass)
//   - DTO assembly with fresh signed URLs per request
//   - Soft-delete + DPDP hard-purge cascade (R2 + CF Images + audit)
//
// Routes and the worker BOTH depend on this module — it is the single
// surface area where the storage adapters and the DB model meet.
//
// Pattern: Stripe internal `MediaService`, Linear `AttachmentManager`.
// ═══════════════════════════════════════════════════════════════

import { prisma, Prisma } from '@repo/db';
import type {
  MediaAsset as PrismaMediaAsset,
  MediaKind as PrismaMediaKind,
  MediaLifecycleStatus as PrismaMediaLifecycleStatus,
  MediaModerationStatus as PrismaMediaModerationStatus,
  MediaProvider as PrismaMediaProvider,
} from '@repo/db';

import {
  getMediaKindConfig,
  MEDIA_KINDS,
  SIGNED_READ_TTL_SECONDS,
  SIGNED_UPLOAD_TTL_SECONDS,
  MEDIA_ERROR_KEYS,
  type MediaAssetDTO,
  type MediaId,
  type MediaKind,
  type MediaVariantUrls,
  type Blurhash,
  type CfImageId,
  type R2StorageKey,
  makeMediaId,
} from '@repo/shared';

import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { Sentry } from '../../lib/sentry.js';
import {
  AppError,
  ConflictError,
  ExternalServiceError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../errors/index.js';

import { R2Provider } from './r2.provider.js';
import { CloudflareImagesProvider } from './cloudflare-images.provider.js';
import { CloudinaryProvider } from './cloudinary.provider.js';
import {
  StorageNotFoundError,
  type DeliveryProvider,
  type StorageProvider,
} from './storage.types.js';
import { processImageBuffer } from './image-processor.service.js';
import { assertImageOrThrow, MagicByteRefusal } from './magic-bytes.js';
import { moderateImage } from './moderation.service.js';

// ─── Provider factory (singleton, lazy) ────────────────────────

let storageProviderSingleton: StorageProvider | null = null;
let deliveryProviderSingleton: DeliveryProvider | null = null;

/**
 * Resolve the active StorageProvider based on `STORAGE_PROVIDER_PRIMARY`.
 * R2 is the day-one default; Cloudinary is the documented fallback adapter.
 * Memory rule #27: a single env var flip is the entire failover plan.
 */
function getStorageProvider(): StorageProvider {
  if (storageProviderSingleton) return storageProviderSingleton;
  if (env.STORAGE_PROVIDER_PRIMARY === 'cloudinary') {
    storageProviderSingleton = new CloudinaryProvider();
  } else {
    storageProviderSingleton = new R2Provider();
  }
  return storageProviderSingleton;
}

/**
 * Resolve the active DeliveryProvider. Cloudflare Images is the default;
 * during Cloudinary fallback, the same CloudinaryProvider instance covers
 * both Storage and Delivery responsibilities.
 */
function getDeliveryProvider(): DeliveryProvider {
  if (deliveryProviderSingleton) return deliveryProviderSingleton;
  if (env.STORAGE_PROVIDER_PRIMARY === 'cloudinary') {
    // CloudinaryProvider implements both interfaces — reuse instance.
    deliveryProviderSingleton = getStorageProvider() as unknown as DeliveryProvider;
  } else {
    deliveryProviderSingleton = new CloudflareImagesProvider();
  }
  return deliveryProviderSingleton;
}

/**
 * Reset cached singletons. Exposed only for tests — never call from app code.
 */
export function __resetProvidersForTest(): void {
  storageProviderSingleton = null;
  deliveryProviderSingleton = null;
}

// ─── Public API: requestUploadIntent ──────────────────────────

export interface RequestUploadIntentArgs {
  readonly uploaderId: string;
  readonly kind: MediaKind;
  readonly entityId: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly originalFilename?: string;
  readonly consentLogId?: string;
}

export interface UploadIntentResult {
  readonly mediaId: MediaId;
  readonly uploadUrl: string;
  readonly requiredHeaders: Readonly<Record<string, string>>;
  readonly storageKey: R2StorageKey;
  readonly ttlSeconds: number;
  readonly maxBytes: number;
  readonly kind: MediaKind;
}

/**
 * Step 1 of upload: client describes the intended file, we validate
 * limits + consent + entity ownership, create the MediaAsset row, and
 * hand back a presigned URL the client uses to PUT directly to R2.
 *
 * Throws on policy refusal — caller (router) renders 4xx via the
 * existing error middleware. No bytes traverse the API server.
 */
export async function requestUploadIntent(
  args: RequestUploadIntentArgs,
): Promise<UploadIntentResult> {
  const cfg = getMediaKindConfig(args.kind);

  // ── 1. Server-side cap on raw bytes (defense-in-depth on top of Zod) ──
  if (args.sizeBytes > cfg.maxRawBytes) {
    // Generic error — the friendly user copy lives in the FE i18n bundle.
    // We log the breach for ops, but the client is supposed to client-side
    // resize BEFORE asking for an upload URL. A breach here implies a
    // buggy / spoofed client.
    logger.warn('[Media] upload-intent oversized request', {
      uploaderId: args.uploaderId,
      kind: args.kind,
      sizeBytes: args.sizeBytes,
      maxRawBytes: cfg.maxRawBytes,
    });
    throw new ValidationError('Upload exceeds allowed size for this media kind', {
      sizeBytes: ['exceeds-kind-limit'],
    });
  }

  // ── 2. MIME whitelist ─────────────────────────────────────
  if (!(cfg.allowedInputMimes as readonly string[]).includes(args.mimeType)) {
    throw new ValidationError('Unsupported file type for this media kind', {
      mimeType: ['not-in-whitelist'],
    });
  }

  // ── 3. Consent required? ──────────────────────────────────
  // CONSULTATION_PHOTO + PRESCRIPTION_DOC must reference a ConsentLog
  // row whose purpose grants AI_CONSULTATION. DATA_TRAINING grants the
  // training-eligible flag on top.
  let trainingEligible = cfg.trainingEligibleByDefault;
  if (args.kind === 'CONSULTATION_PHOTO' || args.kind === 'PRESCRIPTION_DOC') {
    if (!args.consentLogId) {
      throw new ValidationError('consentLogId is required for clinical uploads', {
        consentLogId: ['required-for-kind'],
      });
    }
    const consent = await prisma.consentLog.findUnique({
      where: { id: args.consentLogId },
    });
    if (!consent) {
      throw new NotFoundError('ConsentLog', args.consentLogId);
    }
    if (consent.userId !== args.uploaderId) {
      throw new ForbiddenError('ConsentLog does not belong to uploader');
    }
    if (consent.status !== 'GRANTED') {
      throw new ForbiddenError('Referenced consent has been revoked');
    }
    if (consent.purpose !== 'AI_CONSULTATION' && consent.purpose !== 'DATA_TRAINING') {
      throw new ForbiddenError('Consent purpose does not authorize clinical upload');
    }
    if (consent.purpose === 'DATA_TRAINING') {
      trainingEligible = true;
    }
  }

  // ── 4. Per-entity active cap ──────────────────────────────
  await assertWithinEntityLimit({
    kind: args.kind,
    entityId: args.entityId,
  });

  // ── 5. Compute retention horizon if configured ────────────
  const retentionExpiresAt = cfg.retentionDays
    ? new Date(Date.now() + cfg.retentionDays * 24 * 60 * 60 * 1000)
    : null;

  // ── 6. Create MediaAsset row (INITIATED) ──────────────────
  // We pre-create the row so the worker pipeline always has a stable
  // anchor even if the client never confirms — orphans are GC'd by the
  // retention cron.
  const created = await prisma.mediaAsset.create({
    data: {
      kind: args.kind as PrismaMediaKind,
      provider: provider2PrismaEnum(getStorageProvider().name),
      status: 'INITIATED' as PrismaMediaLifecycleStatus,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      entityType: args.kind, // legacy polymorphic anchor — kept for backward compat
      entityId: args.entityId,
      uploadedById: args.uploaderId,
      originalFilename: args.originalFilename ?? null,
      consentLogId: args.consentLogId ?? null,
      trainingEligible,
      retentionExpiresAt,
      // placeholders until upload confirms — populated by confirmUpload + worker:
      storageKey: '',
      publicUrl: '',
    },
    select: { id: true },
  });

  // ── 7. Mint signed upload URL ─────────────────────────────
  const storage = getStorageProvider();
  let descriptor;
  try {
    descriptor = await storage.createSignedUpload({
      mediaId: created.id,
      kind: args.kind,
      entityId: args.entityId,
      mimeType: args.mimeType,
      sizeBytes: args.sizeBytes,
      ttlSeconds: env.MEDIA_SIGNED_UPLOAD_TTL_SECONDS ?? SIGNED_UPLOAD_TTL_SECONDS,
    });
  } catch (err) {
    // Roll back the row — keeping a half-initialised INITIATED row with
    // no signed URL would be ambiguous. The retention cron would clean
    // it eventually, but loud failure is preferable to silent garbage.
    await prisma.mediaAsset.delete({ where: { id: created.id } }).catch(() => undefined);
    throw new ExternalServiceError(
      'Storage',
      `Failed to mint signed upload URL: ${(err as Error).message}`,
    );
  }

  // ── 8. Persist resolved storage key on the row ────────────
  await prisma.mediaAsset.update({
    where: { id: created.id },
    data: {
      storageKey: descriptor.storageKey,
      publicUrl: '',
    },
  });

  logger.info('[Media] upload-intent issued', {
    mediaId: created.id,
    kind: args.kind,
    uploaderId: args.uploaderId,
    entityId: args.entityId,
    sizeBytes: args.sizeBytes,
  });

  return {
    mediaId: makeMediaId(created.id),
    uploadUrl: descriptor.uploadUrl,
    requiredHeaders: descriptor.requiredHeaders,
    storageKey: descriptor.storageKey,
    ttlSeconds: descriptor.ttlSeconds,
    maxBytes: cfg.maxOutputBytes,
    kind: args.kind,
  };
}

// ─── Public API: confirmUpload ────────────────────────────────

export interface ConfirmUploadArgs {
  readonly mediaId: string;
  readonly uploaderId: string;
  readonly finalSizeBytes: number;
  readonly width: number;
  readonly height: number;
  readonly blurhash: Blurhash;
  readonly sha256: string;
}

/**
 * Step 2 of upload: client tells us "I PUT the bytes". We verify R2
 * actually has the object, transition INITIATED → UPLOADED, then
 * enqueue the worker job. The worker is responsible for everything
 * heavy (EXIF strip, moderation, variants).
 */
export async function confirmUpload(args: ConfirmUploadArgs): Promise<MediaAssetDTO> {
  const row = await loadMediaOrThrow(args.mediaId);

  if (row.uploadedById !== args.uploaderId) {
    throw new ForbiddenError('Only the uploader can confirm this media');
  }
  if (row.status !== 'INITIATED') {
    throw new ConflictError(`Cannot confirm media in state ${row.status}`);
  }

  // ── Verify R2 has the object the client says it pushed ────
  const storage = getStorageProvider();
  const head = await storage.headObject(row.storageKey as R2StorageKey);
  if (!head) {
    throw new ConflictError('R2 object not found — client did not complete the upload');
  }
  // Bytes count tolerance: small (≤512B) — gzip / content-encoding can shift it.
  if (Math.abs(head.sizeBytes - args.finalSizeBytes) > 512) {
    Sentry.captureMessage('Confirm-upload byte-count mismatch', {
      level: 'warning',
      extra: {
        mediaId: args.mediaId,
        headSize: head.sizeBytes,
        clientReported: args.finalSizeBytes,
      },
    });
  }

  const updated = await prisma.mediaAsset.update({
    where: { id: args.mediaId },
    data: {
      status: 'UPLOADED' as PrismaMediaLifecycleStatus,
      sizeBytes: head.sizeBytes,
      width: args.width,
      height: args.height,
      blurhash: args.blurhash,
      checksum: args.sha256,
    },
  });

  // ── Enqueue processing — late-bound import to avoid circular dep ──
  // queue/producers.ts → media.service.ts cycle is prevented by this
  // dynamic import; producer module never imports the service back.
  const { enqueueMediaProcessing } = await import('../../lib/queue/producers.js');
  await enqueueMediaProcessing({ mediaId: args.mediaId, kind: row.kind });

  logger.info('[Media] upload confirmed, processing queued', {
    mediaId: args.mediaId,
    sizeBytes: head.sizeBytes,
    uploaderId: args.uploaderId,
  });

  return await toMediaAssetDTO(updated);
}

// ─── Public API: processMedia (worker entry point) ─────────────

/**
 * Worker pipeline entry. Pulls the origin from R2, runs the defensive
 * chain (magic bytes → image-processor → moderation), uploads to the
 * delivery provider, and transitions the row to READY/REJECTED/FAILED.
 *
 * Idempotent — re-running on a row that already reached READY exits
 * without side effects.
 */
export async function processMedia(mediaId: string): Promise<void> {
  const row = await loadMediaOrThrow(mediaId);
  if (row.status === 'READY' || row.status === 'REJECTED' || row.status === 'FAILED') {
    logger.info('[Media] processMedia skipped — already terminal', {
      mediaId,
      status: row.status,
    });
    return;
  }

  await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: { status: 'PROCESSING' as PrismaMediaLifecycleStatus },
  });

  const storage = getStorageProvider();
  const delivery = getDeliveryProvider();
  const cfg = getMediaKindConfig(row.kind);

  let bytes: Buffer;
  try {
    bytes = await storage.readObject(row.storageKey as R2StorageKey);
  } catch (err) {
    if (err instanceof StorageNotFoundError) {
      return await markFailed(mediaId, 'origin-missing');
    }
    Sentry.captureException(err, { tags: { service: 'media', op: 'processMedia.read' } });
    throw err;
  }

  // ── Magic-byte gate ───────────────────────────────────────
  try {
    await assertImageOrThrow(bytes);
  } catch (err) {
    if (err instanceof MagicByteRefusal) {
      logger.warn('[Media] magic-byte refusal', {
        mediaId,
        errorKey: err.errorKey,
        detected: err.detected,
      });
      return await markRejected(mediaId, err.errorKey, err.detected);
    }
    throw err;
  }

  // ── Defensive image hygiene ──────────────────────────────
  const processed = await processImageBuffer(bytes, {
    kind: row.kind,
    claimedWidth: row.width ?? 0,
    claimedHeight: row.height ?? 0,
  });
  if (processed.shouldRewriteOrigin) {
    await storage.writeObject(row.storageKey as R2StorageKey, processed.bytes, {
      mimeType: processed.mimeType,
      cacheControl: cfg.accessClass === 'public' ? 'public, max-age=31536000' : 'private, no-cache',
    });
  }

  // ── Moderation (skip when not required by kind config) ────
  let moderationStatus: PrismaMediaModerationStatus = 'APPROVED';
  let moderationScore = 1;
  let moderationFlags: Prisma.InputJsonValue | null = null;
  if (cfg.requiresModeration) {
    const moderation = await moderateImage({
      mediaId,
      kind: row.kind,
      imageBase64: processed.bytes.toString('base64'),
      mimeType: processed.mimeType,
    });
    moderationStatus = moderation.status as PrismaMediaModerationStatus;
    moderationScore = moderation.confidence;
    moderationFlags = {
      reasoning: moderation.reasoning,
      category: moderation.category ?? null,
      model: moderation.model,
    };
    if (moderation.status === 'REJECTED') {
      await storage.deleteObject(row.storageKey as R2StorageKey).catch(() => undefined);
      return await markRejectedModeration(mediaId, moderationScore, moderationFlags);
    }
  }

  // ── Upload origin to delivery layer for variant generation ─
  // CF Images needs a fetchable URL. For private buckets we hand it
  // a short-lived signed read URL; for public buckets we use the
  // permanent public hostname (configured in env).
  const originUrl = await buildOriginUrlForDelivery({
    storageKey: row.storageKey as R2StorageKey,
    accessClass: cfg.accessClass,
  });
  const delivered = await delivery.uploadFromOrigin({
    mediaId,
    kind: row.kind,
    originUrl,
    requireSignedDelivery: cfg.accessClass === 'private',
  });

  // ── Persist terminal READY state ──────────────────────────
  await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: {
      status: 'READY' as PrismaMediaLifecycleStatus,
      processedAt: new Date(),
      width: processed.width,
      height: processed.height,
      blurhash: processed.blurhash,
      exifStripped: processed.exifStripped,
      cfImageId: delivered.cfImageId,
      variants: delivered.variants as Prisma.InputJsonValue,
      moderationStatus,
      moderationScore,
      moderationFlags: moderationFlags ?? Prisma.JsonNull,
      scanStatus: 'CLEAN',
      publicUrl: delivered.variants.LARGE ?? delivered.variants.MEDIUM ?? '',
    },
  });
  logger.info('[Media] processMedia complete', { mediaId });
}

// ─── Public API: getMediaAsset (read) ──────────────────────────

export interface GetMediaAssetOptions {
  /** When omitted the request is treated as anonymous (public kinds only). */
  readonly requesterId?: string;
}

export async function getMediaAsset(
  mediaId: string,
  options: GetMediaAssetOptions = {},
): Promise<MediaAssetDTO> {
  const row = await loadMediaOrThrow(mediaId);
  await assertReadAccess(row, options.requesterId);
  return await toMediaAssetDTO(row);
}

// ─── Public API: deleteMedia (DPDP-aware cascade) ──────────────

export interface DeleteMediaArgs {
  readonly mediaId: string;
  readonly requesterId: string;
  readonly reason: string;
  readonly hardPurge: boolean;
  readonly userAgent?: string;
  readonly ipAddress?: string;
}

export async function deleteMedia(args: DeleteMediaArgs): Promise<void> {
  const row = await loadMediaOrThrow(args.mediaId);

  if (row.deletedAt) {
    // Idempotent — already soft-deleted; nothing else to do.
    return;
  }
  if (row.uploadedById !== args.requesterId) {
    // Could also be admin — let admin routes call this with a force flag
    // wrapper (out of scope for Task #46 v1).
    throw new ForbiddenError('Only the uploader can delete this media');
  }

  // ── Tear down delivery variants first (fastest), then origin ──
  const delivery = getDeliveryProvider();
  const storage = getStorageProvider();
  if (row.cfImageId) {
    await delivery.deleteVariants(row.cfImageId as CfImageId).catch((err) => {
      logger.error('[Media] delivery delete failed (soft-continuing)', {
        mediaId: args.mediaId,
        error: (err as Error).message,
      });
    });
  }
  if (args.hardPurge) {
    await storage.deleteObject(row.storageKey as R2StorageKey).catch((err) => {
      logger.error('[Media] origin delete failed (soft-continuing)', {
        mediaId: args.mediaId,
        error: (err as Error).message,
      });
    });
  }

  // ── Soft-delete DB row + audit log ────────────────────────
  await prisma.$transaction([
    prisma.mediaAsset.update({
      where: { id: args.mediaId },
      data: { deletedAt: new Date(), status: 'REJECTED' as PrismaMediaLifecycleStatus },
    }),
    prisma.auditLog.create({
      data: {
        userId: args.requesterId,
        action: args.hardPurge ? 'media.hard_delete' : 'media.soft_delete',
        entityType: 'MediaAsset',
        entityId: args.mediaId,
        ipAddress: args.ipAddress ?? null,
        userAgent: args.userAgent ?? null,
        metadata: {
          reason: args.reason.slice(0, 500),
          kind: row.kind,
          hardPurge: args.hardPurge,
        },
      },
    }),
  ]);

  logger.info('[Media] deleted', {
    mediaId: args.mediaId,
    hardPurge: args.hardPurge,
    by: args.requesterId,
  });
}

// ─── Internal helpers ────────────────────────────────────────

async function assertWithinEntityLimit(args: { kind: MediaKind; entityId: string }): Promise<void> {
  const cfg = getMediaKindConfig(args.kind);
  if (cfg.limits.perEntityActive === Number.POSITIVE_INFINITY) return;

  const activeCount = await prisma.mediaAsset.count({
    where: {
      kind: args.kind as PrismaMediaKind,
      entityId: args.entityId,
      deletedAt: null,
      status: { in: ['INITIATED', 'UPLOADED', 'PROCESSING', 'READY'] },
    },
  });
  if (activeCount >= cfg.limits.perEntityActive) {
    throw new AppError(
      `Maximum ${cfg.limits.perEntityActive} active items for this ${args.kind.toLowerCase()}.`,
      409,
      'MEDIA_ENTITY_LIMIT_REACHED',
    );
  }
}

async function loadMediaOrThrow(mediaId: string): Promise<PrismaMediaAsset> {
  const row = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
  if (!row) throw new NotFoundError('MediaAsset', mediaId);
  return row;
}

async function assertReadAccess(
  row: PrismaMediaAsset,
  requesterId: string | undefined,
): Promise<void> {
  const cfg = getMediaKindConfig(row.kind as MediaKind);

  // Public kinds resolve via permanent CDN URLs and need no auth.
  if (cfg.accessClass === 'public') return;

  // Soft-deleted private rows are forbidden regardless of identity.
  if (row.deletedAt) {
    throw new NotFoundError('MediaAsset', row.id);
  }

  if (!requesterId) {
    throw new ForbiddenError('Authentication required for this media');
  }

  // Uploader always has access.
  if (row.uploadedById === requesterId) return;

  // CONSULTATION_PHOTO / PRESCRIPTION_DOC: only the consultation's user
  // (entityId === consultation.id, consultation.userId === requester).
  if (row.kind === 'CONSULTATION_PHOTO' || row.kind === 'PRESCRIPTION_DOC') {
    const consultation = await prisma.consultation.findUnique({
      where: { id: row.entityId },
      select: { userId: true },
    });
    if (consultation?.userId === requesterId) return;
  }

  // Otherwise refuse.
  throw new ForbiddenError('Insufficient permissions to view this media');
}

async function toMediaAssetDTO(row: PrismaMediaAsset): Promise<MediaAssetDTO> {
  const cfg = getMediaKindConfig(row.kind as MediaKind);
  const delivery = getDeliveryProvider();

  let variants: MediaVariantUrls = {};
  if (row.cfImageId && delivery.isConfigured()) {
    try {
      variants = await delivery.getVariantUrls(row.cfImageId as CfImageId, row.kind as MediaKind, {
        signed: cfg.accessClass === 'private',
        ttlSeconds: env.MEDIA_SIGNED_READ_TTL_SECONDS ?? SIGNED_READ_TTL_SECONDS,
      });
    } catch (err) {
      logger.warn('[Media] delivery getVariantUrls failed', {
        mediaId: row.id,
        error: (err as Error).message,
      });
    }
  } else if (typeof row.variants === 'object' && row.variants !== null) {
    variants = row.variants as unknown as MediaVariantUrls;
  }

  return {
    id: makeMediaId(row.id),
    kind: row.kind as MediaKind,
    accessClass: cfg.accessClass,
    mimeType: row.mimeType,
    width: row.width ?? null,
    height: row.height ?? null,
    sizeBytes: row.sizeBytes ?? null,
    blurhash: (row.blurhash ?? null) as Blurhash | null,
    variants,
    status: row.status as MediaAssetDTO['status'],
    moderation: row.moderationStatus as MediaAssetDTO['moderation'],
    createdAt: row.createdAt.toISOString(),
    processedAt: row.processedAt?.toISOString() ?? null,
  };
}

async function buildOriginUrlForDelivery(args: {
  storageKey: R2StorageKey;
  accessClass: 'private' | 'public';
}): Promise<string> {
  if (args.accessClass === 'public' && env.R2_PUBLIC_HOSTNAME) {
    // Public bucket exposed at a custom domain (e.g., media.datunai.com).
    return `https://${env.R2_PUBLIC_HOSTNAME}/${args.storageKey}`;
  }
  // Private bucket (or no public hostname set) — issue a signed read URL.
  const storage = getStorageProvider();
  return await storage.getSignedReadUrl(args.storageKey, 600); // 10 min for ingest
}

async function markFailed(mediaId: string, reason: string): Promise<void> {
  await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: {
      status: 'FAILED' as PrismaMediaLifecycleStatus,
      processingError: reason.slice(0, 500),
      processedAt: new Date(),
    },
  });
}

async function markRejected(
  mediaId: string,
  errorKey: string,
  detected: string | null,
): Promise<void> {
  await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: {
      status: 'REJECTED' as PrismaMediaLifecycleStatus,
      moderationStatus: 'REJECTED' as PrismaMediaModerationStatus,
      moderationFlags: { errorKey, detected } as Prisma.InputJsonValue,
      processedAt: new Date(),
    },
  });
}

async function markRejectedModeration(
  mediaId: string,
  score: number,
  flags: Prisma.InputJsonValue | null,
): Promise<void> {
  await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: {
      status: 'REJECTED' as PrismaMediaLifecycleStatus,
      moderationStatus: 'REJECTED' as PrismaMediaModerationStatus,
      moderationScore: score,
      moderationFlags: flags ?? Prisma.JsonNull,
      processedAt: new Date(),
    },
  });
}

function provider2PrismaEnum(name: string): PrismaMediaProvider {
  // Map the StorageProvider.name string into Prisma's enum. Defensive
  // fallback to R2 — should never trigger because provider names are
  // closed enum-like in our codebase.
  if (name === 'CLOUDFLARE_IMAGES') return 'CLOUDFLARE_IMAGES' as PrismaMediaProvider;
  if (name === 'CLOUDINARY') return 'CLOUDINARY' as PrismaMediaProvider;
  return 'R2' as PrismaMediaProvider;
}

// Re-export the MEDIA_KINDS shape — router uses it for the @repo/db's
// untyped enum mirror at runtime when building error responses.
export { MEDIA_KINDS };

// Re-export error key map for the router (friendly i18n redirects).
export { MEDIA_ERROR_KEYS };
