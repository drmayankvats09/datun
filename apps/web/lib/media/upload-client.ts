// ═══════════════════════════════════════════════════════════════
// MEDIA UPLOAD CLIENT — Task #46 frontend API surface
//
// Typed client for the /api/media/* endpoints. Three concerns:
//   1. requestUploadIntent — POST /api/media/upload-intent
//   2. uploadDirectToR2     — XHR PUT to the signed URL (with progress)
//   3. confirmUpload        — POST /api/media/:id/confirm
//   plus getMediaAsset, deleteMedia for read/delete paths.
//
// XHR (not fetch) is used for the R2 PUT because:
//   - Browser fetch() does NOT expose upload progress events. XHR does.
//     Progress is critical for clinical UX — patient watching a 3 MB
//     photo upload over flaky 4G needs feedback, not a spinner.
//   - Stream-based fetch upload (ReadableStream body) is Chrome-only
//     and requires HTTP/2 — Safari/Firefox don't support it yet.
//
// Auth: Bearer token from lib/auth.ts (existing single-flight refresh
// + 401-retry pattern). Mirrors lib/training-api.ts conventions for
// consistency across all FE-↔-BE clients.
// ═══════════════════════════════════════════════════════════════

import type {
  MediaAssetDTO,
  MediaKind,
  RequestUploadIntentBody,
  ConfirmUploadBody,
  DeleteMediaBody,
} from '@repo/shared';
import { getAccessToken } from '../auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── Response envelope (mirrors API contract) ─────────────────

interface ApiSuccess<T> {
  readonly success: true;
  readonly data: T;
}
interface ApiFailure {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: Record<string, string[]>;
  };
}
type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/**
 * Typed Result returned by every client method — Result<T, E> pattern.
 * Callers branch on `ok` rather than try/catch. Network failures
 * surface as `ok: false` with a synthetic error code 'NETWORK_ERROR'.
 */
export type ClientResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly errorCode: string;
      readonly errorMessage: string;
      readonly details?: Record<string, string[]>;
      readonly httpStatus?: number;
    };

// ─── Upload intent DTO (matches backend response) ─────────────

export interface UploadIntentResponse {
  readonly mediaId: string;
  readonly uploadUrl: string;
  readonly requiredHeaders: Record<string, string>;
  readonly storageKey: string;
  readonly ttlSeconds: number;
  readonly maxBytes: number;
  readonly kind: MediaKind;
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Step 1 of upload: ask the API for a signed R2 PUT URL.
 *
 * Server validates the request body (Zod schema in @repo/shared) and
 * may refuse for: missing consent, exceeding per-entity active limit,
 * unsupported MIME, oversize. Refusals come back as ClientResult.ok=false
 * with a stable errorCode the UI maps to localised copy.
 */
export async function requestUploadIntent(
  body: RequestUploadIntentBody,
): Promise<ClientResult<UploadIntentResponse>> {
  return jsonPost<UploadIntentResponse>('/api/media/upload-intent', body);
}

/**
 * Step 2 of upload: PUT the processed bytes directly to R2 using the
 * signed URL we just got. The browser → R2 byte transfer NEVER hits
 * our API server. Yields progress callbacks suitable for a progress UI.
 *
 * The `requiredHeaders` map MUST be passed exactly as the API returned
 * it — R2 signature was computed over those header values; mismatching
 * returns 403 SignatureDoesNotMatch.
 */
export function uploadDirectToR2(args: {
  readonly uploadUrl: string;
  readonly requiredHeaders: Record<string, string>;
  readonly blob: Blob;
  readonly onProgress?: (progressFraction: number) => void;
  readonly signal?: AbortSignal;
}): Promise<ClientResult<{ readonly etag: string | null }>> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', args.uploadUrl, true);

    for (const [key, value] of Object.entries(args.requiredHeaders)) {
      try {
        xhr.setRequestHeader(key, value);
      } catch {
        // Some browsers refuse "unsafe" headers (e.g., Content-Length).
        // R2 only requires Content-Type to match the signed value; the
        // browser sets Content-Length automatically from the blob.
      }
    }

