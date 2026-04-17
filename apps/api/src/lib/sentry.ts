// ═══════════════════════════════════════════════════════════════
// SENTRY — Error tracking + performance monitoring
// Must initialize BEFORE Express app creation.
// ═══════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/node';

export function initSentry(): void {
  const dsn = process.env['SENTRY_DSN'];
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env['NODE_ENV'] ?? 'production',
    release: 'datun-api@2.1.0',
    tracesSampleRate: 0.1,
    beforeSend(event, hint) {
      const msg = (hint?.originalException as Error)?.message ?? event.message ?? '';
      // Suppress expected noise — rate limits, client disconnects
      if (
        typeof msg === 'string' &&
        (msg.includes('rate limit') ||
          msg.includes('Too Many Requests') ||
          msg.includes('ECONNRESET'))
      ) {
        return null;
      }
      return event;
    },
  });
}

export { Sentry };
