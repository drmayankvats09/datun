// ═══════════════════════════════════════════════════════════════
// USE-MEDIA-UPLOAD — Task #46 state-machine hook
//
// Single React hook orchestrating the full client-side flow:
//
//   idle → processing → uploading → confirming → done
//                                              ↘ error (any stage)
//
// Composes three lower-level utilities (all from Phase 4):
//   - processImageForUpload   (resize-pipeline.ts) — Web Worker pipeline
//   - requestUploadIntent     (upload-client.ts)   — POST /api/media/upload-intent
//   - uploadDirectToR2        (upload-client.ts)   — XHR PUT to R2
//   - confirmUpload           (upload-client.ts)   — POST /api/media/:id/confirm
//
// Exposes:
//   { state, upload(file), cancel(), reset() }
//
// State invariants:
//   - `state.stage` is the discriminated tag — UI branches on it
//   - `state.progress` is 0-1 within the current stage
//   - `state.error` is typed — UI maps errorCode/errorKey to i18n strings
//   - `state.mediaAsset` is non-null only when stage === 'done'
//   - All transitions are atomic; no partial states reach React
//
// Cancellation: caller can call `cancel()` at any time. Internally we
// pipe AbortSignal through the worker (terminate) and the XHR upload
// (abort). The hook resolves into `stage: 'idle'` after cleanup.
//
// Memory rule #22: production-grade lifecycle — handles unmount during
// any stage, no setState-after-unmount, no memory leaks (objectUrl revoke).
// ═══════════════════════════════════════════════════════════════

'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { MediaAssetDTO, MediaKind, Blurhash } from '@repo/shared';
import {
  processImageForUpload,
  MediaProcessError,
  type ProcessedImage,
} from '@/lib/media/resize-pipeline';
import {
  requestUploadIntent,
  uploadDirectToR2,
  confirmUpload,
  type ClientResult,
} from '@/lib/media/upload-client';

// ─── State machine types ─────────────────────────────────────

export type UploadStage = 'idle' | 'processing' | 'uploading' | 'confirming' | 'done' | 'error';

export interface UploadError {
  /** Stable code the UI maps to localised copy (never raw English). */
  readonly errorCode: string;
  /** Localisation key when the failure was a content rejection. */
  readonly errorKey?: string;
  /** Engineering-side detail — sent to Sentry, not the user. */
  readonly detail?: string;
}

export interface UseMediaUploadState {
  readonly stage: UploadStage;
  /** 0-1 within the current stage. */
  readonly progress: number;
  readonly error: UploadError | null;
  /** Populated only when stage === 'done'. */
  readonly mediaAsset: MediaAssetDTO | null;
  /** Local Blob URL for immediate preview while upload is in flight. */
  readonly preview: { readonly blob: Blob; readonly objectUrl: string } | null;
}

export interface UseMediaUploadOptions {
  readonly kind: MediaKind;
  readonly entityId: string;
  /** Required for CONSULTATION_PHOTO / PRESCRIPTION_DOC. */
  readonly consentLogId?: string;
  readonly originalFilename?: string;
}

interface InternalAction {
  readonly type:
    | 'START_PROCESSING'
    | 'PROGRESS'
    | 'PROCESSING_DONE'
    | 'START_UPLOADING'
    | 'START_CONFIRMING'
    | 'DONE'
    | 'ERROR'
    | 'RESET';
  readonly progress?: number;
  readonly preview?: { blob: Blob; objectUrl: string };
  readonly mediaAsset?: MediaAssetDTO;
  readonly error?: UploadError;
}

const INITIAL_STATE: UseMediaUploadState = {
  stage: 'idle',
  progress: 0,
  error: null,
  mediaAsset: null,
  preview: null,
};

