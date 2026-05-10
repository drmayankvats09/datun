// ═══════════════════════════════════════════════════════════════
// SENTRY INTEGRATION — capture seed errors with rich context
// ═══════════════════════════════════════════════════════════════

import type { ModuleResult } from '../modules/core/module.types';

interface SentryClientLike {
  captureException(
    err: Error,
    ctx?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
  ): void;
  captureMessage(msg: string, level?: string): void;
}

let sentryClient: SentryClientLike | null = null;

export async function initSentry(): Promise<void> {
  if (!process.env.SENTRY_DSN) return;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV ?? 'development',
      release: process.env.GIT_COMMIT,
      tracesSampleRate: 0.1,
    });
    sentryClient = Sentry as unknown as SentryClientLike;
  } catch {
    // Sentry not installed — graceful no-op
  }
}

export function captureSeedFailure(moduleName: string, result: ModuleResult): void {
  if (!sentryClient || !result.error) return;
  const err = new Error(result.error.message);
  if (result.error.stack) err.stack = result.error.stack;
  sentryClient.captureException(err, {
    tags: { component: 'seed', module: moduleName },
    extra: {
      recordsCreated: result.recordsCreated,
      recordsFailed: result.recordsFailed,
      durationMs: result.durationMs,
      bulkStrategy: result.bulkStrategy,
    },
  });
}

export function captureSeedMilestone(message: string): void {
  sentryClient?.captureMessage(message, 'info');
}
