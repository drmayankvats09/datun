// packages/shared/src/urls.ts
// ═══════════════════════════════════════════════════════════════
// URLS — All external URLs centralized
// ═══════════════════════════════════════════════════════════════

export const URLS = {
  /** Production website */
  website: 'datunai.com',
  websiteHttps: 'https://datunai.com',

  /** API base URL */
  api: 'https://api.datunai.com',

  /** Report short URL pattern */
  reportUrl: (consultationId: string) => `datunai.com/report/${consultationId}`,

  /** CORS allowed origins — API accepts requests from these */
  corsOrigins: [
    'https://datunai.com',
    'https://www.datunai.com',
    'http://localhost:3000',
    'http://localhost:3001',
  ] as readonly string[],

  /** CDN & infrastructure */
  cdn: {
    dashboard: 'https://dash.cloudflare.com',
    analyticsBeacon: 'https://static.cloudflareinsights.com/beacon.min.js',
  },

  /** Social links */
  social: {
    instagram: 'https://instagram.com/datun.ai',
    linkedin: 'https://linkedin.com/company/datunai',
  },

  /**
   * Security — CSP violation reporting endpoint (Task #45).
   * Single source of truth. Referenced by:
   *   - apps/web/lib/csp/allowed-origins.ts (REPORT_ENDPOINT_URL).
   *   - apps/web/lib/csp/violation-reporter.ts (client-side fallback POST).
   *   - docs/security/csp-policy.md (engineer reference).
   */
  security: {
    cspReportEndpoint: 'https://api.datunai.com/api/security/csp-report',
  },
} as const;