function reducer(state: UseMediaUploadState, action: InternalAction): UseMediaUploadState {
  switch (action.type) {
    case 'START_PROCESSING':
      return { ...INITIAL_STATE, stage: 'processing' };
    case 'PROGRESS':
      return { ...state, progress: Math.max(0, Math.min(1, action.progress ?? 0)) };
    case 'PROCESSING_DONE':
      return { ...state, progress: 0, preview: action.preview ?? null };
    case 'START_UPLOADING':
      return { ...state, stage: 'uploading', progress: 0 };
    case 'START_CONFIRMING':
      return { ...state, stage: 'confirming', progress: 0 };
    case 'DONE':
      return {
        ...state,
        stage: 'done',
        progress: 1,
        mediaAsset: action.mediaAsset ?? null,
        error: null,
      };
    case 'ERROR':
      return { ...state, stage: 'error', error: action.error ?? null };
    case 'RESET':
      return INITIAL_STATE;
    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────

export function useMediaUpload(options: UseMediaUploadOptions): {
  readonly state: UseMediaUploadState;
  readonly upload: (file: File) => Promise<void>;
  readonly cancel: () => void;
  readonly reset: () => void;
} {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  /** Safe dispatch — drops if the component unmounted during async work. */
  const safeDispatch = useCallback((action: InternalAction): void => {
    if (mountedRef.current) dispatch(action);
  }, []);

  const reset = useCallback((): void => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    safeDispatch({ type: 'RESET' });
  }, [safeDispatch]);

  const cancel = useCallback((): void => {
    abortRef.current?.abort();
    reset();
  }, [reset]);

  const upload = useCallback(
    async (file: File): Promise<void> => {
      // Fresh abort controller per run.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Revoke any old preview.
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }

      safeDispatch({ type: 'START_PROCESSING' });

      // ── Stage 1: Web Worker pipeline ─────────────────────
      let processed: ProcessedImage;
      try {
        processed = await processImageForUpload(file, options.kind, {
          signal: controller.signal,
          onProgress: (event) => {
            if (typeof event.percent === 'number') {
              safeDispatch({ type: 'PROGRESS', progress: event.percent / 100 });
            }
          },
        });
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          safeDispatch({ type: 'RESET' });
          return;
        }
        const mpe = err as MediaProcessError;
        safeDispatch({
          type: 'ERROR',
          error: {
            errorCode: 'PROCESS_FAILED',
            errorKey: mpe.errorKey,
            detail: mpe.detail,
          },
        });
        return;
      }

      const previewUrl = URL.createObjectURL(processed.blob);
      previewUrlRef.current = previewUrl;
      safeDispatch({
        type: 'PROCESSING_DONE',
        preview: { blob: processed.blob, objectUrl: previewUrl },
      });

      // ── Stage 2: upload-intent ───────────────────────────
      safeDispatch({ type: 'START_UPLOADING' });
      const intentResult = await requestUploadIntent({
        kind: options.kind,
        entityId: options.entityId,
        mimeType: processed.mimeType,
        sizeBytes: processed.finalSizeBytes,
        originalFilename: options.originalFilename ?? file.name.slice(0, 200),
        consentLogId: options.consentLogId,
      });
      if (!intentResult.ok) {
        safeDispatch({ type: 'ERROR', error: clientErrorToUploadError(intentResult) });
        return;
      }
      const intent = intentResult.data;

      // ── Stage 3: direct R2 upload (XHR with progress) ────
      const r2Result = await uploadDirectToR2({
        uploadUrl: intent.uploadUrl,
        requiredHeaders: intent.requiredHeaders,
        blob: processed.blob,
        signal: controller.signal,
        onProgress: (frac) => safeDispatch({ type: 'PROGRESS', progress: frac }),
      });
      if (!r2Result.ok) {
        if (r2Result.errorCode === 'ABORTED') {
          safeDispatch({ type: 'RESET' });
          return;
        }
        safeDispatch({ type: 'ERROR', error: clientErrorToUploadError(r2Result) });
        return;
      }

      // ── Stage 4: confirm ─────────────────────────────────
      safeDispatch({ type: 'START_CONFIRMING' });
      const confirmResult = await confirmUpload(intent.mediaId, {
        finalSizeBytes: processed.finalSizeBytes,
        width: processed.width,
        height: processed.height,
        blurhash: processed.blurhash as unknown as Blurhash,
        sha256: processed.sha256,
      });
      if (!confirmResult.ok) {
        safeDispatch({ type: 'ERROR', error: clientErrorToUploadError(confirmResult) });
        return;
      }

      safeDispatch({ type: 'DONE', mediaAsset: confirmResult.data });
    },
    [options.kind, options.entityId, options.consentLogId, options.originalFilename, safeDispatch],
  );

  return { state, upload, cancel, reset };
}

// ─── Helpers ──────────────────────────────────────────────────

function clientErrorToUploadError(result: ClientResult<unknown>): UploadError {
  if (result.ok) {
    return { errorCode: 'UNKNOWN' };
  }
  return { errorCode: result.errorCode, detail: result.errorMessage };
}
