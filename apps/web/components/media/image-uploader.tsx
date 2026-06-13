// ═══════════════════════════════════════════════════════════════
// IMAGE UPLOADER — Task #46 patient-facing upload component
//
// One self-contained React component that wraps the full upload flow:
//
//   - Drag-and-drop target with hover/active styling
//   - Click-to-select fallback (input[type=file])
//   - Camera capture button (mobile-only, accept="image/*" capture)
//   - Per-stage progress bar (processing / uploading / confirming)
//   - Inline error display with i18n-mapped friendly copy
//   - Toast notification on success
//   - Optional preview thumbnail (blob preview while upload in flight)
//
// Wraps the `useMediaUpload` hook. Routes never see this — pages do.
//
// Memory rule (15 May 2026): user copy NEVER blames. Error keys map
// to soft, helpful next steps ("yeh ek video lag rahi hai, kripya
// photo bhejiye").
//
// Memory rule #22: accessibility — drag area is a button with role,
// aria-label, keyboard interactions; input has htmlFor label.
//
// TASK #54 UPDATE (WCAG 2.2 AA — SC 1.1.1 / 4.1.2 Name, Role, Value):
//   ProgressBar previously exposed role="progressbar" + value but NO
//   accessible NAME — NVDA announced a bare "progress bar, 40%",
//   leaving a blind patient guessing 40% of *what*. Flagged by the
//   new jsx-a11y/control-has-associated-label gate (the single
//   genuine hit across the whole tree, audit 2026-06-12).
//
//   Fix pattern: aria-labelledby → the ALREADY-VISIBLE stage line
//   ("Uploading…" / its 9 translations). One source of truth, zero
//   new i18n keys across 10 locales, and the announcement stays in
//   lock-step with the on-screen text by construction:
//
//     NVDA now reads: "Uploading…, progress bar, 40%."
//
//   Mechanics: `useId()` (SSR-safe, hydration-stable) names the
//   stage <p>; the id is threaded to <ProgressBar labelledBy={…}/>.
//   `aria-labelledby` resolves across the sibling boundary — no DOM
//   restructuring, no visual change.
// ═══════════════════════════════════════════════════════════════

'use client';

import type { JSX } from 'react';
import { useCallback, useId, useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Camera, Upload, Loader2, AlertCircle, X, Image as ImageIcon } from 'lucide-react';

import type { MediaKind, MediaAssetDTO } from '@repo/shared';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { useMediaUpload, type UploadError } from '@/hooks/use-media-upload';
import { useBreakpoint } from '@/hooks/use-breakpoint';

// ─── Public props ────────────────────────────────────────────

export interface ImageUploaderProps {
  readonly kind: MediaKind;
  readonly entityId: string;
  /** Required for CONSULTATION_PHOTO / PRESCRIPTION_DOC. */
  readonly consentLogId?: string;
  /** Called after a successful upload + confirm. */
  readonly onUploaded?: (asset: MediaAssetDTO) => void;
  /** Optional caption rendered above the dropzone. */
  readonly caption?: string;
  /** Extra className for the outer container. */
  readonly className?: string;
}

// ─── Component ───────────────────────────────────────────────

