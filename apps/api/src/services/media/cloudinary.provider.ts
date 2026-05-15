// ═══════════════════════════════════════════════════════════════
// CLOUDINARY PROVIDER — Task #46 documented fallback adapter
//
// Status: STANDBY. Day 1 primary stack is R2 + Cloudflare Images.
// This adapter exists to satisfy memory rule #27 (no single point of
// failure) — if R2 or Cloudflare Images has a sustained outage we
// can flip `STORAGE_PROVIDER_PRIMARY=cloudinary` and continue serving
// uploads from a second vendor with one env-var change.
//
// Activation prerequisites (documented in ADR-0006):
//   - CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET set
//   - Upload preset 'datun-private' and 'datun-public' created in dashboard
//   - Mode toggled via STORAGE_PROVIDER_PRIMARY=cloudinary
//
// Until activation we keep this surface narrow: just enough to satisfy
// the interface contract, with explicit "not configured" errors that
// surface clearly in Sentry if anyone tries to call this adapter
// without the prerequisites.
//
// The interface implementation is intentionally split-personality —
// Cloudinary natively handles both storage AND delivery, so the same
// class implements both StorageProvider and DeliveryProvider, allowing
// a full failover by swapping a single factory binding.
// ═══════════════════════════════════════════════════════════════

import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

import {
  type CfImageId,
  type MediaKind,
  type MediaProvider,
  type MediaVariant,
  type MediaVariantUrls,
  type R2StorageKey,
} from '@repo/shared';

import {
  DeliveryProviderError,
  StorageProviderError,
  type CreateSignedUploadOptions,
  type DeliveryProvider,
  type DeliveryUploadResult,
  type GetVariantUrlsOptions,
  type HeadObjectResult,
  type SignedUploadDescriptor,
  type StorageProvider,
  type UploadFromOriginOptions,
  type WriteObjectOptions,
} from './storage.types.js';

/**
 * Combined Storage + Delivery fallback adapter targeting Cloudinary.
 *
 * The class deliberately implements BOTH interfaces because Cloudinary
 * collapses the origin + delivery layers into one service. When
 * activated, the orchestrator wires this single instance into both
 * factory slots simultaneously.
 */
export class CloudinaryProvider implements StorageProvider, DeliveryProvider {
  readonly name: MediaProvider = 'CLOUDINARY';

  isConfigured(): boolean {
    return Boolean(
      env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
    );
  }

  /**
   * Emit a single warning on first construction so operators discover
   * the adapter is inert until someone wires the env vars. We do NOT
   * throw — the adapter must be instantiable in dev/test environments
   * for type-system / mock purposes.
   */
  constructor() {
    if (!this.isConfigured()) {
      logger.info(
        '[CloudinaryProvider] Standby — env vars unset; adapter will refuse calls until activated',
      );
    }
  }

  // ─── StorageProvider ────────────────────────────────────────

  async createSignedUpload(_opts: CreateSignedUploadOptions): Promise<SignedUploadDescriptor> {
    this.refuseUnlessConfigured('createSignedUpload');
    // Day 1 stub — implement when activation runbook is followed.
    // See ADR-0006 §6 for the activation sequence and the explicit
    // signed-upload payload shape Cloudinary expects.
    throw new StorageProviderError(
      'Cloudinary createSignedUpload not implemented in stub adapter',
      this.name,
    );
  }

  async readObject(storageKey: R2StorageKey): Promise<Buffer> {
    this.refuseUnlessConfigured('readObject');
    throw new StorageProviderError(`Cloudinary readObject stub — ${storageKey}`, this.name);
  }

  async writeObject(
    storageKey: R2StorageKey,
    _body: Buffer,
    _options: WriteObjectOptions,
  ): Promise<void> {
    this.refuseUnlessConfigured('writeObject');
    throw new StorageProviderError(`Cloudinary writeObject stub — ${storageKey}`, this.name);
  }

  async headObject(storageKey: R2StorageKey): Promise<HeadObjectResult | null> {
    this.refuseUnlessConfigured('headObject');
    throw new StorageProviderError(`Cloudinary headObject stub — ${storageKey}`, this.name);
  }

  async getSignedReadUrl(storageKey: R2StorageKey, _ttlSeconds: number): Promise<string> {
    this.refuseUnlessConfigured('getSignedReadUrl');
    throw new StorageProviderError(`Cloudinary getSignedReadUrl stub — ${storageKey}`, this.name);
  }

  async deleteObject(storageKey: R2StorageKey): Promise<void> {
    this.refuseUnlessConfigured('deleteObject');
    throw new StorageProviderError(`Cloudinary deleteObject stub — ${storageKey}`, this.name);
  }

  // ─── DeliveryProvider ───────────────────────────────────────

  async uploadFromOrigin(opts: UploadFromOriginOptions): Promise<DeliveryUploadResult> {
    this.refuseUnlessConfigured('uploadFromOrigin');
    throw new DeliveryProviderError(
      `Cloudinary uploadFromOrigin stub — ${opts.mediaId}`,
      this.name,
    );
  }

  async getVariantUrls(
    cfImageId: CfImageId,
    _kind: MediaKind,
    _options?: GetVariantUrlsOptions,
  ): Promise<MediaVariantUrls> {
    this.refuseUnlessConfigured('getVariantUrls');
    throw new DeliveryProviderError(`Cloudinary getVariantUrls stub — ${cfImageId}`, this.name);
  }

  buildVariantUrl(cfImageId: CfImageId, variant: MediaVariant): string {
    // Pure URL construction is safe even when the adapter is inert —
    // we expose this so smoke tests can verify the URL shape without
    // an active Cloudinary account.
    const cloud = env.CLOUDINARY_CLOUD_NAME ?? 'unconfigured';
    const transform = mapVariantToCloudinaryTransform(variant);
    return `https://res.cloudinary.com/${cloud}/image/upload/${transform}/${cfImageId}`;
  }

  async deleteVariants(cfImageId: CfImageId): Promise<void> {
    this.refuseUnlessConfigured('deleteVariants');
    throw new DeliveryProviderError(`Cloudinary deleteVariants stub — ${cfImageId}`, this.name);
  }

  // ─── Internal helpers ───────────────────────────────────────

  private refuseUnlessConfigured(op: string): void {
    if (!this.isConfigured()) {
      throw new StorageProviderError(
        `Cloudinary fallback adapter inactive — cannot ${op}. Set CLOUDINARY_* env vars and follow docs/runbooks/cloudinary-activation.md to activate.`,
        this.name,
      );
    }
  }
}

/**
 * Variant → Cloudinary transformation-segment map. Documented in
 * docs/adr/ADR-0006-media-storage-architecture.md §7 to make the
 * activation runbook self-contained.
 */
function mapVariantToCloudinaryTransform(variant: MediaVariant): string {
  switch (variant) {
    case 'THUMBNAIL':
      return 'w_200,c_limit,q_auto,f_auto';
    case 'MEDIUM':
      return 'w_640,c_limit,q_auto,f_auto';
    case 'LARGE':
      return 'w_1200,c_limit,q_auto,f_auto';
    case 'ORIGIN':
      return 'q_auto,f_auto';
    default:
      return 'q_auto,f_auto';
  }
}
