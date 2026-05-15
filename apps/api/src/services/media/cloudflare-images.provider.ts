// ═══════════════════════════════════════════════════════════════
// CLOUDFLARE IMAGES PROVIDER — Task #46 delivery adapter
//
// Origin object lives in R2. Cloudflare Images is the variant
// renderer + CDN delivery layer in front of it. The two services
// communicate via a "URL upload" flow:
//
//   Worker → POST images/v1 { url: <R2 read URL>, metadata: {...} }
//   Cloudflare → fetches the bytes, stores them, returns imageId
//   Renderer → https://imagedelivery.net/<accountHash>/<imageId>/<variant>
//
// For private clinical assets we use signed delivery URLs (a hash
// suffix) and rely on Cloudflare's signing-key feature configured
// in the dashboard.
//
// Variants (`thumbnail`, `medium`, `large`) are configured ONCE in
// the Cloudflare dashboard per the runbook in docs/runbooks/
// cloudflare-setup.md. This module references them by name only.
//
// Pattern: services/whatsapp/meta.provider.ts (REST-only adapter)
// ═══════════════════════════════════════════════════════════════

import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { Sentry } from '../../lib/sentry.js';

import {
  MEDIA_VARIANTS,
  getMediaKindConfig,
  type CfImageId,
  type MediaKind,
  type MediaProvider,
  type MediaVariant,
  type MediaVariantUrls,
} from '@repo/shared';

import {
  DeliveryProviderError,
  type DeliveryProvider,
  type DeliveryUploadResult,
  type GetVariantUrlsOptions,
  type UploadFromOriginOptions,
} from './storage.types.js';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const DELIVERY_HOSTNAME = 'imagedelivery.net';

/**
 * Shape of the success branch of the Cloudflare Images REST envelope.
 *
 * @see https://developers.cloudflare.com/api/operations/cloudflare-images-upload-an-image-via-url
 */
interface CfImagesUploadResponse {
  readonly success: boolean;
  readonly errors: ReadonlyArray<{ code: number; message: string }>;
  readonly messages: ReadonlyArray<{ code: number; message: string }>;
  readonly result?: {
    readonly id: string;
    readonly filename: string;
    readonly uploaded: string;
    readonly requireSignedURLs: boolean;
    readonly variants: ReadonlyArray<string>;
  };
}

export class CloudflareImagesProvider implements DeliveryProvider {
  readonly name: MediaProvider = 'CLOUDFLARE_IMAGES';

