// apps/web/lib/errors/audit-log.ts
// ═══════════════════════════════════════════════════════════════
// AUDIT LOG CLIENT — Task #52 Phase 1 (Foundation)
//
// Frontend client for the immutable error audit trail. Used by error
// boundary components to ship a STRUCTURED record of:
//
//   - Which category of error occurred
//   - What recovery action the user attempted
//   - When (timestamp) and where (path) it happened
//   - Session correlation ID (anonymous — NOT linked to identity here)
//
// This is the legal-evidence trail required by:
//   - DPDP Act 2023 (India)        — audit logging mandate
//   - HIPAA Security Rule §164.312 — when we expand to US in 2027+
//   - ISO 27001 A.12.4             — event logging
//
// Backend endpoint (created in Phase 5):
//   POST /api/audit/error
//   - Anonymous-friendly (no auth required — errors must log even
//     when the session itself is broken)
//   - Rate-limited (10/min/IP) at the backend layer
//   - Writes to Prisma `AuditLog` table
//
// Fire-and-forget semantics:
//   - This function NEVER throws — error reporting must not cascade
//     into more errors
//   - On network failure or 4xx/5xx response: silently swallow
//     (the error is ALREADY captured by Sentry via the boundary)
//   - On endpoint 404 (Phase 5 not yet shipped): silent — Sentry has it
//
// SSR-safety: noop on the server (no DOM, no sessionStorage). Errors
// thrown server-side are captured by Sentry's server SDK and persisted
// to AuditLog by the server's own instrumentation in Phase 5.
//
// References:
//   - DPDP Act 2023, Section 8 (Reasonable Security Safeguards)
//   - https://docs.sentry.io/platforms/javascript/guides/nextjs/data-management/sensitive-data/
// ═══════════════════════════════════════════════════════════════

import type { CategorizedError } from './categorize';
import type { RecoveryAction } from './recovery';

// ─── Public payload shape ──────────────────────────────────────

/**
 * The contract between frontend boundaries and the audit endpoint.
 * Keep this in sync with the Zod schema declared server-side in
 * Phase 5: `apps/api/src/validators/audit.schema.ts`.
 *
 * NEVER add PII fields here:
 *   - No `email`, `phone`, `name`
 *   - No raw consultation text / photo URLs / medical content
 *   - No tokens
 *
 * Pseudonymous fields ARE permitted:
 *   - `sessionId`   (UUID generated client-side, no link to identity)
 *   - `sentryEventId` (Sentry's opaque event ID)
 *   - `userIdHash`  (server hashes the userId — never the raw value)
 */
export interface AuditErrorPayload {
  /** Pseudonymous session correlation ID (UUID v4). */
  readonly sessionId: string;
  /** Event ID returned by Sentry for cross-referencing. */
  readonly sentryEventId: string | null;
  /** Discriminated error category. */
  readonly category: CategorizedError['category'];
  /** Severity classification. */
  readonly severity: CategorizedError['severity'];
  /** Whether the boundary offered a retry. */
  readonly recoveryAction: RecoveryAction;
  /** Retry attempt number at time of capture (0 = no retry yet). */
  readonly retryCount: number;
  /** HTTP status code if ApiError; null otherwise. */
  readonly statusCode: number | null;
  /** Backend ERROR_CODES string if ApiError; null otherwise. */
  readonly code: string | null;
  /** Original `error.name`. */
  readonly errorName: string;
  /** Non-localised, NON-PII diagnostic. */
  readonly diagnosticMessage: string;
  /** Boundary level that caught the error. */
  readonly boundaryLevel: 'app' | 'route' | 'feature' | 'widget';
  /** Pathname (e.g., `/en/consult/abc`) — parameterised by callers. */
  readonly pathname: string;
  /** Client-side ISO-8601 timestamp. */
  readonly clientTimestamp: string;
  /** Browser locale for context. */
  readonly locale: string;
}

// ─── Session ID (browser singleton) ────────────────────────────

const SESSION_STORAGE_KEY = 'datun_audit_session_id';

/**
 * Read (or lazily create) the pseudonymous session ID. Stored in
 * `sessionStorage` so it persists across SPA navigations within a
 * tab but resets when the tab closes — matching the natural session
 * boundary for DPDP audit logs.
 *
 * NEVER stores anything identifying the user. The ID is an opaque
 * UUID v4. Server-side correlation with userId happens via the auth
 * cookie ONLY when the request is authenticated, and even then the
 * link is one-way (audit log stores hashed userId, not lookup-able
 * back to the session ID).
 *
 * SSR returns a stable placeholder — server-side errors generate
 * their own session IDs in the server logger.
 */
