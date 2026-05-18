// ═══════════════════════════════════════════════════════════════
// MAGIC-BYTES DETECT — Task #46 server-side file-type verification
//
// Defense-in-depth pair to `apps/web/lib/media/magic-bytes.ts` (client
// pre-flight). The worker re-runs this check after pulling bytes from
// R2 to refuse:
//
//   - Files with image MIME claimed but non-image bytes (extension lie)
//   - Files that decode through sharp but are actually other formats
//     wrapped in valid containers (ftyp/MP4 in a renamed-to-jpg blob)
//   - Files whose declared MIME at upload-intent time doesn't match
//     what landed in R2 (client tampering)
//
// Library: `file-type` (npm). 60K weekly downloads, ESM, tree-shakable.
// Identifies the actual binary format from the first 4096 bytes of any
// stream. We use the buffer-based API since we already have bytes in
// memory from R2.
//
// Return shape uses i18n keys (not English) so the API can surface a
// translated friendly redirect to the client. Memory rule (15 May
// 2026): user-facing messaging never blames, never mentions size.
// ═══════════════════════════════════════════════════════════════

// ── file-type lazy loader (ESM-only package, CJS bundle compatibility) ──
// See worker/processors/media-processing.processor.ts for full rationale.
let _fileTypeFromBuffer: typeof import('file-type').fileTypeFromBuffer | null = null;
async function fileTypeFromBuffer(buf: Uint8Array) {
  if (!_fileTypeFromBuffer) {
    const mod = await import('file-type');
    _fileTypeFromBuffer = mod.fileTypeFromBuffer;
  }
  return _fileTypeFromBuffer(buf);
}

import {
  INPUT_MIME_TYPES,
  MEDIA_ERROR_KEYS,
  type InputMimeType,
  type MediaErrorKey,
} from '@repo/shared';

/**
 * Result of a magic-byte inspection.
 *
 *   ok === true  → bytes are a recognised image in the input whitelist.
 *                  The `mime` property may differ from what the client
 *                  declared (e.g., client said image/jpeg but real
 *                  bytes are image/webp) — orchestrator decides whether
 *                  to update the DB row to the detected MIME.
 *
 *   ok === false → bytes are NOT acceptable. `errorKey` is an i18n key
 *                  the FE renders into a localised friendly redirect.
 *                  `detected` is logged for ops but never shown to user.
 */
export type MagicByteResult =
  | {
      readonly ok: true;
      readonly mime: InputMimeType;
      readonly ext: string;
    }
  | {
      readonly ok: false;
      readonly errorKey: MediaErrorKey;
      readonly detected: string | null;
    };

/**
 * Inspect the first few KB of a buffer and decide whether it is an
 * acceptable image input for our pipeline.
 *
 * Allocates nothing — operates on the same Buffer the caller already
 * holds. Suitable for invocation per-upload in the worker hot path.
 */
export async function detectAndVerifyImage(buffer: Buffer): Promise<MagicByteResult> {
  if (buffer.length === 0) {
    return { ok: false, errorKey: MEDIA_ERROR_KEYS.cannotProcess, detected: null };
  }

  // `file-type` returns undefined when it cannot match — that's our
  // strongest signal that the bytes are nothing identifiable.
  const detected = await fileTypeFromBuffer(buffer);

  if (!detected) {
    return { ok: false, errorKey: MEDIA_ERROR_KEYS.notAnImage, detected: null };
  }

  const detectedMime = detected.mime;

  // Branch 1: detected as a video container → friendly "send a photo"
  // redirect. Includes mp4, mov, m4v, avi, webm — anything `file-type`
  // tags under the `video/*` family.
  if (detectedMime.startsWith('video/')) {
    return {
      ok: false,
      errorKey: MEDIA_ERROR_KEYS.looksLikeVideo,
      detected: detectedMime,
    };
  }

  // Branch 2: detected as something we accept as image input.
  if ((INPUT_MIME_TYPES as readonly string[]).includes(detectedMime)) {
    return {
      ok: true,
      mime: detectedMime as InputMimeType,
      ext: detected.ext,
    };
  }

  // Branch 3: detected as a recognised non-image format (PDF, zip, exe,
  // archive). Surface as the generic "not an image" redirect — we
  // intentionally do NOT enumerate every variant in user copy.
  return {
    ok: false,
    errorKey: MEDIA_ERROR_KEYS.notAnImage,
    detected: detectedMime,
  };
}

/**
 * Convenience wrapper around {@link detectAndVerifyImage} that throws
 * on failure with a structured error usable by the worker pipeline.
 *
 * The orchestrator's `processMedia` step catches `MagicByteRefusal`
 * specifically and flips the MediaAsset row to `REJECTED` rather than
 * retrying — these are permanent (the bytes themselves are wrong).
 */
export class MagicByteRefusal extends Error {
  constructor(
    public readonly errorKey: MediaErrorKey,
    public readonly detected: string | null,
  ) {
    super(`Magic-byte refusal: ${errorKey} (detected: ${detected ?? 'unknown'})`);
    this.name = 'MagicByteRefusal';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export async function assertImageOrThrow(buffer: Buffer): Promise<{
  mime: InputMimeType;
  ext: string;
}> {
  const result = await detectAndVerifyImage(buffer);
  if (!result.ok) {
    throw new MagicByteRefusal(result.errorKey, result.detected);
  }
  return { mime: result.mime, ext: result.ext };
}
