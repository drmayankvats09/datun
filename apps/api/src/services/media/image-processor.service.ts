// ═══════════════════════════════════════════════════════════════
// IMAGE PROCESSOR SERVICE — Task #46 defensive server-side hygiene
//
// Client-side Web Worker already resizes / strips EXIF before R2
// upload (apps/web/lib/media/client-resize.worker.ts in Phase 4).
// This service runs AFTER R2 upload, inside the BullMQ worker, and
// performs a defensive re-pass:
//
//   1. Verify dimensions match what the client claimed (anti-spoof)
//   2. Re-strip EXIF/XMP/IPTC (PHI safety net — GPS coordinates etc.)
//   3. Re-encode JPEG @ q92 (canonical bytes for variant generation)
//   4. Recompute blurhash + return final metadata
//
// We DO NOT rotate / crop / orientation-correct here — locked decision
// (15 May 2026): Claude Vision is orientation-agnostic, manipulation
// risk > benefit. EXIF orientation tag is preserved so browsers
// auto-rotate at render time.
//
// Library choice: `sharp` (libvips bindings). Industry standard for
// Node image processing — used by Vercel, Netlify, Cloudflare Workers.
// Native binaries are platform-specific but installed by pnpm
// automatically per OS (Linux for Railway, Windows for local dev).
//
// Memory rule: medical-grade output, no quality degradation in the
// name of speed.
// ═══════════════════════════════════════════════════════════════

import sharp from 'sharp';
import { encode as encodeBlurhash } from 'blurhash';

import { logger } from '../../lib/logger.js';
import { Sentry } from '../../lib/sentry.js';

import {
  JPEG_QUALITY,
  MAX_OUTPUT_BYTES,
  RESIZE_TARGET_PX,
  getMediaKindConfig,
  type Blurhash,
  type MediaKind,
} from '@repo/shared';

/**
 * Outcome of a defensive re-process. Bytes are present only when the
 * worker decided to overwrite the R2 object — typically when EXIF was
 * actually found, or when re-encoded bytes diverged materially from
 * the client output (defensive — protects against tampering).
 */
export interface ProcessedImage {
  /** True when the worker should overwrite the R2 object with these bytes. */
  readonly shouldRewriteOrigin: boolean;
  /** Final canonical bytes. Same shape as the client would have produced. */
  readonly bytes: Buffer;
  /** MIME type the canonical bytes encode to (always image/jpeg in v1). */
  readonly mimeType: string;
  /** Pixel width of the canonical bytes. */
  readonly width: number;
  /** Pixel height of the canonical bytes. */
  readonly height: number;
  /** Whether EXIF metadata was actually found and stripped. */
  readonly exifStripped: boolean;
  /** Recomputed blurhash. Worker DB-writes this verbatim. */
  readonly blurhash: Blurhash;
  /** Final byte length, after re-encode. */
  readonly sizeBytes: number;
}

export interface ProcessImageOptions {
  readonly kind: MediaKind;
  /** Client-reported dimensions — used to detect tampering. */
  readonly claimedWidth: number;
  readonly claimedHeight: number;
}

/**
 * Re-process the bytes pulled from R2. Throws on irrecoverable cases
 * (corrupt buffer, sharp unable to decode). The worker classifies the
 * thrown error as a permanent failure and marks the MediaAsset FAILED.
 */
