// ═══════════════════════════════════════════════════════════════
// URLS — All external URLs centralized
// ═══════════════════════════════════════════════════════════════

export const URLS = {
  /** Production website (current v1 — vanilla frontend) */
  website: 'datunai.com',
  websiteHttps: 'https://datunai.com',

  /** v2 web app (Next.js on Vercel) */
  v2Web: 'https://datun.vercel.app',

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

  /** Social links */
  social: {
    instagram: 'https://instagram.com/datun.ai',
    linkedin: 'https://linkedin.com/company/datunai',
  },
} as const;
