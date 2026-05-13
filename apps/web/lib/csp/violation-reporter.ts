// apps/web/lib/csp/violation-reporter.ts
// ═══════════════════════════════════════════════════════════════
// CLIENT-SIDE CSP VIOLATION REPORTER — Defensive fallback channel
//
// PRIMARY CHANNEL: Browser's native Reporting-Endpoints → POST automatically.
// FALLBACK CHANNEL (this file): JS listener on `securitypolicyviolation`
//                                event, manually POSTs to our API.
//
// WHY TWO CHANNELS?
//   1. Reporting API browser support varies (Safari 14-15 still uses old API).
//   2. Some ad blockers / privacy extensions strip Reporting-Endpoints
//      header but don't intercept fetch() calls.
//   3. Defense in depth — Memory Rule #24 (no single point of failure).
//
// COST OF DUPLICATION:
//   Same violation may arrive twice (once via Reporting API, once via this).
//   Solved at the API layer by csp-report-dedup.ts (in-memory LRU dedup).
//
// PERFORMANCE:
//   - `keepalive: true` lets the POST survive page unload (critical for
//     violations occurring during navigation).
//   - Best-effort delivery — failures swallowed silently to avoid breaking UX.
//   - Rate limit: max 10 reports per page session (prevents bots/extensions
//     from spamming our API).
//
// Pattern: Vercel "feedback widget" telemetry, Sentry SDK fallback reporting.
// ═══════════════════════════════════════════════════════════════

import { REPORT_ENDPOINT_URL } from './allowed-origins';

/** Max reports to send per page session (prevents API spam). */
const MAX_REPORTS_PER_SESSION = 10;

/** Mutable counter — resets on full page reload. */
let sessionReportCount = 0;

/**
 * Initialize the CSP violation event listener.
 *
 * Call ONCE on app boot (from sentry.client.config.ts or app provider).
 * Multiple calls are idempotent — second call is a no-op.
 *
 * @returns Cleanup function (removes listener). Useful for tests.
 */
export function initViolationReporter(): () => void {
  if (typeof window === 'undefined') {
    // Server-side import — no-op.
    return () => {};
  }

  if (window.__cspReporterInitialized) {
    // Already initialized — return existing cleanup.
    return window.__cspReporterCleanup ?? (() => {});
  }

  function onViolation(event: SecurityPolicyViolationEvent): void {
    if (sessionReportCount >= MAX_REPORTS_PER_SESSION) return;
    sessionReportCount++;

    // Build payload in legacy `application/csp-report` format.
    // Our API endpoint accepts both legacy and modern formats — legacy is
    // simpler to construct manually from the browser event.
    const payload = {
      'csp-report': {
        'document-uri': event.documentURI,
        referrer: event.referrer,
        'violated-directive': event.violatedDirective,
        'effective-directive': event.effectiveDirective,
        'original-policy': event.originalPolicy,
        disposition: event.disposition,
        'blocked-uri': event.blockedURI,
        'line-number': event.lineNumber,
        'column-number': event.columnNumber,
        'source-file': event.sourceFile,
        'status-code': event.statusCode,
        'script-sample': event.sample,
      },
    };

    try {
      // `keepalive: true` ensures the request completes even if the user
      // navigates away (key for violations that happen during navigation).
      fetch(REPORT_ENDPOINT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/csp-report' },
        body: JSON.stringify(payload),
        keepalive: true,
        // No credentials needed (endpoint accepts anonymous reports).
        credentials: 'omit',
        // Don't follow redirects (defensive — endpoint shouldn't redirect).
        redirect: 'error',
      }).catch(() => {
        // Best-effort — swallow network errors.
        // Browser's native Reporting API is the primary channel anyway.
      });
    } catch {
      // Some browsers throw synchronously on fetch() in event handlers.
    }
  }

  document.addEventListener('securitypolicyviolation', onViolation);

  const cleanup = (): void => {
    document.removeEventListener('securitypolicyviolation', onViolation);
    window.__cspReporterInitialized = false;
    window.__cspReporterCleanup = undefined;
    sessionReportCount = 0;
  };

  window.__cspReporterInitialized = true;
  window.__cspReporterCleanup = cleanup;
  return cleanup;
}

/** Reset session counter — exported for tests. */
export function __resetSessionCount(): void {
  sessionReportCount = 0;
}

// ── Window augmentation ──────────────────────────────────────────
// Stash init state on `window` to prevent double-init across HMR / Next.js
// fast refresh. Use a unique symbol-style key.
declare global {
  interface Window {
    __cspReporterInitialized?: boolean;
    __cspReporterCleanup?: () => void;
  }
}