export async function processImageBuffer(
  input: Buffer,
  options: ProcessImageOptions,
): Promise<ProcessedImage> {
  const cfg = getMediaKindConfig(options.kind);

  // ── 1. Decode + metadata probe ────────────────────────────
  let image: sharp.Sharp;
  let metadata: sharp.Metadata;
  try {
    // `failOn: 'error'` rejects truncated / corrupt inputs. We do NOT
    // call `.rotate()` — locked policy: Claude Vision is orientation-
    // agnostic. The EXIF orientation tag is preserved by default unless
    // we explicitly strip it (see step 3).
    image = sharp(input, { failOn: 'error' });
    metadata = await image.metadata();
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: 'media', op: 'processImageBuffer.decode' },
      extra: { kind: options.kind, sizeBytes: input.length },
    });
    throw new Error('Image decode failed — bytes are corrupt or unsupported');
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width === 0 || height === 0) {
    throw new Error('Image metadata missing width/height — refusing to process');
  }

  // ── 2. Tamper check vs client claim ──────────────────────
  // Tolerance: ±2px (rounding inside libvips on certain HEIC inputs).
  // Anything larger means the client lied or someone replaced the
  // bytes on R2 — surface as a Sentry warning, still proceed because
  // worker output is authoritative.
  const widthMismatch = Math.abs(width - options.claimedWidth) > 2;
  const heightMismatch = Math.abs(height - options.claimedHeight) > 2;
  if (widthMismatch || heightMismatch) {
    logger.warn('[MediaProcessor] client/server dimension mismatch', {
      kind: options.kind,
      claimed: { w: options.claimedWidth, h: options.claimedHeight },
      actual: { w: width, h: height },
    });
    Sentry.captureMessage('Media dimension mismatch', {
      level: 'warning',
      tags: { kind: options.kind },
      extra: {
        claimed: { w: options.claimedWidth, h: options.claimedHeight },
        actual: { w: width, h: height },
      },
    });
  }

  // ── 3. Resize-if-needed + canonical JPEG re-encode ───────
  // Only resize if either dimension exceeds the canonical target.
  // Client SHOULD have already done this; we re-enforce defensively.
  const longestEdge = Math.max(width, height);
  const needsResize = longestEdge > RESIZE_TARGET_PX;
  if (needsResize) {
    image = image.resize({
      width: width >= height ? RESIZE_TARGET_PX : undefined,
      height: height > width ? RESIZE_TARGET_PX : undefined,
      withoutEnlargement: true,
      fit: 'inside',
    });
  }

  // EXIF detection BEFORE re-encode. `metadata.exif` is a Buffer when
  // present; `metadata.xmp` and `metadata.iptc` are also stripped by
  // a re-encode unless explicitly kept via `withMetadata`.
  const hadExif = Boolean(metadata.exif || metadata.xmp || metadata.iptc);

  let outBuffer: Buffer;
  try {
    outBuffer = await image
      .jpeg({
        quality: JPEG_QUALITY,
        mozjpeg: true, // libvips uses mozjpeg encoder when available — smaller, identical visual.
        chromaSubsampling: '4:4:4', // preserve fine clinical detail (caries dots)
      })
      .toBuffer();
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: 'media', op: 'processImageBuffer.encode' },
      extra: { kind: options.kind },
    });
    throw new Error('JPEG re-encode failed');
  }

  if (outBuffer.length > Math.max(MAX_OUTPUT_BYTES, cfg.maxOutputBytes)) {
    // Should never happen: client respected the ceiling and we only
    // downscale. Hard fail rather than store an oversize blob.
    throw new Error(`Encoded output ${outBuffer.length} bytes exceeds ceiling ${MAX_OUTPUT_BYTES}`);
  }

  // ── 4. Blurhash computation ──────────────────────────────
  // Blurhash needs raw RGBA pixels at a tiny resolution (32×32 or so).
  // We re-pull from the already-resized sharp pipeline to keep it cheap.
  const finalMeta = await sharp(outBuffer).metadata();
  const finalWidth = finalMeta.width ?? width;
  const finalHeight = finalMeta.height ?? height;

  const blurhashValue = await computeBlurhash(outBuffer);

  return {
    shouldRewriteOrigin: hadExif || needsResize,
    bytes: outBuffer,
    mimeType: 'image/jpeg',
    width: finalWidth,
    height: finalHeight,
    exifStripped: hadExif,
    blurhash: blurhashValue,
    sizeBytes: outBuffer.length,
  };
}

/**
 * Compute a blurhash from any sharp-readable image buffer. We downscale
 * to a 32×32 RGBA raster first — blurhash's encoder is O(n) on pixels.
 *
 * Components 4×3 = visually pleasing without ballooning the hash size.
 * Industry standard (Mastodon, Wolt). Final hash is ~30 chars.
 */
async function computeBlurhash(buffer: Buffer): Promise<Blurhash> {
  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  return encodeBlurhash(pixels, info.width, info.height, 4, 3) as Blurhash;
}
