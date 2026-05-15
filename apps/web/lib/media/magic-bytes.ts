// ═══════════════════════════════════════════════════════════════
// MAGIC-BYTES (Browser) — Task #46 client-side file-type verification
//
// First gate before any heavy work (HEIC decode, resize, encode).
// Wraps the `file-type` library to detect what the bytes actually are
// from a File or Blob, returning friendly i18n error keys when the
// content isn't an acceptable image input.
//
// Pair: apps/api/src/services/media/magic-bytes.ts (server-side).
// Both call the same library with the same INPUT_MIME_TYPES whitelist,
// so the "looks like a video" decision is consistent client↔server.
//
// Memory rule (15 May 2026): user-facing copy never blames the user.
// We return i18n keys; the FE renders the localised friendly redirect
// ("yeh ek video lag rahi hai, kripya photo bhejiye" etc.).
// ═══════════════════════════════════════════════════════════════

import { fileTypeFromBlob } from 'file-type';
import {
  INPUT_MIME_TYPES,
  MEDIA_ERROR_KEYS,
  type InputMimeType,
  type MediaErrorKey,
} from '@repo/shared';

/**
 * Outcome of an inspection. Mirrors the server-side `MagicByteResult`
 * exactly so the UI can share the i18n key handling for both client
 * pre-flight refusals and post-upload server refusals.
 */
export type MagicByteResult =
  | {
      readonly ok: true;
      readonly mime: InputMimeType;
      readonly ext: string;
      /** True when the file is HEIC/HEIF and needs a pre-decode step. */
      readonly needsHeicDecode: boolean;
    }
  | {
      readonly ok: false;
      readonly errorKey: MediaErrorKey;
      readonly detected: string | null;
    };

/**
 * Inspect a File the user just selected and decide whether it is an
 * acceptable image input. Runs entirely client-side — no network call.
 *
 * For empty files / read failures we surface `cannotProcess`; for
 * recognised video containers `looksLikeVideo`; for everything else
 * recognised but non-image (PDF, ZIP, EXE etc.) `notAnImage`.
 */
export async function detectImageFromFile(file: File): Promise<MagicByteResult> {
  if (!file || file.size === 0) {
    return { ok: false, errorKey: MEDIA_ERROR_KEYS.cannotProcess, detected: null };
  }

  // `fileTypeFromBlob` reads only the first few KB — safe on huge files.
  let detected: { mime: string; ext: string } | undefined;
  try {
    detected = await fileTypeFromBlob(file);
  } catch {
    return { ok: false, errorKey: MEDIA_ERROR_KEYS.cannotProcess, detected: null };
  }

  if (!detected) {
    return { ok: false, errorKey: MEDIA_ERROR_KEYS.notAnImage, detected: null };
  }

  if (detected.mime.startsWith('video/')) {
    return { ok: false, errorKey: MEDIA_ERROR_KEYS.looksLikeVideo, detected: detected.mime };
  }

  if ((INPUT_MIME_TYPES as readonly string[]).includes(detected.mime)) {
    return {
      ok: true,
      mime: detected.mime as InputMimeType,
      ext: detected.ext,
      needsHeicDecode: detected.mime === 'image/heic' || detected.mime === 'image/heif',
    };
  }

  return { ok: false, errorKey: MEDIA_ERROR_KEYS.notAnImage, detected: detected.mime };
}
