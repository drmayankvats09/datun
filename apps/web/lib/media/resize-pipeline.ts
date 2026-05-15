// ═══════════════════════════════════════════════════════════════
// RESIZE PIPELINE — Task #46 main-thread Web Worker orchestrator
//
// Public entry point the UI calls to take a raw File and get back a
// processed Blob ready for direct R2 upload. All the heavy work
// (decode + resize + encode + blurhash + sha256) happens inside
// client-resize.worker.ts running on a separate thread.
//
// Responsibilities of this module:
//   1. Spawn a fresh Worker per processing call (no shared state)
//   2. Send the File via postMessage
//   3. Pipe progress events to the caller's onProgress callback
//   4. Resolve with the final result OR reject with a typed error
//   5. Terminate the worker on completion (success or failure)
//
// Why a fresh worker per call (vs pooled): each call processes one
// photo and we always terminate at the end. Pooling adds complexity
// for a fixed-cost win (worker start ≈ 10ms). The user uploads photos
// at human speed, not in bursts — a pool buys nothing meaningful.
//
// Browser support: requires Web Worker + OffscreenCanvas. Chrome 69+,
// Firefox 105+, Safari 16.4+ (Apr 2023). For older Safari we degrade
// — `isResizeSupported()` lets the caller fall back to a synchronous
// path or refuse the upload with a friendly upgrade message.
//
// Cancellation: returning an `AbortSignal` from the caller and calling
// `signal.addEventListener('abort', ...)` is honoured by terminating
// the worker immediately. This matters when the user navigates away
// mid-upload.
// ═══════════════════════════════════════════════════════════════

import { MEDIA_ERROR_KEYS, type MediaErrorKey, type MediaKind } from '@repo/shared';
import type {
  WorkerErrorMessage,
  WorkerOutboundMessage,
  WorkerProcessRequest,
  WorkerProgressMessage,
  WorkerResultMessage,
} from './client-resize.worker';

// ─── Public result shape ──────────────────────────────────────

export interface ProcessedImage {
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

export interface ProcessImageOptions {
  /** Forward progress events to UI (stage + percent). */
  readonly onProgress?: (event: WorkerProgressMessage) => void;
  /** AbortSignal — when fired, the worker is terminated and the
   *  promise rejects with an `AbortError`. */
  readonly signal?: AbortSignal;
}

export class MediaProcessError extends Error {
  constructor(
    public readonly errorKey: MediaErrorKey,
    public readonly detail?: string,
  ) {
    super(`MediaProcessError(${errorKey})${detail ? `: ${detail}` : ''}`);
    this.name = 'MediaProcessError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ─── Feature detection ────────────────────────────────────────

/**
 * Returns true when the current browser supports the off-main-thread
 * pipeline. False on legacy Safari without OffscreenCanvas. Caller
 * decides whether to refuse the upload or fall back to a slower path.
 */
export function isResizeSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof Worker === 'undefined') return false;
  if (typeof OffscreenCanvas === 'undefined') return false;
  if (typeof createImageBitmap === 'undefined') return false;
  return true;
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Process a user-selected File for upload: decode, resize to the
 * canonical 1568px longest-edge, JPEG q92 encode, blurhash, sha256.
 *
 * Always runs on a Web Worker (when supported). Rejects with
 * MediaProcessError on validation refusal (non-image, video, corrupt).
 * Rejects with AbortError when the caller's signal fires.
 */
export function processImageForUpload(
  file: File,
  kind: MediaKind,
  options: ProcessImageOptions = {},
): Promise<ProcessedImage> {
  if (!isResizeSupported()) {
    return Promise.reject(
      new MediaProcessError(MEDIA_ERROR_KEYS.cannotProcess, 'browser-not-supported'),
    );
  }
  if (options.signal?.aborted) {
    return Promise.reject(makeAbortError());
  }

  return new Promise<ProcessedImage>((resolve, reject) => {
    let settled = false;
    let worker: Worker | null = null;

    const cleanup = (): void => {
      settled = true;
      if (worker) {
        worker.terminate();
        worker = null;
      }
      if (options.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
    };

    const onAbort = (): void => {
      if (settled) return;
      cleanup();
      reject(makeAbortError());
    };

    if (options.signal) {
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      // Webpack / Turbopack interpret this URL pattern at build-time
      // and emit the worker as a separate bundle chunk.
      worker = new Worker(new URL('./client-resize.worker.ts', import.meta.url), {
        type: 'module',
        name: 'datun-media-resize',
      });
    } catch (err) {
      cleanup();
      reject(
        new MediaProcessError(
          MEDIA_ERROR_KEYS.cannotProcess,
          `worker-spawn-failed: ${(err as Error).message}`,
        ),
      );
      return;
    }

    worker.onmessage = (event: MessageEvent<WorkerOutboundMessage>): void => {
      if (settled) return;
      const msg = event.data;
      switch (msg.type) {
        case 'PROGRESS':
          options.onProgress?.(msg as WorkerProgressMessage);
          return;
        case 'RESULT': {
          const r = msg as WorkerResultMessage;
          cleanup();
          resolve({
            blob: r.blob,
            width: r.width,
            height: r.height,
            blurhash: r.blurhash,
            sha256: r.sha256,
            mimeType: r.mimeType,
            originalMime: r.originalMime,
            originalSizeBytes: r.originalSizeBytes,
            finalSizeBytes: r.finalSizeBytes,
          });
          return;
        }
        case 'ERROR': {
          const e = msg as WorkerErrorMessage;
          cleanup();
          reject(new MediaProcessError(e.errorKey, e.detail));
          return;
        }
      }
    };

    worker.onerror = (event: ErrorEvent): void => {
      if (settled) return;
      cleanup();
      reject(
        new MediaProcessError(MEDIA_ERROR_KEYS.cannotProcess, `worker-error: ${event.message}`),
      );
    };

    worker.onmessageerror = (): void => {
      if (settled) return;
      cleanup();
      reject(new MediaProcessError(MEDIA_ERROR_KEYS.cannotProcess, 'worker-message-error'));
    };

    const request: WorkerProcessRequest = { type: 'PROCESS', file, kind };
    worker.postMessage(request);
  });
}

function makeAbortError(): Error {
  // Cannot construct DOMException reliably in all environments; we
  // emit a plain Error with the same `name` the caller can check.
  const e = new Error('Upload processing aborted');
  e.name = 'AbortError';
  return e;
}
