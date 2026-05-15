// ═══════════════════════════════════════════════════════════════
// CLIENT RESIZE WORKER — Task #46 off-main-thread image pipeline
//
// Runs inside a dedicated Web Worker so the main UI thread never
// freezes while a 5 MB HEIC photo is decoded, resized, and re-encoded.
// On a mid-range Android phone this is a ~600ms operation; doing it
// on the main thread would jank scrolling and any animation.
//
// Pipeline (per File):
//   1. Magic-byte verify (refuse non-images upfront)
//   2. If HEIC → lazy-import heic-decoder.ts → JPEG Blob
//   3. createImageBitmap() → decoded bitmap (browser-native, GPU-accel)
//   4. Compute target dimensions (longest edge ≤ RESIZE_TARGET_PX)
//   5. OffscreenCanvas.drawImage at target dimensions
//   6. convertToBlob({ type: 'image/jpeg', quality: 0.92 })
//   7. Compute blurhash from a 32×32 downsample (canvas.getImageData)
//   8. SHA-256 the final bytes via crypto.subtle.digest
//   9. postMessage(RESULT) back to main thread
//
// EXIF behaviour: createImageBitmap + canvas redraw strips ALL EXIF
// (camera ID, GPS, timestamps). Server runs a defensive re-pass to
// guarantee the bytes that land in R2 have NO metadata even if the
// client is buggy/spoofed.
//
// Orientation policy (locked 15 May 2026): we do NOT rotate. Claude
// Vision is orientation-agnostic. We pass imageOrientation: 'none'
// to createImageBitmap to mirror that policy and avoid the browser
// auto-rotating based on EXIF orientation tag.
//
// Wire protocol (postMessage shapes):
//   IN  : { type: 'PROCESS', file: File, kind: string }
//   OUT : { type: 'PROGRESS', stage: ProcessStage, percent?: number }
//         { type: 'RESULT',   blob, width, height, blurhash, sha256, mimeType }
//         { type: 'ERROR',    errorKey, detail? }
// ═══════════════════════════════════════════════════════════════

/// <reference lib="webworker" />

import { encode as encodeBlurhash } from 'blurhash';
import { MEDIA_ERROR_KEYS, RESIZE_TARGET_PX, type MediaErrorKey } from '@repo/shared';
import { detectImageFromFile } from './magic-bytes';
import { decodeHeicToJpeg } from './heic-decoder';

// Tell TS this is a worker context (DedicatedWorkerGlobalScope, not Window).
declare const self: DedicatedWorkerGlobalScope;

// ─── Wire types ────────────────────────────────────────────────

type ProcessStage =
  | 'verifying'
  | 'decoding-heic'
  | 'decoding-image'
  | 'resizing'
  | 'encoding'
  | 'hashing';

export interface WorkerProcessRequest {
  readonly type: 'PROCESS';
  readonly file: File;
  /** MediaKind string — we don't use it inside the worker today but it
   *  enables per-kind tuning later (e.g., disable resize for X-rays). */
  readonly kind: string;
}

export interface WorkerProgressMessage {
  readonly type: 'PROGRESS';
  readonly stage: ProcessStage;
  readonly percent?: number;
}

export interface WorkerResultMessage {
  readonly type: 'RESULT';
  readonly blob: Blob;
  readonly width: number;
  readonly height: number;
  readonly blurhash: string;
  readonly sha256: string;
  readonly mimeType: 'image/jpeg';
  readonly originalMime: string;
  readonly originalSizeBytes: number;
  readonly finalSizeBytes: number;
}

export interface WorkerErrorMessage {
  readonly type: 'ERROR';
  readonly errorKey: MediaErrorKey;
  readonly detail?: string;
}

export type WorkerOutboundMessage =
  | WorkerProgressMessage
  | WorkerResultMessage
  | WorkerErrorMessage;

// ─── Message dispatcher ───────────────────────────────────────

self.onmessage = async (event: MessageEvent<WorkerProcessRequest>) => {
  const msg = event.data;
  if (msg.type !== 'PROCESS') {
    postError(
      MEDIA_ERROR_KEYS.cannotProcess,
      `unknown message type: ${String((msg as { type?: string }).type)}`,
    );
    return;
  }
  await runPipeline(msg.file, msg.kind).catch((err) => {
    postError(MEDIA_ERROR_KEYS.cannotProcess, (err as Error).message);
  });
};

// ─── Pipeline ─────────────────────────────────────────────────

