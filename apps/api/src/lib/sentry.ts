// ═══════════════════════════════════════════════════════════════
// SENTRY — Error tracking initialization
// Must be imported BEFORE Express app creation.
// ═══════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/node';
import { API_VERSION } from '@repo/shared';

export function initSentry(): void {
  if (!process.env['SENTRY_DSN']) return;

  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    environment: process.env['NODE_ENV'] ?? 'production',
    release: `datun-api@${API_VERSION}`,
    tracesSampleRate: 0.1,
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
