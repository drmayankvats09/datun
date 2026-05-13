// apps/web/sentry.client.config.ts
// ═══════════════════════════════════════════════════════════════
// SENTRY CLIENT — Browser-side error tracking + CSP integration
//
// Task #45 additions:
//   - Initialize CSP violation reporter (backup channel to Reporting API).
//   - Enrich CSP violation Sentry events with severity tags.
//   - Filter browser-extension noise out of CSP events.
// ═══════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/nextjs';
import { initViolationReporter } from '@/lib/csp/violation-reporter';
import { enrichCspEvent } from '@/lib/csp/sentry-integration';

if (process.env.NODE_ENV !== 'production') {
  Sentry.init({ dsn: '', enabled: false });
} else {
  Sentry.init({
    dsn: process.env['NEXT_PUBLIC_SENTRY_DSN'] || '',
    environment: process.env['NODE_ENV'] ?? 'production',

    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    beforeSend(event, hint) {
      // ── Standard noise filter ──
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

      // ── CSP enrichment (Task #45) ──
      // Returns null for extension-noise CSP events; tags real ones.
      const enriched = enrichCspEvent(event, hint);
      if (enriched === null) return null;

      return enriched;
    },

    enabled: process.env['NODE_ENV'] === 'production',
  });

  // ── CSP violation reporter (backup channel) ──
  // Idempotent — safe across HMR / fast-refresh re-renders.
  initViolationReporter();
}
