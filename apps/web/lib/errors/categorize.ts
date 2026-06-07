// apps/web/lib/errors/categorize.ts
// ═══════════════════════════════════════════════════════════════
// ERROR CATEGORIZATION — Task #52 Phase 1 (Foundation)
//
// Pure, deterministic function that maps ANY unknown error into a
// discriminated union of categories. Every error UI, audit log, and
// Sentry tag in Datun routes through this single source of truth.
//
// Why a separate module (not inline in each boundary):
//   - Components stay declarative ("show widget error UI for category
//     X"), free of branching logic on statusCode / code strings.
//   - Tests pin behaviour once; refactors anywhere downstream cannot
//     drift the taxonomy.
//   - Future error types (chunk-load, ai-service-unavailable) extend
//     the union in ONE place — every consumer picks up the new case
//     via the exhaustiveness check (`assertNever`).
//
// Aligned with:
//   - @/lib/api/api-error    — ApiError / NetworkError / isApiError
//   - @repo/shared           — ERROR_CODES / ErrorCode
//   - sentry.client.config   — beforeSend filters ChunkLoadError noise
//
// SSR-safe: zero browser globals, zero React, zero side-effects.
//
// References:
//   - Stripe's structural error guards (HMR-safe, instanceof-fallback)
//   - Linear's "calm errors" — explicit categories drive calm UI
// ═══════════════════════════════════════════════════════════════

import { ERROR_CODES, type ErrorCode } from '@repo/shared';
import { isApiError, isNetworkError, type ApiError } from '@/lib/api';

// ─── Public types ──────────────────────────────────────────────

/**
 * The exhaustive set of error categories Datun's UI surfaces respond
 * to. Adding a new category requires updating:
 *   1. This union
 *   2. categorize() — branch that produces the category
 *   3. recovery.ts — strategy for the category
 *   4. messages/en/errors.json — copy for the category (and 9 locales)
 *   5. categorize.test.ts — table-driven coverage
 */
export type ErrorCategory =
  | 'network' // Request never reached server (offline, DNS, CORS preflight, ad-blocker)
  | 'auth' // 401 / 403 — session expired, forbidden
  | 'validation' // 400 — server rejected payload shape/content
  | 'rate-limit' // 429 — too many requests
  | 'not-found' // 404 — resource missing
  | 'server' // 5xx — server-side failure (generally retry-safe)
  | 'ai-service' // Upstream AI provider unavailable (Claude/OpenAI/Gemini)
  | 'consultation-state' // CONSULTATION_EXPIRED / CONSULTATION_ALREADY_COMPLETED
  | 'chunk-load' // Next.js code-split bundle missing — deploy in flight
  | 'unknown'; // Anything else (TypeError, ReferenceError, third-party)

/**
 * Severity classification used by Sentry tagging + audit log priority.
 *
 *   - 'fatal'   — app unusable, must reload (e.g., chunk-load)
 *   - 'error'   — feature unusable, retry/redirect needed
 *   - 'warning' — user input issue, recoverable inline (e.g., validation)
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning';

/**
 * Discriminated metadata returned by `categorize()`. Pure data — no
 * methods, no instances. Safe to serialise (Sentry tags, audit logs).
 */
export interface CategorizedError {
  /** Discriminated category — drives every UI / recovery decision. */
  readonly category: ErrorCategory;
  /** Severity used for tagging / sorting in observability backends. */
  readonly severity: ErrorSeverity;
  /** True when a "Try again" button is safe to surface (no double-side-effects). */
  readonly isRetryable: boolean;
  /** HTTP statusCode when the source was an ApiError; undefined otherwise. */
  readonly statusCode: number | undefined;
  /** Backend ERROR_CODES string when the source was an ApiError; undefined otherwise. */
  readonly code: ErrorCode | string | undefined;
  /** Original `error.name` — useful for log filtering. */
  readonly name: string;
  /** Short, NON-localised, NON-PII diagnostic message — safe for Sentry tags. */
  readonly diagnosticMessage: string;
}

// ─── Heuristics (private) ──────────────────────────────────────

