// ═══════════════════════════════════════════════════════════════
// SENTRY — Error tracking initialization (Backend)
// Must be imported BEFORE Express app creation.
// Express error handler is in error-handler.ts (NOT here).
// ═══════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/node';
import { API_VERSION } from '@repo/shared';

export function initSentry(): void {
  if (!process.env['SENTRY_DSN']) return;

  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    environment: process.env['NODE_ENV'] ?? 'production',
    release: `datun-api@${API_VERSION}`,
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,

    beforeSend(event, hint) {
      const msg = (hint?.originalException as Error)?.message ?? event.message ?? '';
      if (
        typeof msg === 'string' &&
        (msg.includes('rate limit') || msg.includes('Too Many Requests'))
      ) {
        return null;
      }
      return event;
    },
  });
}

export { Sentry };
