// ═══════════════════════════════════════════════════════════════
// HEIC DECODER — Task #46 lazy WASM decode wrapper
//
// iPhones (post-iOS 11) store photos as HEIC by default. Browsers
// don't natively decode HEIC — we use `heic2any` (libheif compiled
// to WASM, ~3-4MB gzipped) to convert HEIC → JPEG before the rest of
// the pipeline runs.
//
// Lazy-loaded via dynamic import — the WASM payload is NEVER in the
// main bundle. Only fetched when the user actually selects a HEIC
// file. Cold-load cost: ~500ms-1s on a typical 4G connection. After
// first load, browser cache makes subsequent decodes instant.
//
// We do not transcode in the main thread — this module is imported
// from inside the Web Worker (client-resize.worker.ts), keeping the
// UI thread free during decode.
//
// FAANG-grade considerations:
//   - Total memory cap: heic2any caps internally; we still defensively
//     reject inputs > 50 MB before invoking the lib.
//   - Cancel signal not supported by heic2any v1 — Worker termination
//     by the main thread is the cancel mechanism (postMessage abort).
//   - Errors are mapped to our friendly i18n keys, never raw error.
// ═══════════════════════════════════════════════════════════════

import { MEDIA_ERROR_KEYS, type MediaErrorKey } from '@repo/shared';

/** Hard ceiling — anything bigger than this won't fit in worker memory
 *  on low-end Android (~500 MB available per renderer). */
const HEIC_INPUT_CEILING_BYTES = 50 * 1024 * 1024;

export type HeicDecodeResult =
  | { readonly ok: true; readonly jpegBlob: Blob }
  | { readonly ok: false; readonly errorKey: MediaErrorKey; readonly detail?: string };

/**
 * Convert a HEIC/HEIF File (or Blob) into a JPEG Blob the rest of the
 * resize pipeline can ingest via `createImageBitmap()`.
 *
 * Quality argument is intentionally HIGH (0.95) because this is an
 * intermediate decode step, not the final encode — the resize pipeline
 * re-encodes at the canonical q92 afterwards. Higher intermediate
 * quality preserves clinical detail through the second encode.
 */
export async function decodeHeicToJpeg(input: Blob): Promise<HeicDecodeResult> {
  if (input.size === 0) {
    return { ok: false, errorKey: MEDIA_ERROR_KEYS.cannotProcess, detail: 'empty-input' };
  }
  if (input.size > HEIC_INPUT_CEILING_BYTES) {
    return {
      ok: false,
      errorKey: MEDIA_ERROR_KEYS.cannotProcess,
      detail: `heic too large (${input.size} bytes)`,
    };
  }

  // ── Dynamic import — keeps the WASM out of the main bundle ──
  // The import is awaited inside the worker context so the WASM payload
  // is loaded lazily on the first HEIC encounter and cached thereafter.
  let heic2any: (args: { blob: Blob; toType: string; quality?: number }) => Promise<Blob | Blob[]>;
  try {
    const mod = (await import('heic2any')) as { default: typeof heic2any };
    heic2any = mod.default;
  } catch (err) {
    // CDN / network failure → user sees friendly "couldn't open this
    // image" copy; ops sees the underlying detail in the upload result.
    return {
      ok: false,
      errorKey: MEDIA_ERROR_KEYS.cannotProcess,
      detail: `heic2any load failed: ${(err as Error).message}`,
    };
  }

  try {
    const out = await heic2any({
      blob: input,
      toType: 'image/jpeg',
      quality: 0.95,
    });
    // heic2any may return Blob or Blob[] (for multi-image HEIC).
    // We always take the first image — the cover frame.
    const blob = Array.isArray(out) ? out[0] : out;
    if (!blob) {
      return { ok: false, errorKey: MEDIA_ERROR_KEYS.cannotProcess, detail: 'empty-decode' };
    }
    return { ok: true, jpegBlob: blob };
  } catch (err) {
    return {
      ok: false,
      errorKey: MEDIA_ERROR_KEYS.cannotProcess,
      detail: `heic decode error: ${(err as Error).message}`,
    };
  }
}
