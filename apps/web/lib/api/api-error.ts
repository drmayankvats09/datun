// apps/web/lib/api/api-error.ts
// ═══════════════════════════════════════════════════════════════
// API ERROR TYPES — Task #47 Phase 1
//
// Typed errors thrown by the API client layer. Catch with
// `instanceof ApiError` (or `isApiError(error)` for cross-realm
// safety, e.g. when errors cross HMR module-graph reloads or
// iframe boundaries) to discriminate from `NetworkError`
// (request never reached server) and raw JavaScript errors.
//
// Why structural type guards in addition to `instanceof`:
//   - During Next.js Fast Refresh / HMR, module duplication can
//     produce two distinct `ApiError` classes in the same runtime —
//     `instanceof` then yields false negatives.
//   - The structural check (`error.name === 'ApiError'` AND has
//     `statusCode`) survives that. Stripe's JS SDK uses the same
//     pattern for its `StripeError` family.
//
// What this is NOT for:
//   - Generic JS errors (TypeError, ReferenceError) → let them bubble
//   - Abort signals (DOMException 'AbortError') → propagate, never
//     wrap; TanStack Query needs the raw signal to mark queries as
//     cancelled instead of failed.
// ═══════════════════════════════════════════════════════════════

import { ERROR_CODES, type ErrorCode } from '@repo/shared';

export interface ApiErrorOptions {
  readonly statusCode: number;
  readonly code: ErrorCode | string;
  readonly message: string;
  readonly details?: Record<string, string[]>;
  readonly cause?: unknown;
}

/** Thrown when the server returns `{ success: false, error: {...} }`. */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode | string;
  readonly details: Record<string, string[]> | undefined;

  constructor(options: ApiErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'ApiError';
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;

    // V8/Node only — safe no-op elsewhere. Keeps the constructor frame
    // out of the captured trace.
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /** True when the error indicates an auth/session failure. */
  get isAuthError(): boolean {
    return (
      this.statusCode === 401 ||
      this.code === ERROR_CODES.UNAUTHORIZED ||
      this.code === ERROR_CODES.TOKEN_EXPIRED
    );
  }

  /** True when the error reports validation failure (HTTP 400). */
  get isValidationError(): boolean {
    return this.statusCode === 400 || this.code === ERROR_CODES.VALIDATION_FAILED;
  }

  /** True for HTTP 5xx — server-side failures. Generally retry-safe. */
  get isServerError(): boolean {
    return this.statusCode >= 500;
  }

  /** True for HTTP 429 / RATE_LIMIT_EXCEEDED. UI should back off. */
  get isRateLimited(): boolean {
    return this.statusCode === 429 || this.code === ERROR_CODES.RATE_LIMIT_EXCEEDED;
  }

  /** True for HTTP 404 / NOT_FOUND. Surfacing this often warrants a redirect. */
  get isNotFound(): boolean {
    return this.statusCode === 404 || this.code === ERROR_CODES.NOT_FOUND;
  }
}

/**
 * Thrown when the request never reached the server: DNS failure,
 * offline, CORS preflight failure, fetch throw (e.g. blocked by
 * ad-blocker, mixed-content). Distinct from `ApiError` because the
 * remediation is different — usually "check connection" vs
 * "fix the request".
 */
export class NetworkError extends Error {
  readonly isNetworkError = true as const;

  constructor(message = 'Network request failed', options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'NetworkError';

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, NetworkError);
    }
  }
}

// ─── Type guards (structural — HMR-safe) ───────────────────────

/** Structural type guard — works across module duplication / HMR boundaries. */
export function isApiError(error: unknown): error is ApiError {
  if (error instanceof ApiError) return true;
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { name?: unknown }).name === 'ApiError' &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number' &&
    typeof (error as { code?: unknown }).code !== 'undefined'
  );
}

/** Structural type guard for NetworkError. */
export function isNetworkError(error: unknown): error is NetworkError {
  if (error instanceof NetworkError) return true;
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { isNetworkError?: unknown }).isNetworkError === true
  );
}
