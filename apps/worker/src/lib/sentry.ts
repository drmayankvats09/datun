// ═══════════════════════════════════════════════════════════════
// WORKER SENTRY — Captures unhandled errors in job processors
// ═══════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/node';
import { env } from '../config/env.js';

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    serverName: 'datun-worker',
  });
}

export { Sentry };
