// apps/web/lib/sentry/breadcrumbs.ts
// ═══════════════════════════════════════════════════════════════
// SENTRY BREADCRUMBS — Task #52 Phase 1 (Foundation)
//
// Typed helpers around `Sentry.addBreadcrumb` that:
//   1. Auto-categorise breadcrumbs into Datun's vocabulary
//      (consultation, auth, media, api, navigation, ai, ui)
//   2. SCRUB PII from any string data before it leaves the SDK
//      (phone numbers, emails, OTPs, photo URLs, tokens)
//   3. Apply a consistent shape so the Sentry "Breadcrumbs" panel
//      reads like a coherent user journey
//
// Why a wrapper (not direct Sentry.addBreadcrumb calls):
//   - PII scrubbing needs to happen at EVERY call site. A wrapper
//     enforces this — review burden is "did you use the wrapper",
//     not "did you remember to redact this specific field".
//   - Categories are a closed set — typos like `categroy: 'auht'`
//     fail at compile time. Sentry's default API takes free strings.
//   - Adds Datun-specific defaults (level, timestamp parameterisation)
//     that match our observability conventions.
//
// SSR-safe: Sentry's Node SDK exposes the same `addBreadcrumb` API,
// so these helpers work on the server too (used by Server Actions in
// future tasks).
//
// References:
//   - https://docs.sentry.io/platforms/javascript/enriching-events/breadcrumbs/
//   - HIPAA Security Rule §164.514 (de-identification standard)
//   - DPDP Act 2023, Section 8(3) (data minimisation)
// ═══════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/nextjs';

// ─── Datun breadcrumb categories ───────────────────────────────

/**
 * The closed set of breadcrumb categories Datun uses. Sentry filters
 * the "Breadcrumbs" panel by category — a closed set keeps the UI
 * useful at scale (no `category: 'login_form_click'` proliferation).
 */
export type BreadcrumbCategory =
  | 'consultation' // Start, send message, complete, photo upload
  | 'auth' // Login attempt, OTP request, logout, role change
  | 'media' // Upload start/complete, blob URL lifecycle
  | 'api' // HTTP request initiated, completed, failed
  | 'navigation' // Route change, deep-link entry
  | 'ai' // Provider call (Claude/OpenAI/Gemini), streaming events
  | 'ui'; // User interaction (button click, dialog open)

/**
 * Sentry severity levels. We expose only the subset Datun uses —
 * `fatal` is reserved for Sentry.captureException, not breadcrumbs.
 */
export type BreadcrumbLevel = 'info' | 'warning' | 'error' | 'debug';

/**
 * Structured breadcrumb input. The `data` object is shallowly scrubbed
 * before reaching Sentry — see `scrubPii()`.
 */
export interface BreadcrumbInput {
  readonly category: BreadcrumbCategory;
  /** Short, human-readable message. Will be PII-scrubbed. */
  readonly message: string;
  /** Severity. Defaults to 'info'. */
  readonly level?: BreadcrumbLevel;
  /**
   * Optional structured data. Top-level string values are scrubbed.
   * Nested objects pass through as-is — callers MUST NOT nest PII.
   */
  readonly data?: Readonly<Record<string, string | number | boolean | null>>;
}

// ─── PII scrubbing ─────────────────────────────────────────────

/**
 * Patterns that identify PII to redact. Conservative — false positives
 * (over-redaction) are vastly preferable to leaking PHI.
 *
 *   - Email          → `<email-redacted>`
 *   - Phone (Indian) → `<phone-redacted>` (10-digit with optional +91)
 *   - OTP            → `<otp-redacted>`   (6 consecutive digits)
 *   - JWT-ish        → `<token-redacted>` (3 base64 segments)
 *   - UUID v4        → `<id>`             (cardinality reduction; not PII
 *                                          per se, but high-cardinality
 *                                          values blow up Sentry tags)
 *   - Photo URLs     → `<url-redacted>`   (any media.datunai.com /
 *                                          R2 / imagedelivery.net path)
 */
const PII_PATTERNS: ReadonlyArray<{ readonly pattern: RegExp; readonly replacement: string }> = [
  // Email — RFC 5321 simplified; covers >99% of real addresses.
  { pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, replacement: '<email-redacted>' },
  // Indian phone — +91 prefix or bare 10-digit starting with 6-9.
  { pattern: /(\+?91[-\s]?)?[6-9]\d{9}/g, replacement: '<phone-redacted>' },
  // OTP — exactly 6 digits, isolated by word boundary.
  { pattern: /\b\d{6}\b/g, replacement: '<otp-redacted>' },
  // JWT-ish token — three base64url segments separated by dots.
  {
    pattern: /\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    replacement: '<token-redacted>',
  },
  // Media URLs — any path under our media hosts.
  {
    pattern:
      /https?:\/\/(media\.datunai\.com|imagedelivery\.net|res\.cloudinary\.com|[a-z0-9-]+\.r2\.cloudflarestorage\.com)\/\S+/gi,
    replacement: '<url-redacted>',
  },
  // UUID v4 — replace with placeholder for cardinality reduction. This
  // is a string-level replacement; structured ID fields (e.g., a
  // `consultationId` data prop) are NOT scrubbed — those are the
  // intended audit trail.
  {
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
    replacement: '<id>',
  },
];

