// ═══════════════════════════════════════════════════════════════
// SENTRY — Error tracking initialization (Backend)
// ═══════════════════════════════════════════════════════════════
// CRITICAL: Sentry.init() runs at MODULE LOAD (side effect), NOT in a function.
// This ensures Sentry hooks register BEFORE Express imports.
// Pattern: Sentry SDK v8+ official recommendation, Vercel/Stripe/Linear standard.
// ═══════════════════════════════════════════════════════════════

import * as Sentry from '@sentry/node';
import { API_VERSION } from '@repo/shared';

// ── Side-effect init: runs immediately when this module is imported ──
if (process.env['SENTRY_DSN']) {
  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    environment: process.env['NODE_ENV'] ?? 'production',
    release: `datun-api@${API_VERSION}`,

    // ── Performance Monitoring ──
    // 10% sampling in prod (cost optimization), 100% in dev (debugging).
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,

    // ── Integrations: explicit list (Sentry v10 best practice) ──
    // Auto-detects Express, Prisma, HTTP — but only if init runs BEFORE those imports.
    // Module-level side-effect ensures correct order.

    // ── Filter noise ──
    beforeSend(event, hint) {
      const msg = (hint?.originalException as Error)?.message ?? event.message ?? '';

      // Skip rate-limit errors (expected, not actionable)
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

// Re-export Sentry for use throughout the app
export { Sentry };

// Legacy export for backward compatibility (no-op now)
// Removed in next refactor when all callers updated.
export function initSentry(): void {
  // No-op: init now happens at module load above.
  // This export exists temporarily for server.ts compatibility.
}
