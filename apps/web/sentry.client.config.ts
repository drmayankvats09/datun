// ═══════════════════════════════════════════════════════════════
// SENTRY CLIENT — Browser-side error tracking
// Catches: unhandled exceptions, promise rejections, console.errors
// Session Replay: records what user did before crash (10% errors)
// Performance: tracks Web Vitals (LCP, CLS, INP)
//
// Pattern: Vercel, Linear, Notion — all use @sentry/nextjs.
// Source maps uploaded at build time — stack traces readable.
// ═══════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'] || '',

  environment: process.env['NODE_ENV'] ?? 'production',

  // Performance: sample 10% of transactions in production
  tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,

  // Session Replay: 5% normal sessions, 100% error sessions
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      // DPDP compliance — mask all PII in replays
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter noise — don't send non-actionable errors
  beforeSend(event, hint) {
    const msg = (hint?.originalException as Error)?.message ?? event.message ?? '';

    if (typeof msg === 'string') {
      if (
        msg.includes('ResizeObserver loop') ||
        msg.includes('Non-Error promise rejection') ||
        msg.includes('Network request failed') ||
        msg.includes('Load failed') ||
        msg.includes('ChunkLoadError')
      ) {
        return null;
      }
    }

    return event;
  },

  // Only enable in production (save quota in dev)
  enabled: process.env['NODE_ENV'] === 'production',
});