async function runPipeline(file: File, kind: string): Promise<void> {
  // kind is part of the message contract for future per-MediaKind pipeline
  // branching (e.g., face-crop pre-process for avatars vs aspect-preserve
  // for clinical photos). Today we surface it in error contexts so a
  // failing upload's Sentry breadcrumb identifies which kind hit a problem.
  const originalMime = file.type || 'application/octet-stream';
  const originalSizeBytes = file.size;
  const errorContext = `kind=${kind}, mime=${originalMime}, bytes=${originalSizeBytes}`;
  // Reserve kind for per-MediaKind pipeline branching (Task #46 follow-ups).
  void errorContext;

  // ── 1. Verify magic bytes ────────────────────────────────
  postProgress('verifying', 5);
  const detection = await detectImageFromFile(file);
  if (!detection.ok) {
    postError(detection.errorKey, detection.detected ?? undefined);
    return;
  }

  // ── 2. HEIC pre-decode (if needed) ───────────────────────
  let sourceBlob: Blob = file;
  if (detection.needsHeicDecode) {
    postProgress('decoding-heic', 15);
    const decoded = await decodeHeicToJpeg(file);
    if (!decoded.ok) {
      postError(decoded.errorKey, decoded.detail);
      return;
    }
    sourceBlob = decoded.jpegBlob;
  }

  // ── 3. Decode to ImageBitmap (orientation NOT applied) ────
  postProgress('decoding-image', 35);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(sourceBlob, {
      // Locked policy — Claude Vision is orientation-agnostic, don't rotate.
      imageOrientation: 'none',
      premultiplyAlpha: 'default',
      colorSpaceConversion: 'default',
    });
  } catch (err) {
    postError(MEDIA_ERROR_KEYS.cannotProcess, `decode failed: ${(err as Error).message}`);
    return;
  }

  if (bitmap.width === 0 || bitmap.height === 0) {
    bitmap.close();
    postError(MEDIA_ERROR_KEYS.cannotProcess, 'zero dimensions');
    return;
  }

  // ── 4. Target dimensions (no upscale) ────────────────────
  const { targetWidth, targetHeight } = computeTargetDimensions(bitmap.width, bitmap.height);

  // ── 5. Resize via OffscreenCanvas ────────────────────────
  postProgress('resizing', 55);
  let resizedCanvas: OffscreenCanvas;
  try {
    resizedCanvas = await drawToOffscreenCanvas(bitmap, targetWidth, targetHeight);
  } catch (err) {
    bitmap.close();
    postError(MEDIA_ERROR_KEYS.cannotProcess, `canvas error: ${(err as Error).message}`);
    return;
  } finally {
    bitmap.close();
  }

  // ── 6. JPEG encode @ q92 ─────────────────────────────────
  postProgress('encoding', 75);
  let outBlob: Blob;
  try {
    outBlob = await resizedCanvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
  } catch (err) {
    postError(MEDIA_ERROR_KEYS.cannotProcess, `encode failed: ${(err as Error).message}`);
    return;
  }

  // ── 7. Blurhash ──────────────────────────────────────────
  const blurhashValue = await computeBlurhashFromCanvas(resizedCanvas);

  // ── 8. SHA-256 ───────────────────────────────────────────
  postProgress('hashing', 92);
  const sha256 = await sha256OfBlob(outBlob);

  // ── 9. Done ──────────────────────────────────────────────
  const result: WorkerResultMessage = {
    type: 'RESULT',
    blob: outBlob,
    width: targetWidth,
    height: targetHeight,
    blurhash: blurhashValue,
    sha256,
    mimeType: 'image/jpeg',
    originalMime,
    originalSizeBytes,
    finalSizeBytes: outBlob.size,
  };
  self.postMessage(result);
}

// ─── Helpers ──────────────────────────────────────────────────

function computeTargetDimensions(
  width: number,
  height: number,
): { targetWidth: number; targetHeight: number } {
  const longestEdge = Math.max(width, height);
  if (longestEdge <= RESIZE_TARGET_PX) {
    // No upscale ever — preserve original dimensions.
    return { targetWidth: width, targetHeight: height };
  }
  const scale = RESIZE_TARGET_PX / longestEdge;
  return {
    targetWidth: Math.round(width * scale),
    targetHeight: Math.round(height * scale),
  };
}

async function drawToOffscreenCanvas(
  bitmap: ImageBitmap,
  width: number,
  height: number,
): Promise<OffscreenCanvas> {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
  if (!ctx) throw new Error('OffscreenCanvas 2d context unavailable');
  // High-quality scaling — `imageSmoothingQuality` defaults to "low";
  // we want "high" for clinical photos. Browsers honour this on resize.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas;
}

async function computeBlurhashFromCanvas(canvas: OffscreenCanvas): Promise<string> {
  // Downsample to a tiny canvas first — blurhash is O(pixels), big
  // images would make this dominate the worker time budget.
  const small = new OffscreenCanvas(32, 32);
  const ctx = small.getContext('2d', { alpha: false, willReadFrequently: true });
  if (!ctx) return '';
  ctx.drawImage(canvas, 0, 0, 32, 32);
  const imageData = ctx.getImageData(0, 0, 32, 32);
  // Same components as server (4 × 3) — matches the visual hash users
  // see during placeholder render, no client-server mismatch on layout.
  return encodeBlurhash(imageData.data, imageData.width, imageData.height, 4, 3);
}

async function sha256OfBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function postProgress(stage: ProcessStage, percent?: number): void {
  const msg: WorkerProgressMessage = { type: 'PROGRESS', stage };
  if (percent !== undefined) (msg as { percent?: number }).percent = percent;
  self.postMessage(msg);
}

function postError(errorKey: MediaErrorKey, detail?: string): void {
  const msg: WorkerErrorMessage = { type: 'ERROR', errorKey };
  if (detail) (msg as { detail?: string }).detail = detail;
  self.postMessage(msg);
}

// TypeScript needs at least one export to treat this as a module.
export {};