/**
 * Match common patterns produced by:
 *   - Next.js dynamic imports during deploy mismatch
 *   - Webpack/Turbopack chunk-load failures
 *   - Service-worker stale chunk references
 *
 * `chunk-load` is special: retry won't help (the bundle is genuinely
 * gone). The only recovery is a hard reload to fetch the new manifest.
 */
function isChunkLoadError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const err = error as { name?: unknown; message?: unknown };
  const name = typeof err.name === 'string' ? err.name : '';
  const message = typeof err.message === 'string' ? err.message : '';

  return (
    name === 'ChunkLoadError' ||
    /Loading chunk \d+ failed/i.test(message) ||
    /Loading CSS chunk \d+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message)
  );
}

/**
 * Detect Next.js framework throws (`redirect()`, `notFound()`,
 * `unauthorized()`, `forbidden()`) that MUST bubble — never categorise
 * these as errors. Custom boundaries should re-throw, not catch.
 *
 * Next.js sets a `digest` matching one of:
 *   NEXT_REDIRECT, NEXT_NOT_FOUND, NEXT_HTTP_ERROR_FALLBACK
 * on the thrown error. We treat them as `unknown` here — callers
 * (custom class boundaries) detect via `isFrameworkControlFlow()`
 * BEFORE calling `categorize()` and re-throw.
 */
export function isFrameworkControlFlow(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const digest = (error as { digest?: unknown }).digest;
  if (typeof digest !== 'string') return false;
  return (
    digest === 'NEXT_REDIRECT' ||
    digest === 'NEXT_NOT_FOUND' ||
    digest.startsWith('NEXT_HTTP_ERROR_FALLBACK')
  );
}

/**
 * Extract a SAFE diagnostic string. Truncated, no PII. Used in Sentry
 * `error.diagnostic` tag — must be cardinality-friendly (no random IDs).
 */
function buildDiagnosticMessage(error: unknown): string {
  if (error instanceof Error) {
    const head = (error.message || error.name).slice(0, 140);
    return head.replace(/\s+/g, ' ').trim() || error.name;
  }
  if (typeof error === 'string') return error.slice(0, 140);
  return 'unknown-error';
}

// ─── ApiError branching ────────────────────────────────────────

/**
 * Branch into the right category based on an ApiError instance.
 *
 * Order of checks matters — most specific first. Auth (401) is checked
 * before generic 4xx; CONSULTATION_EXPIRED is checked before generic
 * "not-found"; AI_SERVICE_UNAVAILABLE wins over generic 5xx.
 */