export function getAuditSessionId(): string {
  // SSR — no DOM, no sessionStorage. Return placeholder; the audit
  // call itself is a no-op on the server.
  if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
    return 'ssr-no-session';
  }

  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) {
      return existing;
    }
    const fresh = generateUuid();
    sessionStorage.setItem(SESSION_STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // iOS private mode, storage quota, etc. — degrade to ephemeral.
    return generateUuid();
  }
}

/**
 * Generate a v4 UUID via the Web Crypto API when available, with a
 * non-cryptographic fallback for very old environments. This is a
 * correlation ID only — no cryptographic guarantees required.
 */
function generateUuid(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof (crypto as Crypto & { randomUUID?: () => string }).randomUUID === 'function'
  ) {
    return (crypto as Crypto & { randomUUID: () => string }).randomUUID();
  }
  // RFC 4122 v4 fallback — Math.random is fine for a correlation ID.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Endpoint ─────────────────────────────────────────────────

/**
 * The audit endpoint path. Aligned with `ENDPOINTS.audit.error` added
 * to `lib/api/endpoints.ts` in Phase 5. Inlined here to avoid a
 * circular import (audit-log is consumed by error boundaries which
 * may be loaded BEFORE the api layer in some edge cases — e.g.,
 * boundary catches a fetch-layer-init error).
 */
const AUDIT_ENDPOINT = '/api/audit/error';

/** Derive the absolute URL — same convention as `lib/auth.ts`. */
function getAuditUrl(): string {
  const base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';
  // Avoid double-slashes if base already has a trailing slash.
  return `${base.replace(/\/$/, '')}${AUDIT_ENDPOINT}`;
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Ship an audit log entry to the backend. NEVER throws. Returns void
 * (fire-and-forget) — callers should not await for UX flow; the call
 * happens in the background while the user sees the error UI.
 *
 * Implementation notes:
 *   - Uses `navigator.sendBeacon` when available — survives page
 *     unloads (e.g., user clicks "Go home" while the request is in
 *     flight). The Beacon API is designed exactly for this case.
 *   - Falls back to fetch with `keepalive: true` for browsers without
 *     Beacon (very rare in 2026).
 *   - Server-side / SSR: noop. Server boundaries log directly via
 *     Sentry's Node SDK; AuditLog rows are written by server logger.
 *
 * @example
 *   try {
 *     await fetchSomething()
 *   } catch (e) {
 *     const cat = categorize(e)
 *     const strategy = getRecoveryStrategy(cat.category)
 *     void logErrorToAudit({
 *       sessionId: getAuditSessionId(),
 *       sentryEventId: Sentry.lastEventId() ?? null,
 *       category: cat.category,
 *       severity: cat.severity,
 *       recoveryAction: strategy.action,
 *       retryCount: 0,
 *       statusCode: cat.statusCode ?? null,
 *       code: cat.code ? String(cat.code) : null,
 *       errorName: cat.name,
 *       diagnosticMessage: cat.diagnosticMessage,
 *       boundaryLevel: 'route',
 *       pathname: window.location.pathname,
 *       clientTimestamp: new Date().toISOString(),
 *       locale: navigator.language,
 *     })
 *   }
 */
export function logErrorToAudit(payload: AuditErrorPayload): void {
  // SSR — server-side errors are audited by the server Sentry SDK.
  if (typeof window === 'undefined') return;

  const url = getAuditUrl();
  const body = safeStringify(payload);
  if (body === null) return; // payload not serialisable; bail silently

  // ── Strategy 1: sendBeacon (preferred, survives unload) ──
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' });
      const ok = navigator.sendBeacon(url, blob);
      if (ok) return;
      // Fall through to fetch if the UA rejected the beacon
      // (queue full, quota exceeded).
    } catch {
      // Fall through to fetch.
    }
  }

  // ── Strategy 2: fetch with keepalive ──
  try {
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'omit', // anonymous — no cookies, no auth header
      mode: 'cors',
    }).catch(() => {
      // Audit logging is best-effort. Failures are intentionally
      // silent — Sentry already has the underlying error.
    });
  } catch {
    // Synchronous throw (e.g., CSP block on fetch) — silent.
  }
}

/**
 * Defensive JSON serialisation. Audit payloads are app-controlled so
 * cycles shouldn't occur — but if a future change accidentally passes
 * a complex object, we'd rather skip the log than crash the boundary.
 */
function safeStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}
