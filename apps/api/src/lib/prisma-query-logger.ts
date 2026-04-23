// ═══════════════════════════════════════════════════════════════
// PRISMA QUERY LOGGER — Slow query detection
// Queries > 500ms → warning log → Better Stack alert.
// ═══════════════════════════════════════════════════════════════

import { logger } from './logger.js';
import { Sentry } from './sentry.js';

const SLOW_QUERY_THRESHOLD_MS = 500;

/**
 * Log a slow database query. Called by prisma-audit middleware.
 */
export function logSlowQuery(model: string, action: string, durationMs: number): void {
  if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
    logger.warn(`[SLOW_QUERY] ${model}.${action} took ${durationMs}ms`, {
      slowQuery: true,
      model,
      action,
      durationMs,
      threshold: SLOW_QUERY_THRESHOLD_MS,
    });

    if (durationMs > SLOW_QUERY_THRESHOLD_MS * 3) {
      Sentry.captureMessage(`Slow query: ${model}.${action} (${durationMs}ms)`, {
        level: 'warning',
        extra: { model, action, durationMs },
      });
    }
  }
}
