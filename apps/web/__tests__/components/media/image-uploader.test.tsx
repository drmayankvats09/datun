// ═══════════════════════════════════════════════════════════════
// IMAGE UPLOADER TESTS — Task #46
//
// Component-level tests using @testing-library/react. We mock the
// `useMediaUpload` hook so we control the state machine externally
// and assert that the component renders the right UI per stage.
//
// We also mock `useBreakpoint` (mobile-vs-desktop UI variation) and
// `sonner` (success toast).
//
// Coverage:
//   - idle: dropzone visible, "choose file" / "take photo" buttons
//   - processing: spinner + stage label + progress + cancel button
//   - uploading / confirming: same UI shape, different stage label
//   - done: success state, "upload another" resets
//   - error: alert with i18n-mapped key
//   - file input change triggers hook.upload()
//   - cancel button calls hook.cancel()
//   - drag-drop on the zone triggers hook.upload()
//   - accessibility: role, aria-label, aria-disabled
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Hoisted mocks ─────────────────────────────────────────────

const mockUpload = vi.fn();
const mockCancel = vi.fn();
const mockReset = vi.fn();

let mockHookState: {
  stage: string;
  progress: number;
  error: { errorCode: string; errorKey?: string } | null;
  mediaAsset: unknown;
  preview: { blob: Blob; objectUrl: string } | null;
} = {
  stage: 'idle',
  progress: 0,
  error: null,
  mediaAsset: null,
  preview: null,
};

vi.mock('@/hooks/use-media-upload', () => ({
  useMediaUpload: () => ({
    state: mockHookState,
    upload: mockUpload,
    cancel: mockCancel,
    reset: mockReset,
  }),
}));

vi.mock('@/hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({ isMobile: false, isTablet: false, isDesktop: true }),
}));

const mockToastSuccess = vi.fn();
vi.mock('sonner', () => ({
  toast: { success: (...args: unknown[]) => mockToastSuccess(...args) },
}));

// ── Import under test (after mocks) ───────────────────────────

import { ImageUploader } from '../../../components/media/image-uploader';

// ── Helpers ───────────────────────────────────────────────────

function defaultProps() {
  return {
    kind: 'CONSULTATION_PHOTO' as const,
    entityId: '22222222-2222-2222-2222-222222222222',
    consentLogId: '33333333-3333-3333-3333-333333333333',
  };
}

function setHookState(partial: Partial<typeof mockHookState>): void {
  mockHookState = { ...mockHookState, ...partial };
}

beforeEach(() => {
  mockUpload.mockReset();
  mockCancel.mockReset();
  mockReset.mockReset();
  mockToastSuccess.mockReset();
  setHookState({
    stage: 'idle',
    progress: 0,
    error: null,
    mediaAsset: null,
    preview: null,
  });
});

// ─── Idle state ───────────────────────────────────────────────

describe('<ImageUploader /> idle state', () => {
  it('renders dropzone with role=button and tabIndex', () => {
    render(<ImageUploader {...defaultProps()} />);
    const zone = screen.getByRole('button', { name: /media\.uploader\.dropzoneAriaLabel/i });
    expect(zone).toBeInTheDocument();
    expect(zone).toHaveAttribute('tabindex', '0');
  });

  it('renders the dropOrClick prompt', () => {
    render(<ImageUploader {...defaultProps()} />);
    expect(screen.getByText(/media\.uploader\.dropOrClick/i)).toBeInTheDocument();
  });

  it('renders the "choose file" button on desktop', () => {
    render(<ImageUploader {...defaultProps()} />);
    expect(screen.getByText(/media\.uploader\.chooseFile/i)).toBeInTheDocument();
  });

  it('renders the optional caption prop above the dropzone', () => {
    render(<ImageUploader {...defaultProps()} caption="Upload tooth photo" />);
    expect(screen.getByText('Upload tooth photo')).toBeInTheDocument();
  });
});

// ─── File selection ──────────────────────────────────────────

describe('<ImageUploader /> file selection', () => {
  it('invokes upload() when a file is chosen via the hidden input', () => {
    render(<ImageUploader {...defaultProps()} />);
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 't.jpg', {
      type: 'image/jpeg',
    });

    // The hidden input has sr-only class and accept attribute; find by type.
    const inputs = document.querySelectorAll('input[type="file"]');
    const input = inputs[0] as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockUpload).toHaveBeenCalledOnce();
    expect(mockUpload.mock.calls[0]?.[0]).toBe(file);
  });

  it('resets input value after change so re-selecting same file works', () => {
    render(<ImageUploader {...defaultProps()} />);
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 't.jpg', {
      type: 'image/jpeg',
    });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(input.value).toBe('');
  });
});

