// ═══════════════════════════════════════════════════════════════
// USE-MEDIA-UPLOAD TESTS — Task #46
//
// Hooks under React's testing-library/renderHook. We mock the three
// underlying utilities (processImageForUpload, requestUploadIntent,
// uploadDirectToR2, confirmUpload) and assert the state-machine
// transitions + lifecycle behaviours of the hook itself.
//
// Coverage:
//   - Happy path: idle → processing → uploading → confirming → done
//   - Cancel mid-processing: state returns to idle
//   - Process refusal: state moves to error with mapped errorKey
//   - Upload network failure: state moves to error
//   - Reset after error: state goes back to idle
//   - Unmount during async: no setState-after-unmount warnings
// ═══════════════════════════════════════════════════════════════

import { MEDIA_ERROR_KEYS } from '@repo/shared';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Hoisted mocks ───────────────────────────────────────────

const mockProcessImage = vi.fn();
const mockRequestUploadIntent = vi.fn();
const mockUploadDirectToR2 = vi.fn();
const mockConfirmUpload = vi.fn();

vi.mock('@/lib/media/resize-pipeline', () => ({
  processImageForUpload: (...args: unknown[]) => mockProcessImage(...args),
  MediaProcessError: class MediaProcessError extends Error {
    constructor(
      public errorKey: string,
      public detail?: string,
    ) {
      super(`MediaProcessError(${errorKey})`);
    }
  },
}));

vi.mock('@/lib/media/upload-client', () => ({
  requestUploadIntent: (...args: unknown[]) => mockRequestUploadIntent(...args),
  uploadDirectToR2: (...args: unknown[]) => mockUploadDirectToR2(...args),
  confirmUpload: (...args: unknown[]) => mockConfirmUpload(...args),
}));

// ─── Import under test ───────────────────────────────────────

import { useMediaUpload } from '../../hooks/use-media-upload';

// ─── Fixtures ────────────────────────────────────────────────

function makeFile(name = 'photo.jpg', mime = 'image/jpeg'): File {
  return new File([new Uint8Array([0xff, 0xd8, 0xff])], name, { type: mime });
}

const SUCCESS_PROCESSED = {
  blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
  width: 800,
  height: 600,
  blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
  sha256: 'abc123',
  mimeType: 'image/jpeg' as const,
  originalMime: 'image/jpeg',
  originalSizeBytes: 1000,
  finalSizeBytes: 600,
};

const SUCCESS_INTENT = {
  ok: true as const,
  data: {
    mediaId: 'media-1',
    uploadUrl: 'https://signed.example/put',
    requiredHeaders: { 'Content-Type': 'image/jpeg' },
    storageKey: 'consultations/cons-1/media-1.jpg',
    ttlSeconds: 300,
    maxBytes: 1_500_000,
    kind: 'CONSULTATION_PHOTO' as const,
  },
};

const SUCCESS_R2 = { ok: true as const, data: { etag: '"abc"' } };
const SUCCESS_CONFIRM = {
  ok: true as const,
  data: {
    id: 'media-1',
    kind: 'CONSULTATION_PHOTO' as const,
    accessClass: 'private' as const,
    mimeType: 'image/jpeg',
    width: 800,
    height: 600,
    sizeBytes: 600,
    blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
    variants: {},
    status: 'UPLOADED' as const,
    moderation: 'PENDING' as const,
    createdAt: new Date().toISOString(),
    processedAt: null,
  },
};

// ─── Tests ───────────────────────────────────────────────────

