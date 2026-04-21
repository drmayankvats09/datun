// ═══════════════════════════════════════════════════════════════
// URLS — All external URLs centralized
// ═══════════════════════════════════════════════════════════════

export const URLS = {
  /** Production website */
  website: 'datunai.com',
  websiteHttps: 'https://datunai.com',

  /** v2 web app (Next.js on Vercel — preview/staging) */
  v2Web: 'https://datun.vercel.app',

  /** API base URL */
  api: 'https://dentscan-ai-backend-production.up.railway.app',

  /** Report short URL pattern */
  reportUrl: (consultationId: string) => `datunai.com/report/${consultationId}`,

  /** CORS allowed origins — API accepts requests from these */
  corsOrigins: [
    'https://datunai.com',
    'https://www.datunai.com',
    'https://datun.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:5500',
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
} as const;