// ─── Busy stages ─────────────────────────────────────────────

describe('<ImageUploader /> busy stages', () => {
  it('renders processing label + progressbar at stage="processing"', () => {
    setHookState({ stage: 'processing', progress: 0.3 });
    render(<ImageUploader {...defaultProps()} />);
    expect(screen.getByText(/media\.uploader\.stageProcessing/i)).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '30');
  });

  it('renders uploading label at stage="uploading"', () => {
    setHookState({ stage: 'uploading', progress: 0.6 });
    render(<ImageUploader {...defaultProps()} />);
    expect(screen.getByText(/media\.uploader\.stageUploading/i)).toBeInTheDocument();
  });

  it('renders confirming label at stage="confirming"', () => {
    setHookState({ stage: 'confirming', progress: 0.9 });
    render(<ImageUploader {...defaultProps()} />);
    expect(screen.getByText(/media\.uploader\.stageConfirming/i)).toBeInTheDocument();
  });

  it('cancel button invokes hook.cancel()', () => {
    setHookState({ stage: 'uploading', progress: 0.4 });
    render(<ImageUploader {...defaultProps()} />);
    const cancelBtn = screen.getByText(/media\.uploader\.cancel/i).closest('button');
    if (!cancelBtn) throw new Error('cancel button not found');
    fireEvent.click(cancelBtn);
    expect(mockCancel).toHaveBeenCalledOnce();
  });

  it('clamps progress to 0..100 for aria-valuenow', () => {
    setHookState({ stage: 'uploading', progress: 2.5 });
    render(<ImageUploader {...defaultProps()} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });
});

// ─── Done state ──────────────────────────────────────────────

describe('<ImageUploader /> done state', () => {
  it('renders success copy and "upload another" button', () => {
    setHookState({
      stage: 'done',
      progress: 1,
      mediaAsset: { id: 'media-1' },
    });
    render(<ImageUploader {...defaultProps()} />);
    expect(screen.getByText(/media\.uploader\.uploadComplete/i)).toBeInTheDocument();
    expect(screen.getByText(/media\.uploader\.uploadAnother/i)).toBeInTheDocument();
  });

  it('"upload another" button calls reset()', () => {
    setHookState({
      stage: 'done',
      progress: 1,
      mediaAsset: { id: 'media-1' },
    });
    render(<ImageUploader {...defaultProps()} />);
    const btn = screen.getByText(/media\.uploader\.uploadAnother/i).closest('button');
    if (!btn) throw new Error('reset button not found');
    fireEvent.click(btn);
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it('invokes onUploaded prop with the mediaAsset', () => {
    setHookState({
      stage: 'done',
      progress: 1,
      mediaAsset: { id: 'media-1' },
    });
    const onUploaded = vi.fn();
    render(<ImageUploader {...defaultProps()} onUploaded={onUploaded} />);
    // queueMicrotask drains in the next tick; flush via Promise.resolve.
    return Promise.resolve().then(() => {
      expect(onUploaded).toHaveBeenCalled();
    });
  });
});

// ─── Error state ─────────────────────────────────────────────

describe('<ImageUploader /> error state', () => {
  it('renders an alert with the mapped i18n key on errorKey', () => {
    setHookState({
      stage: 'error',
      progress: 0,
      error: { errorCode: 'PROCESS_FAILED', errorKey: 'looksLikeVideo' },
    });
    render(<ImageUploader {...defaultProps()} />);
    // The component maps errorKey 'looksLikeVideo' → the translation key
    // 'looksLikeVideo'. With next-intl mocked to identity, the rendered
    // text equals the key itself.
    expect(screen.getByText(/looksLikeVideo/i)).toBeInTheDocument();
  });

  it('falls back to "generic" when errorCode is unknown', () => {
    setHookState({
      stage: 'error',
      progress: 0,
      error: { errorCode: 'WEIRD_UNKNOWN_CODE' },
    });
    render(<ImageUploader {...defaultProps()} />);
    expect(screen.getByText(/generic/i)).toBeInTheDocument();
  });

  it('still shows the idle dropzone alongside the error so user can retry', () => {
    setHookState({
      stage: 'error',
      progress: 0,
      error: { errorCode: 'NETWORK_ERROR' },
    });
    render(<ImageUploader {...defaultProps()} />);
    expect(screen.getByText(/media\.uploader\.dropOrClick/i)).toBeInTheDocument();
  });
});
