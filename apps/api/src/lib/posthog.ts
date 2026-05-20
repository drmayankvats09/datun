// apps/api/src/lib/posthog.ts
// ═══════════════════════════════════════════════════════════════
// POSTHOG NODE CLIENT — Lazy singleton wrapper (Task #49)
// ─────────────────────────────────────────────────────────────────
// Server-side PostHog client used by:
//   1. flag-sync.service.ts  — mirrors PostHog flag definitions → DB.
//   2. flag-evaluator.service.ts (only when DB miss)  — last-resort
//      evaluation against PostHog's hosted decide endpoint.
//   3. analytics events for the funnel dashboard (later phases).
//
// Lazy: the underlying `posthog-node` module is imported via dynamic
// `import()` inside `init()` so a missing optional dep doesn't break
// the API at boot. If `POSTHOG_API_KEY` is unset, init() resolves to
// `null` and every helper short-circuits.
//
// Reference patterns:
//   - Stripe's `getStripe()` lazy singleton (Stripe SDK init pattern)
//   - Sentry SDK pre-init guard (`Sentry.getCurrentHub()`)
//   - PostHog `PostHog` docs: "create one instance per process"
// ═══════════════════════════════════════════════════════════════

import { env } from '../config/env.js';
import { logger } from './logger.js';

// ─── Public types — keep loose so swapping vendor stays cheap ─────

/**
 * Minimal surface of `PostHog` we depend on. Mirrors the shape of
 * `posthog-node` v4 — keeping it loose lets a future swap (e.g.
 * Unleash, GrowthBook) reuse this file as the abstraction seam.
 */
export interface PostHogClient {
  capture(args: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
    groups?: Record<string, string>;
  }): void;
  /**
   * Decide endpoint — returns flag values for a user/group.
   * Used by the evaluator only on DB miss (rare).
   */
  getAllFlags?(distinctId: string, options?: unknown): Promise<Record<string, boolean | string>>;
  isFeatureEnabled?(
    flagKey: string,
    distinctId: string,
    options?: unknown,
  ): Promise<boolean | undefined>;
  shutdown(): Promise<void>;
}

// ─── State ────────────────────────────────────────────────────────

let client: PostHogClient | null = null;
let initPromise: Promise<PostHogClient | null> | null = null;
let initialized = false;

// ─── Init ─────────────────────────────────────────────────────────

/**
 * Lazy initialiser. Safe to call from many places; the first call
 * spins up the singleton, subsequent calls await the same promise.
 *
 * Returns `null` when:
 *   - POSTHOG_PROJECT_KEY is not configured (degraded mode).
 *   - `posthog-node` is not installed (graceful disable).
 *   - Network init throws (logged + swallowed).
 *
 * Callers MUST treat `null` as "no-op" — never throw.
 */
export async function getPostHog(): Promise<PostHogClient | null> {
  if (initialized) return client;
  if (initPromise) return initPromise;
  initPromise = doInit();
  return initPromise;
}

async function doInit(): Promise<PostHogClient | null> {
  // Degraded mode: no project key → run without PostHog.
  if (!env.POSTHOG_PROJECT_KEY) {
    logger.info('[posthog] disabled — POSTHOG_PROJECT_KEY not configured');
    initialized = true;
    return null;
  }

  try {
    // Dynamic import — `posthog-node` is an optional runtime dep.
    // If it's missing the catch below downgrades to null gracefully.
    const mod = (await import('posthog-node')) as {
      PostHog: new (
        key: string,
        opts: { host: string; flushAt?: number; flushInterval?: number },
      ) => PostHogClient;
    };

    client = new mod.PostHog(env.POSTHOG_PROJECT_KEY, {
      host: env.POSTHOG_HOST,
      // Batch events; flush after 20 events or 10 seconds, whichever first.
      flushAt: 20,
      flushInterval: 10_000,
    });

    initialized = true;
    logger.info('[posthog] client initialised', { host: env.POSTHOG_HOST });
    return client;
  } catch (err) {
    logger.warn('[posthog] init failed — running without PostHog', {
      error: (err as Error).message,
    });
    client = null;
    initialized = true;
    return null;
  }
}

// ─── Graceful shutdown — flush in-flight events ───────────────────

/**
 * Drain pending captures. Called from `apps/api/src/server.ts`
 * SIGTERM handler so deployments don't lose the last few events.
 */
export async function shutdownPostHog(): Promise<void> {
  if (!client) return;
  try {
    await client.shutdown();
    logger.info('[posthog] shutdown complete');
  } catch (err) {
    logger.warn('[posthog] shutdown error', { error: (err as Error).message });
  }
}

// ─── Test seam — wipe singleton between vitest cases ──────────────

/**
 * Internal helper for unit tests. Not exported from the package.
 * Resets the singleton so a fresh PostHog instance is created on
 * the next `getPostHog()` call.
 */
export function __resetPostHogForTests(): void {
  client = null;
  initPromise = null;
  initialized = false;
}
