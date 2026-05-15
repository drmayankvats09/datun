// ═══════════════════════════════════════════════════════════════
// STORAGE PROVIDER INTERFACES — Task #46
//
// Provider-agnostic contracts for the media pipeline. Two separate
// concerns, two interfaces:
//
//   StorageProvider  → owns the origin object (R2 today, Cloudinary
//                       fallback adapter, future S3/GCS pluggable)
//   DeliveryProvider → owns CDN variants + transformations
//                       (Cloudflare Images today, future imgix etc.)
//
// Separation matters because the optimal vendor for raw object
// storage (cheap, predictable, S3-protocol) is rarely the optimal
// vendor for image delivery (CDN, AVIF/WebP, on-the-fly transforms).
// Splitting concerns lets us swap one without touching the other.
//
// Memory rule #21 + #27: every external dependency has a documented
// alternate adapter; production stack swap = one factory line change.
//
// @see r2.provider.ts                — primary StorageProvider impl
// @see cloudflare-images.provider.ts  — primary DeliveryProvider impl
// @see cloudinary.provider.ts         — fallback dual-role adapter
// ═══════════════════════════════════════════════════════════════

import type {
  MediaKind,
  MediaProvider,
  MediaVariant,
  MediaVariantUrls,
  R2StorageKey,
  CfImageId,
} from '@repo/shared';

// ─── Storage (origin) ─────────────────────────────────────────

/**
 * Result of a `createSignedUpload` call — handed back to the client so
 * it can PUT the encoded blob directly to the origin without ever
 * traversing the Datun server (zero server bandwidth cost).
 */
export interface SignedUploadDescriptor {
  /** The presigned URL the client will issue a PUT against. */
  readonly uploadUrl: string;
  /**
   * Headers the client MUST include on the PUT. Typically:
   *   - Content-Type matching the signed value
   *   - Optional content-length / SSE headers
   * The S3 protocol fails the request if any signed header is missing
   * or mismatched — fail-fast for integrity.
   */
  readonly requiredHeaders: Readonly<Record<string, string>>;
  /** Final object key inside the bucket (informational; tracked DB-side). */
  readonly storageKey: R2StorageKey;
  /** Bucket the object lands in (private vs public selection). */
  readonly bucket: string;
  /** Seconds until {@link uploadUrl} expires — TTL for the client UX. */
  readonly ttlSeconds: number;
  /** Identifies which adapter minted this URL (audit, debug, migration). */
  readonly provider: MediaProvider;
}

/**
 * Options for {@link StorageProvider.createSignedUpload}. The
 * orchestrator service computes these from the request body + the
 * per-MediaKind config in `@repo/shared`.
 */
export interface CreateSignedUploadOptions {
  readonly mediaId: string;
  readonly kind: MediaKind;
  readonly entityId: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly ttlSeconds: number;
}

/**
 * Origin-side adapter. The orchestrator never touches an SDK directly —
 * it depends on this interface, allowing R2 ↔ Cloudinary ↔ S3 ↔ GCS to
 * swap by changing the factory wiring in `media.service.ts`.
 */
export interface StorageProvider {
  /** Stable identifier — surfaces in DB rows + audit logs. */
  readonly name: MediaProvider;

  /** True when the env vars necessary for this adapter are populated. */
  isConfigured(): boolean;

  /**
   * Mint a single-use presigned upload URL for the client.
   *
   * Implementations MUST embed the content-length constraint so the
   * provider itself refuses oversize bodies (defense in depth on top of
   * the server-side Zod check).
   */
  createSignedUpload(options: CreateSignedUploadOptions): Promise<SignedUploadDescriptor>;

  /**
   * Stream the object back from origin as bytes. Used by the worker
   * pipeline to feed the image processor + moderation step. Throws
   * {@link StorageNotFoundError} when the key does not exist.
   */
  readObject(storageKey: R2StorageKey): Promise<Buffer>;

  /**
   * Replace the bytes at `storageKey` in-place. Worker uses this after
   * defensive EXIF-strip + re-encode to guarantee the stored bytes
   * exactly match what variants are derived from.
   */
  writeObject(storageKey: R2StorageKey, body: Buffer, options: WriteObjectOptions): Promise<void>;

  /**
   * Confirm the object exists with the expected size. Used during the
   * confirm-upload step before flipping `MediaAsset.status → UPLOADED`.
   * Returns null if the object is missing.
   */
  headObject(storageKey: R2StorageKey): Promise<HeadObjectResult | null>;

