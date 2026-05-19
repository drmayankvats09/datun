// ═══════════════════════════════════════════════════════════════
// MEDIA SLICE — Photo upload tracking for the consultation store
//
// Tracks the lifecycle of user-uploaded dental photos as they move
// through: queued → uploading → uploaded → analyzed (or → failed).
//
// State is in-memory only (NOT persisted) — once a photo lands on R2
// (Cloudflare object storage), the backend is the authoritative store.
// Persisting upload state would only invite stale-state drift.
//
// Wiring (Phase 2 here, callsite in Task #57 / #58):
//   - `apps/web/components/consult/PhotoUpload.tsx` will call
//     `enqueuePhoto(file)` when the user picks a file.
//   - `apps/web/hooks/use-photo-upload-mutation.ts` (TanStack Query
//     mutation from Task #47) will drive the state transitions:
//       onMutate     → setPhotoStatus(id, 'uploading')
//       onProgress   → setPhotoProgress(id, percent)
//       onSuccess    → setPhotoStatus(id, 'uploaded'); store mediaKey
//       onError      → setPhotoStatus(id, 'failed'); store error
//   - The Claude Vision analysis worker reads `mediaKey` and writes
//     `analysis` back when done → setPhotoAnalyzed(id, analysis).
//
// State-machine guarantees:
//   - Status transitions are monotonic — once a photo is 'analyzed',
//     it can't go back to 'uploading' without a fresh `enqueuePhoto`.
//   - Failures are terminal for that ID; retrying = enqueue a new ID.
//   - Photos can be removed by the user (privacy) — `removePhoto`
//     drops from the local map AND sends a delete to backend (caller's
//     responsibility — this slice only handles local state).
//
// Why not in TanStack Query cache?
//   - Multi-photo upload UX needs synchronous read across all photos
//     (e.g., "are ALL photos uploaded? enable submit button"). Querying
//     N separate cache entries imperatively is awkward; one Zustand
//     map with `useShallow` selectors is faster + cleaner.
// ═══════════════════════════════════════════════════════════════

import type { StateCreator } from 'zustand';
import type { ConsultationStore } from '../consultation.store';

// ─── Types ────────────────────────────────────────────────────

/**
 * Single photo's upload + analysis lifecycle state.
 *
 * State transitions:
 *   queued → uploading → uploaded → analyzed
 *                              ↘ failed (terminal)
 *                  ↘ failed (terminal)
 */
export type PhotoStatus = 'queued' | 'uploading' | 'uploaded' | 'analyzed' | 'failed';

/**
 * Single uploaded photo record.
 *
 * `mediaKey` is the R2 object key returned by the upload API — used by
 * the backend to reference the photo in subsequent Claude Vision calls.
 *
 * `localPreviewUrl` is a `URL.createObjectURL()` blob URL for instant
 * preview before upload completes — components MUST revoke it when the
 * photo is removed (`URL.revokeObjectURL(photo.localPreviewUrl)`) to
 * avoid memory leaks; the `removePhoto` action does NOT auto-revoke
 * because the component owns the URL lifecycle (it created it).
 */
export interface UploadedPhoto {
  /** Stable local ID (UUID) — assigned by `enqueuePhoto` on file pick. */
  id: string;
  /** Original filename from the user's device. */
  filename: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** MIME type (e.g., 'image/jpeg', 'image/png', 'image/webp'). */
  mimeType: string;
  /** Local `URL.createObjectURL()` blob URL for instant preview. */
  localPreviewUrl: string;
  /** Current lifecycle state. */
  status: PhotoStatus;
  /** Upload progress as a fraction 0-100 (only meaningful while uploading). */
  progressPercent: number;
  /** R2 object key — populated when `status === 'uploaded' | 'analyzed'`. */
  mediaKey: string | null;
  /** Claude Vision analysis text — populated when `status === 'analyzed'`. */
  analysis: string | null;
  /** Error message — populated when `status === 'failed'`. */
  errorMessage: string | null;
  /** Unix epoch ms of when the photo was queued. */
  queuedAt: number;
}

// ─── Slice interface ──────────────────────────────────────────

export interface MediaSlice {
  /**
   * Map of photo ID → photo record. Map (not array) so reads/writes
   * are O(1) for individual photos and `useShallow` comparisons of
   * derived counts (e.g., "uploaded photos count") are stable.
   */
  photos: Record<string, UploadedPhoto>;

  /**
   * Add a freshly-picked photo to the queue. Caller is responsible for:
   *   - Generating the photo ID (e.g., `crypto.randomUUID()`)
   *   - Creating the `localPreviewUrl` via `URL.createObjectURL(file)`
   *
   * Initial status is `'queued'`. The mutation handler will move it to
   * `'uploading'` once the network request fires.
   */
  enqueuePhoto: (
    photo: Omit<
      UploadedPhoto,
      'status' | 'progressPercent' | 'mediaKey' | 'analysis' | 'errorMessage' | 'queuedAt'
    >,
  ) => void;

  /**
   * Transition a photo to a new status.
   *
   * Validates that the transition is monotonic — attempting to move
   * `'analyzed'` → `'uploading'` is a no-op (silently ignored) to
   * prevent late network callbacks from regressing state.
   */
  setPhotoStatus: (id: string, status: PhotoStatus) => void;