function categoriseApiError(error: ApiError): CategorizedError {
  const code = error.code;
  const statusCode = error.statusCode;
  const diagnosticMessage = `ApiError ${statusCode} ${String(code)}`;

  // ── Domain-specific codes first (more specific than HTTP status) ──
  if (code === ERROR_CODES.CONSULTATION_EXPIRED) {
    return {
      category: 'consultation-state',
      severity: 'error',
      isRetryable: false,
      statusCode,
      code,
      name: error.name,
      diagnosticMessage,
    };
  }
  if (code === ERROR_CODES.CONSULTATION_ALREADY_COMPLETED) {
    return {
      category: 'consultation-state',
      severity: 'warning',
      isRetryable: false,
      statusCode,
      code,
      name: error.name,
      diagnosticMessage,
    };
  }
  if (code === ERROR_CODES.AI_SERVICE_UNAVAILABLE) {
    return {
      category: 'ai-service',
      severity: 'error',
      isRetryable: true,
      statusCode,
      code,
      name: error.name,
      diagnosticMessage,
    };
  }

  // ── HTTP status grouping ──
  if (error.isAuthError) {
    return {
      category: 'auth',
      severity: 'error',
      isRetryable: false,
      statusCode,
      code,
      name: error.name,
      diagnosticMessage,
    };
  }
  if (statusCode === 403 || code === ERROR_CODES.FORBIDDEN) {
    return {
      category: 'auth',
      severity: 'error',
      isRetryable: false,
      statusCode,
      code,
      name: error.name,
      diagnosticMessage,
    };
  }
  if (error.isValidationError) {
    return {
      category: 'validation',
      severity: 'warning',
      isRetryable: false,
      statusCode,
      code,
      name: error.name,
      diagnosticMessage,
    };
  }
  if (error.isRateLimited) {
    return {
      category: 'rate-limit',
      severity: 'warning',
      isRetryable: true,
      statusCode,
      code,
      name: error.name,
      diagnosticMessage,
    };
  }
  if (error.isNotFound) {
    return {
      category: 'not-found',
      severity: 'warning',
      isRetryable: false,
      statusCode,
      code,
      name: error.name,
      diagnosticMessage,
    };
  }
  if (statusCode === 408 || error.isServerError) {
    return {
      category: 'server',
      severity: 'error',
      isRetryable: true,
      statusCode,
      code,
      name: error.name,
      diagnosticMessage,
    };
  }

  // Default ApiError fallback — preserve diagnostics, treat as unknown.
  return {
    category: 'unknown',
    severity: 'error',
    isRetryable: true,
    statusCode,
    code,
    name: error.name,
    diagnosticMessage,
  };
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Categorise any value thrown by application code. Pure, deterministic,
 * SSR-safe. Returns a `CategorizedError` describing the failure shape
 * without exposing PII.
 *
 * Callers SHOULD first guard with `isFrameworkControlFlow(error)` and
 * re-throw if true — Next.js redirect/notFound/etc. must bubble to the
 * framework, never categorise as an error.
 *
 * @example
 *   try { await api.consultations.detail(id) }
 *   catch (e) {
 *     if (isFrameworkControlFlow(e)) throw e
 *     const c = categorize(e)
 *     if (c.category === 'network') showOfflineToast()
 *   }
 */
export function categorize(error: unknown): CategorizedError {
  // ── Chunk-load — check before isApiError (chunk errors are JS errors) ──
  if (isChunkLoadError(error)) {
    return {
      category: 'chunk-load',
      severity: 'fatal',
      isRetryable: false, // retry won't help — bundle is gone; only reload
      statusCode: undefined,
      code: undefined,
      name: 'ChunkLoadError',
      diagnosticMessage: 'chunk-load-failed',
    };
  }

  // ── Network — fetch never reached server ──
  if (isNetworkError(error)) {
    return {
      category: 'network',
      severity: 'error',
      isRetryable: true,
      statusCode: undefined,
      code: undefined,
      name: 'NetworkError',
      diagnosticMessage: 'network-request-failed',
    };
  }

  // ── ApiError — the bulk of categorisation ──
  if (isApiError(error)) {
    return categoriseApiError(error);
  }

  // ── AbortError — propagate as "unknown" but mark non-retryable.
  //    Components should NOT show error UI for aborts (user navigated
  //    away). TanStack Query handles this — we just preserve safety.
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError')) {
    return {
      category: 'unknown',
      severity: 'warning',
      isRetryable: false,
      statusCode: undefined,
      code: undefined,
      name: error.name,
      diagnosticMessage: 'request-aborted',
    };
  }

  // ── Native Error fallback ──
  if (error instanceof Error) {
    return {
      category: 'unknown',
      severity: 'error',
      isRetryable: true,
      statusCode: undefined,
      code: undefined,
      name: error.name || 'Error',
      diagnosticMessage: buildDiagnosticMessage(error),
    };
  }

  // ── Non-Error throw (string, number, plain object) ──
  return {
    category: 'unknown',
    severity: 'error',
    isRetryable: true,
    statusCode: undefined,
    code: undefined,
    name: 'NonErrorThrow',
    diagnosticMessage: buildDiagnosticMessage(error),
  };
}

/**
 * Exhaustiveness helper — use in switch statements to enforce that
 * every category is handled. Triggers a TypeScript error if a new
 * category is added without updating the switch.
 *
 * @example
 *   switch (c.category) {
 *     case 'network': return ...
 *     case 'auth': return ...
 *     // ...
 *     default: return assertNever(c.category)
 *   }
 */
export function assertNever(value: never): never {
  throw new Error(`Unhandled error category: ${String(value)}`);
}