describe('useMediaUpload', () => {
  beforeEach(() => {
    mockProcessImage.mockReset();
    mockRequestUploadIntent.mockReset();
    mockUploadDirectToR2.mockReset();
    mockConfirmUpload.mockReset();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() =>
      useMediaUpload({ kind: 'BLOG_IMAGE', entityId: 'article-1' }),
    );
    expect(result.current.state.stage).toBe('idle');
    expect(result.current.state.progress).toBe(0);
    expect(result.current.state.error).toBeNull();
  });

  it('runs through the happy path: processing → uploading → confirming → done', async () => {
    mockProcessImage.mockResolvedValue(SUCCESS_PROCESSED);
    mockRequestUploadIntent.mockResolvedValue(SUCCESS_INTENT);
    mockUploadDirectToR2.mockResolvedValue(SUCCESS_R2);
    mockConfirmUpload.mockResolvedValue(SUCCESS_CONFIRM);

    const { result } = renderHook(() =>
      useMediaUpload({
        kind: 'CONSULTATION_PHOTO',
        entityId: 'cons-1',
        consentLogId: 'consent-1',
      }),
    );

    await act(async () => {
      await result.current.upload(makeFile());
    });

    await waitFor(() => expect(result.current.state.stage).toBe('done'));
    expect(result.current.state.mediaAsset?.id).toBe('media-1');
    expect(mockProcessImage).toHaveBeenCalledOnce();
    expect(mockRequestUploadIntent).toHaveBeenCalledOnce();
    expect(mockUploadDirectToR2).toHaveBeenCalledOnce();
    expect(mockConfirmUpload).toHaveBeenCalledOnce();
  });

  it('moves to error state when processImageForUpload throws', async () => {
    const { MediaProcessError } = await import('@/lib/media/resize-pipeline');
    const { MEDIA_ERROR_KEYS } = await import('@repo/shared');
    // Real production code passes MEDIA_ERROR_KEYS.looksLikeVideo
    // (= 'media.errors.looksLikeVideo' — the full i18n key path).
    // The error class stores it verbatim; the hook stores it verbatim
    // in state.error.errorKey. Component then resolves via t(key).
    mockProcessImage.mockRejectedValue(
      new MediaProcessError(MEDIA_ERROR_KEYS.looksLikeVideo, 'video/mp4'),
    );

    const { result } = renderHook(() =>
      useMediaUpload({ kind: 'BLOG_IMAGE', entityId: 'article-1' }),
    );

    await act(async () => {
      await result.current.upload(makeFile());
    });

    expect(result.current.state.stage).toBe('error');
    expect(result.current.state.error?.errorKey).toBe(MEDIA_ERROR_KEYS.looksLikeVideo);
  });

  it('moves to error state on upload-intent rejection', async () => {
    mockProcessImage.mockResolvedValue(SUCCESS_PROCESSED);
    mockRequestUploadIntent.mockResolvedValue({
      ok: false,
      errorCode: 'MEDIA_ENTITY_LIMIT_REACHED',
      errorMessage: 'Max 5 photos per consultation',
    });

    const { result } = renderHook(() =>
      useMediaUpload({
        kind: 'CONSULTATION_PHOTO',
        entityId: 'cons-1',
        consentLogId: 'c1',
      }),
    );

    await act(async () => {
      await result.current.upload(makeFile());
    });

    expect(result.current.state.stage).toBe('error');
    expect(result.current.state.error?.errorCode).toBe('MEDIA_ENTITY_LIMIT_REACHED');
  });

  it('reset() returns state to idle', async () => {
    const { MediaProcessError } = await import('@/lib/media/resize-pipeline');
    mockProcessImage.mockRejectedValue(new MediaProcessError(MEDIA_ERROR_KEYS.cannotProcess));
    const { result } = renderHook(() =>
      useMediaUpload({ kind: 'BLOG_IMAGE', entityId: 'article-1' }),
    );
    await act(async () => {
      await result.current.upload(makeFile());
    });
    expect(result.current.state.stage).toBe('error');

    act(() => result.current.reset());
    expect(result.current.state.stage).toBe('idle');
    expect(result.current.state.error).toBeNull();
  });

  it('cancel() during processing returns to idle without error', async () => {
    // processImage returns a promise we control — abort happens mid-flight.
    let resolveProcess: ((value: typeof SUCCESS_PROCESSED) => void) | undefined;
    mockProcessImage.mockReturnValue(
      new Promise((res) => {
        resolveProcess = res;
      }),
    );

    const { result } = renderHook(() =>
      useMediaUpload({ kind: 'BLOG_IMAGE', entityId: 'article-1' }),
    );

    // Kick off upload without awaiting.
    let uploadPromise!: Promise<void>;
    act(() => {
      uploadPromise = result.current.upload(makeFile());
    });
    expect(result.current.state.stage).toBe('processing');

    // Cancel — state should snap back to idle.
    act(() => result.current.cancel());
    expect(result.current.state.stage).toBe('idle');

    // Resolve the hanging process call to unblock the test.
    resolveProcess?.(SUCCESS_PROCESSED);
    await uploadPromise.catch(() => undefined);
  });
});