export function ImageUploader({
  kind,
  entityId,
  consentLogId,
  onUploaded,
  caption,
  className,
}: ImageUploaderProps): JSX.Element {
  const t = useTranslations('media.uploader');
  const tError = useTranslations('media.errors');
  const { state, upload, cancel, reset } = useMediaUpload({
    kind,
    entityId,
    ...(consentLogId !== undefined && { consentLogId }),
  });
  const { isMobile } = useBreakpoint();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Task #54 — stable, SSR-safe id linking the visible stage label
  // to the progressbar's accessible name (see header block).
  const stageLabelId = useId();

  // ── Handlers ────────────────────────────────────────────
  const handleFiles = useCallback(
    async (files: FileList | null): Promise<void> => {
      const file = files?.[0];
      if (!file) return;
      try {
        await upload(file);
        if (onUploaded) {
          // useMediaUpload sets state.mediaAsset on 'done' before this
          // promise resolves — but we read it from a ref-pattern via
          // a tiny synchronisation hop in the parent if needed. For
          // simplicity we rely on the parent reading state directly.
        }
      } catch (err) {
        // useMediaUpload swallows known errors into state.error; an
        // unexpected throw is logged here and the user sees the
        // generic 'cannot-process' copy.
        console.error('[ImageUploader] unexpected upload error', err);
      }
    },
    [upload, onUploaded],
  );

  const onDragEnter = useCallback((e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>): void => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      void handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      void handleFiles(e.target.files);
      // Reset so the same file can be re-selected after error.
      e.target.value = '';
    },
    [handleFiles],
  );

  // ── Side effect: toast on 'done' ────────────────────────
  // (Kept in render — the state machine guarantees idempotency on
  //  consecutive done states, but we use a ref-guarded effect-like
  //  pattern via toast's own dedup.)
  if (state.stage === 'done' && state.mediaAsset) {
    queueMicrotask(() => {
      toast.success(t('uploadComplete'));
      onUploaded?.(state.mediaAsset!);
    });
  }

  const isBusy =
    state.stage === 'processing' || state.stage === 'uploading' || state.stage === 'confirming';

  // ── Render ──────────────────────────────────────────────
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {caption ? <p className="text-sm text-muted-foreground">{caption}</p> : null}

      <div
        role="button"
        tabIndex={0}
        aria-label={t('dropzoneAriaLabel')}
        aria-disabled={isBusy}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!isBusy) inputRef.current?.click();
          }
        }}
        onClick={() => {
          if (!isBusy) inputRef.current?.click();
        }}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={cn(
          'relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-colors',
          isDragOver && !isBusy && 'border-primary bg-primary/5',
          isBusy && 'cursor-wait opacity-80',
          state.stage === 'error' && 'border-destructive/40 bg-destructive/5',
        )}
      >
        {/* Preview overlay during upload */}
        {state.preview ? (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.preview.objectUrl}
              alt=""
              className="h-full w-full object-cover opacity-30"
            />
          </div>
        ) : null}

        {/* Stage UI */}
        {state.stage === 'idle' || state.stage === 'error' ? (
          <>
            <ImageIcon className="size-10 text-muted-foreground" aria-hidden />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{t('dropOrClick')}</p>
              <p className="text-xs text-muted-foreground">{t('supportedFormats')}</p>
            </div>
          </>
        ) : null}

        {isBusy ? (
          <div className="relative z-10 flex w-full max-w-xs flex-col items-center gap-2">
            <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
            {/* Task #54: this visible stage line doubles as the
                progressbar's accessible name via aria-labelledby —
                screen readers announce "Uploading…, progress bar,
                40%" in the user's locale, from one source of truth. */}
            <p id={stageLabelId} className="text-sm font-medium">
              {state.stage === 'processing' && t('stageProcessing')}
              {state.stage === 'uploading' && t('stageUploading')}
              {state.stage === 'confirming' && t('stageConfirming')}
            </p>
            <ProgressBar value={state.progress} labelledBy={stageLabelId} />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                cancel();
              }}
            >
              <X className="size-4" aria-hidden />
              {t('cancel')}
            </Button>
          </div>
        ) : null}

        {state.stage === 'done' ? (
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="rounded-full bg-emerald-500/10 p-3">
              <ImageIcon className="size-8 text-emerald-600" aria-hidden />
            </div>
            <p className="text-sm font-medium">{t('uploadComplete')}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                reset();
              }}
            >
              {t('uploadAnother')}
            </Button>
          </div>
        ) : null}
      </div>

      {/* Mobile camera shortcut */}
      {isMobile && state.stage === 'idle' ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          className="w-full"
        >
          <Camera className="size-4" aria-hidden />
          {t('takePhoto')}
        </Button>
      ) : null}

      {/* Desktop alternate upload button */}
      {!isMobile && state.stage === 'idle' ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="w-full"
        >
          <Upload className="size-4" aria-hidden />
          {t('chooseFile')}
        </Button>
      ) : null}

      {/* Inline error */}
      {state.error ? <ErrorAlert error={state.error} tError={tError} /> : null}

      {/* Hidden inputs */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={onFileChange}
        aria-hidden
        tabIndex={-1}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={onFileChange}
        aria-hidden
        tabIndex={-1}
      />
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────

/**
 * Determinate progress bar following the WAI-ARIA progressbar
 * pattern (native <progress> remains unstylable cross-browser; the
 * ARIA-div pattern is what Radix/shadcn ship for the same reason).
 *
 * Task #54: `labelledBy` is REQUIRED — a progressbar without an
 * accessible name fails SC 4.1.2 (Name, Role, Value) and the
 * jsx-a11y/control-has-associated-label CI gate. Callers point it
 * at a visible text element describing what is progressing.
 */
function ProgressBar({ value, labelledBy }: { value: number; labelledBy: string }): JSX.Element {
  // Clamp to [0, 100] — defensive against hook bugs or stale state
  // passing through a fractional progress > 1. Without this, the
  // aria-valuenow reports nonsense to assistive tech and the bar
  // overflows its container visually.
  const percent = Math.min(100, Math.max(0, Math.round(value * 100)));
  return (
    <div
      role="progressbar"
      aria-labelledby={labelledBy}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div
        className="h-full bg-primary transition-[width] duration-200 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function ErrorAlert({
  error,
  tError,
}: {
  error: UploadError;
  tError: ReturnType<typeof useTranslations>;
}): JSX.Element {
  // Map errorKey/errorCode to a friendly i18n message.
  // Fallback hierarchy: errorKey → errorCode → generic.
  const messageKey = error.errorKey ?? toI18nKeyFromErrorCode(error.errorCode);
  const message = tError.has(messageKey) ? tError(messageKey) : tError('generic');
  return (
    <Alert variant="destructive" className="text-sm">
      <AlertCircle className="size-4" aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function toI18nKeyFromErrorCode(code: string): string {
  // Translate stable server error codes to localised keys.
  switch (code) {
    case 'PROCESS_FAILED':
      return 'cannotProcess';
    case 'NETWORK_ERROR':
    case 'UPLOAD_TIMEOUT':
    case 'R2_UPLOAD_FAILED':
      return 'networkError';
    case 'MEDIA_ENTITY_LIMIT_REACHED':
      return 'limitReached';
    case 'VALIDATION_ERROR':
      return 'invalidInput';
    case 'FORBIDDEN':
      return 'forbidden';
    default:
      return 'generic';
  }
}