  isConfigured(): boolean {
    return Boolean(
      env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_ACCOUNT_HASH && env.CLOUDFLARE_IMAGES_API_TOKEN,
    );
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new DeliveryProviderError(
        'Cloudflare Images is not configured — set CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_ACCOUNT_HASH / CLOUDFLARE_IMAGES_API_TOKEN',
        this.name,
      );
    }
  }

  /**
   * Ingest the object that already lives in R2. We use the URL upload
   * mode rather than streaming bytes through our backend — Cloudflare
   * does the byte transfer from R2 → its edge network directly. This
   * keeps our API server bandwidth at zero per upload.
   *
   * `requireSignedDelivery` flips the per-image flag so the renderer
   * refuses unsigned access. Required for private clinical kinds.
   */
  async uploadFromOrigin(opts: UploadFromOriginOptions): Promise<DeliveryUploadResult> {
    this.assertConfigured();
    const url = `${CF_API_BASE}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;

    // Cloudflare's URL-mode endpoint expects `multipart/form-data`.
    const form = new FormData();
    form.append('url', opts.originUrl);
    // `id` lets us namespace by our own UUID instead of CF's hash.
    // Using the mediaId here means cfImageId === mediaId in our DB,
    // simplifying every downstream URL build.
    form.append('id', opts.mediaId);
    form.append('requireSignedURLs', String(opts.requireSignedDelivery));
    form.append(
      'metadata',
      JSON.stringify({
        kind: opts.kind,
        mediaId: opts.mediaId,
        uploadedAt: new Date().toISOString(),
      }),
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_IMAGES_API_TOKEN}`,
        },
        body: form,
      });
    } catch (err) {
      Sentry.captureException(err, {
        tags: { service: 'media', adapter: 'cf-images', op: 'uploadFromOrigin' },
      });
      throw new DeliveryProviderError('Cloudflare Images network failure', this.name, err);
    }

    let payload: CfImagesUploadResponse;
    try {
      payload = (await response.json()) as CfImagesUploadResponse;
    } catch (err) {
      throw new DeliveryProviderError(
        `Cloudflare Images returned non-JSON response (status ${response.status})`,
        this.name,
        err,
      );
    }

    if (!response.ok || !payload.success || !payload.result) {
      const summary = (payload.errors ?? []).map((e) => `${e.code}: ${e.message}`).join('; ');
      logger.error('[CloudflareImagesProvider] upload failed', {
        mediaId: opts.mediaId,
        status: response.status,
        errors: summary,
      });
      Sentry.captureMessage('Cloudflare Images upload failed', {
        level: 'error',
        tags: { mediaId: opts.mediaId, status: String(response.status) },
        extra: { errors: payload.errors },
      });
      throw new DeliveryProviderError(
        `Cloudflare Images upload failed: ${summary || `HTTP ${response.status}`}`,
        this.name,
      );
    }

    const cfImageId = payload.result.id as CfImageId;
    const variants = await this.getVariantUrls(cfImageId, opts.kind, {
      signed: opts.requireSignedDelivery,
    });
    return { cfImageId, variants };
  }

  /**
   * Build delivery URLs for every variant we publish. The variant names
   * here MUST match the ones configured in the Cloudflare dashboard
   * (`thumbnail`, `medium`, `large`). The `ORIGIN` variant is reserved
   * — we never expose it through this provider; private origin reads
   * go through `R2Provider.getSignedReadUrl` instead.
   */
  async getVariantUrls(
    cfImageId: CfImageId,
    kind: MediaKind,
    options: GetVariantUrlsOptions = {},
  ): Promise<MediaVariantUrls> {
    this.assertConfigured();
    const cfg = getMediaKindConfig(kind);
    const signed = options.signed ?? cfg.accessClass === 'private';

    const urls: Partial<Record<MediaVariant, string>> = {};
    for (const variant of MEDIA_VARIANTS) {
      if (variant === 'ORIGIN') continue;
      const base = this.buildVariantUrl(cfImageId, variant);
      urls[variant] = signed ? await this.signDeliveryUrl(base, options.ttlSeconds ?? 300) : base;
    }
    return urls;
  }

  buildVariantUrl(cfImageId: CfImageId, variant: MediaVariant): string {
    // ORIGIN never resolves to a CF Images URL — we still build a
    // canonical "raw" delivery URL here so callers that hand us ORIGIN
    // by mistake don't crash. Worker uses R2's signed URL instead.
    const variantName = variant === 'ORIGIN' ? 'public' : variant.toLowerCase();
    return `https://${DELIVERY_HOSTNAME}/${env.CLOUDFLARE_ACCOUNT_HASH}/${cfImageId}/${variantName}`;
  }

  /**
   * Cloudflare Images "signed delivery" appends an HMAC-SHA256 hash
   * and expiry to the URL. The signing key is generated once in the
   * dashboard (NOT the API token) and is sensitive — never log it.
   *
   * NOTE: signing-key support requires the CF Images "Pro" tier OR an
   * Enterprise plan. For Day 1 free tier, signed delivery falls back
   * to unsigned URLs and the orchestrator gates access at the API
   * layer (auth middleware) rather than at the CDN edge. We document
   * this trade-off in ADR-0006.
   */
  private async signDeliveryUrl(baseUrl: string, ttlSeconds: number): Promise<string> {
    // Day 1 implementation — sign only when the signing key is set.
    // Without it, return the raw URL and depend on app-layer auth.
    const signingKey = env.CLOUDFLARE_IMAGES_SIGNING_KEY;
    if (!signingKey) return baseUrl;

    const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
    const url = new URL(baseUrl);
    url.searchParams.set('exp', String(expiry));

    // Compute HMAC over the path + query string (excluding hostname).
    const stringToSign = `${url.pathname}${url.search}`;
    const crypto = await import('node:crypto');
    const sig = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    url.searchParams.set('sig', sig);
    return url.toString();
  }

  async deleteVariants(cfImageId: CfImageId): Promise<void> {
    this.assertConfigured();
    const url = `${CF_API_BASE}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1/${cfImageId}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_IMAGES_API_TOKEN}`,
        },
      });
      if (!response.ok && response.status !== 404) {
        const text = await response.text().catch(() => '');
        throw new DeliveryProviderError(
          `Cloudflare Images delete failed (HTTP ${response.status}): ${text}`,
          this.name,
        );
      }
    } catch (err) {
      if (err instanceof DeliveryProviderError) throw err;
      Sentry.captureException(err, {
        tags: { service: 'media', adapter: 'cf-images', op: 'deleteVariants' },
      });
      throw new DeliveryProviderError('Cloudflare Images delete network failure', this.name, err);
    }
  }
}