    if (args.onProgress) {
      xhr.upload.onprogress = (event): void => {
        if (event.lengthComputable && event.total > 0) {
          args.onProgress!(event.loaded / event.total);
        }
      };
    }

    xhr.onload = (): void => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader('etag');
        resolve({ ok: true, data: { etag } });
      } else {
        resolve({
          ok: false,
          errorCode: 'R2_UPLOAD_FAILED',
          errorMessage: `R2 returned ${xhr.status}`,
          httpStatus: xhr.status,
        });
      }
    };

    xhr.onerror = (): void => {
      resolve({
        ok: false,
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Network error during R2 upload',
      });
    };

    xhr.ontimeout = (): void => {
      resolve({
        ok: false,
        errorCode: 'UPLOAD_TIMEOUT',
        errorMessage: 'Upload timed out',
      });
    };

    if (args.signal) {
      if (args.signal.aborted) {
        xhr.abort();
        resolve({ ok: false, errorCode: 'ABORTED', errorMessage: 'Upload aborted' });
        return;
      }
      args.signal.addEventListener('abort', () => {
        xhr.abort();
        resolve({ ok: false, errorCode: 'ABORTED', errorMessage: 'Upload aborted' });
      });
    }

    xhr.send(args.blob);
  });
}

/**
 * Step 3 of upload: tell the API the bytes are in R2; enqueue the
 * worker pipeline. Returns the freshly-updated MediaAsset DTO so the
 * UI can start showing the blurhash placeholder + spinner state.
 */
export async function confirmUpload(
  mediaId: string,
  body: ConfirmUploadBody,
): Promise<ClientResult<MediaAssetDTO>> {
  return jsonPost<MediaAssetDTO>(`/api/media/${encodeURIComponent(mediaId)}/confirm`, body);
}

/**
 * Fetch the latest DTO for a media asset — picks up status transitions
 * (UPLOADED → PROCESSING → READY) and the freshly-signed variant URLs.
 * UI polls this every ~3s while the asset is still PROCESSING.
 */
export async function getMediaAsset(mediaId: string): Promise<ClientResult<MediaAssetDTO>> {
  return jsonGet<MediaAssetDTO>(`/api/media/${encodeURIComponent(mediaId)}`);
}

/**
 * Soft-delete or DPDP hard-purge. Server runs the cascade (R2 origin
 * + CF Images variants + audit log) atomically.
 */
export async function deleteMedia(
  mediaId: string,
  body: DeleteMediaBody,
): Promise<ClientResult<{ readonly id: string; readonly deleted: true }>> {
  return jsonDelete<{ id: string; deleted: true }>(
    `/api/media/${encodeURIComponent(mediaId)}`,
    body,
  );
}

// ─── Internal HTTP helpers ────────────────────────────────────

async function jsonPost<T>(path: string, body: unknown): Promise<ClientResult<T>> {
  return jsonRequest<T>('POST', path, body);
}

async function jsonGet<T>(path: string): Promise<ClientResult<T>> {
  return jsonRequest<T>('GET', path);
}

async function jsonDelete<T>(path: string, body?: unknown): Promise<ClientResult<T>> {
  return jsonRequest<T>('DELETE', path, body);
}

async function jsonRequest<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<ClientResult<T>> {
  const url = `${API_BASE}${path}`;
  const token = getAccessToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'omit',
    });
  } catch (err) {
    return {
      ok: false,
      errorCode: 'NETWORK_ERROR',
      errorMessage: (err as Error).message,
    };
  }

  let payload: ApiResponse<T>;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    return {
      ok: false,
      errorCode: 'INVALID_JSON',
      errorMessage: `Server returned non-JSON (status ${response.status})`,
      httpStatus: response.status,
    };
  }

  if (payload.success === false) {
    return {
      ok: false,
      errorCode: payload.error.code,
      errorMessage: payload.error.message,
      details: payload.error.details,
      httpStatus: response.status,
    };
  }
  return { ok: true, data: payload.data };
}