  /**
   * Update upload progress (only meaningful when status === 'uploading').
   * `percent` is clamped to [0, 100].
   */
  setPhotoProgress: (id: string, percent: number) => void;

  /**
   * Mark a photo as successfully uploaded with its R2 key. Implies a
   * status transition to `'uploaded'`.
   */
  setPhotoUploaded: (id: string, mediaKey: string) => void;

  /**
   * Mark a photo as analyzed with the Claude Vision result. Implies a
   * status transition to `'analyzed'`.
   */
  setPhotoAnalyzed: (id: string, analysis: string) => void;

  /**
   * Mark a photo as failed with an error message. Terminal — the photo
   * stays in the map for UI display (e.g., "Retry" button) until the
   * user explicitly removes it.
   */
  setPhotoFailed: (id: string, errorMessage: string) => void;

  /**
   * Remove a photo from the local map. Does NOT call the backend delete
   * endpoint — the calling component is responsible for that (and for
   * revoking the `localPreviewUrl`).
   */
  removePhoto: (id: string) => void;

  /**
   * Wipe all photos. Used by `clearConsultation`. Components owning the
   * blob URLs are expected to revoke them in their own cleanup effects.
   */
  clearPhotos: () => void;
}

// ─── Status transition table ──────────────────────────────────

/**
 * Allowed forward transitions. Any transition NOT listed here is a
 * regression and will be silently ignored by `setPhotoStatus`.
 *
 * The keys are the current status; the values are the set of statuses
 * the photo is allowed to move TO from there.
 */
const ALLOWED_TRANSITIONS: Record<PhotoStatus, ReadonlyArray<PhotoStatus>> = {
  queued: ['uploading', 'failed'],
  uploading: ['uploaded', 'failed'],
  uploaded: ['analyzed', 'failed'],
  analyzed: [], // terminal
  failed: [], // terminal — retry = new enqueue
};

function isValidTransition(from: PhotoStatus, to: PhotoStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

// ─── Slice creator ────────────────────────────────────────────

export const createMediaSlice: StateCreator<
  ConsultationStore,
  [['zustand/devtools', never], ['zustand/persist', unknown]],
  [],
  MediaSlice
> = (set) => ({
  photos: {},

  enqueuePhoto: (photo) =>
    set(
      (state) => ({
        photos: {
          ...state.photos,
          [photo.id]: {
            ...photo,
            status: 'queued',
            progressPercent: 0,
            mediaKey: null,
            analysis: null,
            errorMessage: null,
            queuedAt: Date.now(),
          },
        },
      }),
      false,
      'media/enqueue',
    ),

  setPhotoStatus: (id, status) =>
    set(
      (state) => {
        const photo = state.photos[id];
        if (!photo) return state; // unknown ID — no-op
        if (photo.status === status) return state; // already there
        if (!isValidTransition(photo.status, status)) return state; // regression

        return {
          photos: { ...state.photos, [id]: { ...photo, status } },
        };
      },
      false,
      'media/setStatus',
    ),

  setPhotoProgress: (id, percent) =>
    set(
      (state) => {
        const photo = state.photos[id];
        if (!photo) return state;
        const clamped = Math.max(0, Math.min(100, percent));
        if (photo.progressPercent === clamped) return state;
        return {
          photos: {
            ...state.photos,
            [id]: { ...photo, progressPercent: clamped },
          },
        };
      },
      false,
      'media/setProgress',
    ),

  setPhotoUploaded: (id, mediaKey) =>
    set(
      (state) => {
        const photo = state.photos[id];
        if (!photo) return state;
        if (!isValidTransition(photo.status, 'uploaded')) return state;
        return {
          photos: {
            ...state.photos,
            [id]: {
              ...photo,
              status: 'uploaded',
              progressPercent: 100,
              mediaKey,
            },
          },
        };
      },
      false,
      'media/setUploaded',
    ),

  setPhotoAnalyzed: (id, analysis) =>
    set(
      (state) => {
        const photo = state.photos[id];
        if (!photo) return state;
        if (!isValidTransition(photo.status, 'analyzed')) return state;
        return {
          photos: {
            ...state.photos,
            [id]: { ...photo, status: 'analyzed', analysis },
          },
        };
      },
      false,
      'media/setAnalyzed',
    ),

  setPhotoFailed: (id, errorMessage) =>
    set(
      (state) => {
        const photo = state.photos[id];
        if (!photo) return state;
        // 'failed' is reachable from any non-terminal status.
        if (photo.status === 'analyzed' || photo.status === 'failed') {
          return state;
        }
        return {
          photos: {
            ...state.photos,
            [id]: { ...photo, status: 'failed', errorMessage },
          },
        };
      },
      false,
      'media/setFailed',
    ),

  removePhoto: (id) =>
    set(
      (state) => {
        if (!(id in state.photos)) return state;
        const next = { ...state.photos };
        delete next[id];
        return { photos: next };
      },
      false,
      'media/remove',
    ),

  clearPhotos: () => set({ photos: {} }, false, 'media/clear'),
});