  /**
   * Issue a short-lived signed READ URL — only used for private kinds
   * (CONSULTATION_PHOTO, PRESCRIPTION_DOC, USER_AVATAR). Public kinds
   * resolve via the long-cache public hostname; this method is not
   * used for them.
   */
  getSignedReadUrl(storageKey: R2StorageKey, ttlSeconds: number): Promise<string>;

  /**
   * Hard-delete the object. Idempotent — missing key returns void.
   * Worker pipeline calls this when:
   *   - Moderation rejects the asset
   *   - DPDP DeletionRequest cascades through `media.service.deleteMedia`
   *   - Retention cron purges past `retentionExpiresAt`
   */
  deleteObject(storageKey: R2StorageKey): Promise<void>;
}

export interface WriteObjectOptions {
  readonly mimeType: string;
  readonly cacheControl?: string;
  readonly metadata?: Readonly<Record<string, string>>;
}

export interface HeadObjectResult {
  readonly sizeBytes: number;
  readonly mimeType: string | null;
  readonly etag: string | null;
  readonly lastModified: Date | null;
}

// ─── Delivery (CDN / variants) ────────────────────────────────

/**
 * Variant-generation outcome returned by the delivery provider after
 * ingesting the post-processed origin object.
 */
export interface DeliveryUploadResult {
  /** Opaque identifier the provider uses in delivery URLs. */
  readonly cfImageId: CfImageId;
  /** Concrete delivery URLs per variant. */
  readonly variants: MediaVariantUrls;
}

export interface UploadFromOriginOptions {
  readonly mediaId: string;
  readonly kind: MediaKind;
  /**
   * The origin from which the delivery layer fetches the bytes.
   * Either a long-cache public URL (public bucket) or a short-lived
   * signed URL (private bucket).
   */
  readonly originUrl: string;
  /**
   * If true, the variant URLs returned by the provider are signed and
   * scoped to a short TTL. Required for private clinical assets.
   */
  readonly requireSignedDelivery: boolean;
}

/**
 * Delivery-side adapter. Responsible for variant generation, format
 * negotiation (AVIF / WebP / JPEG), and CDN edge caching.
 */
export interface DeliveryProvider {
  readonly name: MediaProvider;

  isConfigured(): boolean;

  /**
   * Tell the delivery layer to pull the processed origin object and
   * pre-render the configured variants. Implementations should NOT
   * block on full variant pre-rendering — the first request per
   * variant generates lazily at the edge.
   */
  uploadFromOrigin(options: UploadFromOriginOptions): Promise<DeliveryUploadResult>;

  /**
   * Resolve the variant URLs for an already-ingested asset. Called by
   * the orchestrator on read paths to mint fresh URLs (signed or not)
   * without re-uploading.
   */
  getVariantUrls(
    cfImageId: CfImageId,
    kind: MediaKind,
    options?: GetVariantUrlsOptions,
  ): Promise<MediaVariantUrls>;

  /**
   * Build a URL for a single variant. Convenience helper used by the
   * `optimized-image` component loader on the FE; same logic the
   * `getVariantUrls` method composes per-variant.
   */
  buildVariantUrl(cfImageId: CfImageId, variant: MediaVariant): string;

  /**
   * Tear down the variants tied to an ingested asset. Idempotent.
   */
  deleteVariants(cfImageId: CfImageId): Promise<void>;
}

export interface GetVariantUrlsOptions {
  /** Generate signed (short-lived) URLs — required for private kinds. */
  readonly signed?: boolean;
  /** TTL in seconds when `signed === true`. Default: 300. */
  readonly ttlSeconds?: number;
}

// ─── Error taxonomy ───────────────────────────────────────────

/**
 * Thrown when a `readObject`/`headObject`/`deleteObject` targets a
 * missing key. Worker pipeline treats this as a permanent failure
 * (do not retry) — the asset is gone, mark MediaAsset FAILED.
 */
export class StorageNotFoundError extends Error {
  constructor(
    public readonly storageKey: string,
    public readonly cause?: unknown,
  ) {
    super(`Storage object not found: ${storageKey}`);
    this.name = 'StorageNotFoundError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Generic adapter-side failure (network, 5xx, permissions). Caller
 * decides whether to retry — typically yes on first occurrence.
 */
export class StorageProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: MediaProvider,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'StorageProviderError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DeliveryProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: MediaProvider,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'DeliveryProviderError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
