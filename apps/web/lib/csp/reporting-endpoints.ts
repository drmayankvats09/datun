// apps/web/lib/csp/reporting-endpoints.ts
// ═══════════════════════════════════════════════════════════════
// REPORTING-ENDPOINTS HEADER BUILDER — Modern CSP violation reporting
//
// The W3C Reporting API replaces the deprecated `Report-To` header.
// Browsers POST violation reports to declared endpoints automatically.
//
// HEADER FORMAT (Reporting-Endpoints):
//   Reporting-Endpoints: csp-endpoint="https://api.datunai.com/api/security/csp-report"
//
// USAGE BY CSP:
//   Content-Security-Policy: ...; report-to csp-endpoint
//   ↑ References the named endpoint from Reporting-Endpoints header.
//
// LEGACY FALLBACK:
//   Older browsers (Safari pre-16, older Firefox) ignore `report-to` and
//   `Reporting-Endpoints`. For them we set `report-uri` directly in the
//   CSP header (handled in policy.ts).
//
// BROWSER COMPAT (Jan 2026):
//   - Chrome / Edge / Opera / Samsung Internet — modern Reporting API ✓
//   - Safari 16+ — modern Reporting API ✓
//   - Safari 14-15 — only `report-uri` (handled by policy.ts)
//   - Firefox 117+ — modern Reporting API ✓
//   - Firefox < 117 — only `report-uri`
//
// Pattern: MDN Reporting API spec, Cloudflare reporting docs.
// ═══════════════════════════════════════════════════════════════

import { REPORT_ENDPOINT_URL } from './allowed-origins';

/** Logical name for the CSP report endpoint (referenced by `report-to` directive). */
export const CSP_ENDPOINT_NAME = 'csp-endpoint';

/**
 * Build the value for the `Reporting-Endpoints` HTTP response header.
 *
 * @param overrideUrl - Optional override for tests/staging.
 * @returns Header value string like `csp-endpoint="https://..."`.
 *
 * @example
 *   const headerValue = buildReportingEndpointsHeader();
 *   response.headers.set('Reporting-Endpoints', headerValue);
 */
export function buildReportingEndpointsHeader(overrideUrl?: string): string {
  const url = overrideUrl ?? REPORT_ENDPOINT_URL;
  // Multiple endpoints would be comma-separated. We only have one for now.
  return `${CSP_ENDPOINT_NAME}="${url}"`;
}