/**
 * Strip PII from a string. Pure, deterministic, SSR-safe. Exported
 * separately so non-Sentry call sites (audit-log, console logging
 * in dev) can reuse the same conservative regex set.
 */
export function scrubPii(input: string): string {
  let output = input;
  for (const { pattern, replacement } of PII_PATTERNS) {
    output = output.replace(pattern, replacement);
  }
  return output;
}

/**
 * Scrub PII from the top-level string values in a data object. Numbers
 * and booleans pass through unchanged (no PII surface). Nested objects
 * are not traversed — see the type signature; callers are forced into
 * a flat shape by the public `BreadcrumbInput`.
 */
function scrubData(
  data: Readonly<Record<string, string | number | boolean | null>> | undefined,
): Record<string, string | number | boolean | null> | undefined {
  if (!data) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(data)) {
    out[key] = typeof value === 'string' ? scrubPii(value) : value;
  }
  return out;
}

// ─── Core API ──────────────────────────────────────────────────

/**
 * Add a Datun-categorised breadcrumb. All string fields are PII-scrubbed
 * before reaching the Sentry SDK. Safe to call from any environment
 * (browser, edge runtime, Node).
 *
 * @example
 *   addBreadcrumb({
 *     category: 'auth',
 *     message: 'OTP requested',
 *     level: 'info',
 *     data: { phone: '+919876543210' },  // becomes '<phone-redacted>'
 *   })
 */
export function addBreadcrumb(input: BreadcrumbInput): void {
  Sentry.addBreadcrumb({
    category: input.category,
    message: scrubPii(input.message),
    level: input.level ?? 'info',
    data: scrubData(input.data),
    timestamp: Date.now() / 1000, // Sentry uses Unix seconds
  });
}

// ─── Curated helpers (most common patterns) ────────────────────

/**
 * Record a client-side navigation event. Call from the route tracker.
 *
 *   - `from` / `to` are PATH STRINGS only — never include query
 *     strings that might contain PII (auth tokens, OTPs).
 */
export function trackNavigation(from: string, to: string): void {
  addBreadcrumb({
    category: 'navigation',
    message: 'route changed',
    level: 'info',
    data: { from, to },
  });
}

/**
 * Record a user action (button click, form submit, dialog open).
 *
 *   - `name` is a stable identifier ('login_submit', 'photo_upload_click')
 *     — keep it lowercase_snake_case to match Datun's PostHog events.
 */
export function trackAction(
  name: string,
  data?: Readonly<Record<string, string | number | boolean | null>>,
): void {
  addBreadcrumb({
    category: 'ui',
    message: name,
    level: 'info',
    data,
  });
}

/**
 * Record an outgoing API call. Use BEFORE the request — Sentry's
 * `fetch` integration handles completion automatically, but we use
 * this for richer context tagging.
 */
export function trackApiCall(method: string, path: string, status?: number): void {
  addBreadcrumb({
    category: 'api',
    message: `${method.toUpperCase()} ${path}`,
    level: status && status >= 400 ? 'warning' : 'info',
    data: { method: method.toUpperCase(), path, status: status ?? null },
  });
}

/**
 * Record a consultation-flow event. Used by consultation hooks to
 * trace the patient journey in Sentry — invaluable when triaging
 * "the photo upload step crashed for this user" reports.
 *
 *   - `event` examples: 'started', 'message_sent', 'photo_uploaded',
 *     'completed', 'pdf_downloaded', 'resumed'.
 */
export function trackConsultationEvent(
  event: string,
  data?: Readonly<Record<string, string | number | boolean | null>>,
): void {
  addBreadcrumb({
    category: 'consultation',
    message: event,
    level: 'info',
    data,
  });
}

/**
 * Record an AI provider call. Distinguishes upstream provider failures
 * from app-side issues during incident response.
 *
 *   - `provider`: 'claude' | 'openai' | 'gemini' (lowercase)
 *   - `event`: 'started' | 'streamed' | 'completed' | 'failed'
 */
export function trackAiCall(
  provider: string,
  event: string,
  data?: Readonly<Record<string, string | number | boolean | null>>,
): void {
  addBreadcrumb({
    category: 'ai',
    message: `${provider}:${event}`,
    level: event === 'failed' ? 'warning' : 'info',
    data,
  });
}

/**
 * Record a media (upload) lifecycle event. Used by photo upload hooks.
 *
 *   - `event` examples: 'upload_started', 'upload_completed',
 *     'upload_failed', 'blob_revoked'.
 */
export function trackMediaEvent(
  event: string,
  data?: Readonly<Record<string, string | number | boolean | null>>,
): void {
  addBreadcrumb({
    category: 'media',
    message: event,
    level: event.includes('failed') ? 'warning' : 'info',
    data,
  });
}
