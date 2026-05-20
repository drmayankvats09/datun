// apps/web/lib/posthog/client.ts
// ═══════════════════════════════════════════════════════════════
// POSTHOG CLIENT (browser) — Lazy wrapper (Task #49)
// ─────────────────────────────────────────────────────────────────
// Thin abstraction over `posthog-js`. The rest of the app NEVER
// imports `posthog-js` directly — they import from `@/lib/posthog`.
// That keeps the vendor swappable.
//
// Why lazy:
//   - `posthog-js` is ~75 KB gzipped. Loading it eagerly inflates
//     First Contentful Paint on the marketing page where most
//     visitors never interact. Lazy import defers the cost until
//     the first `capture()` / `identify()` call.
//   - When `NEXT_PUBLIC_POSTHOG_KEY` is unset, no module load
//     ever happens — perfect for self-hosted Datun forks that
//     want analytics-free deployments.
//
// Browser-only:
//   This file imports `posthog-js`. Next.js will tree-shake it out
//   of server bundles ONLY if every consumer is gated by a
//   `'use client'` boundary above it. The provider component does
//   exactly that. Server-side analogues live in `./server.ts`.
//
// Reference patterns:
//   - PostHog official Next.js App Router docs (May 2025 revision).
//   - Vercel Analytics' `inject()` lazy-load pattern.
//   - Sentry's `Sentry.init()` deferred-config pattern.
// ═══════════════════════════════════════════════════════════════

'use client';

import type { PostHogConfig } from './types';

// ─── State ───────────────────────────────────────────────────────

interface PostHogBrowser {
  capture(event: string, properties?: Record<string, unknown>): void;
  identify(distinctId: string, props?: Record<string, unknown>): void;
  reset(): void;
  feature_flags?: {
    onFeatureFlags?(callback: () => void): void;
    override?(flags: Record<string, boolean | string>): void;
  };
  reloadFeatureFlags?(): void;
}

let posthogInstance: PostHogBrowser | null = null;
let initPromise: Promise<PostHogBrowser | null> | null = null;

// ─── Init ────────────────────────────────────────────────────────

/**
 * Initialise the PostHog browser SDK. Idempotent — repeat calls
 * return the same promise. Safe to call from React effects.
 *
 * Returns `null` when:
 *   - `NEXT_PUBLIC_POSTHOG_KEY` is unset (degraded mode).
 *   - `posthog-js` fails to load (network / CSP).
 *   - Caller is running on the server (`typeof window` guard).
 *
 * Callers MUST treat `null` as "no-op" — never throw.
 */
export async function initPostHog(config: PostHogConfig): Promise<PostHogBrowser | null> {
  if (typeof window === 'undefined') return null;
  if (!config.apiKey) return null;
  if (posthogInstance) return posthogInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Dynamic import — pulls `posthog-js` only when we actually need it.
      const mod = (await import('posthog-js')) as {
        default: PostHogBrowser & {
          init(
            key: string,
            options: {
              api_host: string;
              capture_pageview: boolean;
              capture_pageleave: boolean;
              autocapture: boolean;
              disable_session_recording: boolean;
              persistence: 'localStorage+cookie' | 'memory';
              respect_dnt: boolean;
              bootstrap?: { featureFlags?: Record<string, boolean | string> };
            },
          ): void;
        };
      };

      mod.default.init(config.apiKey, {
        api_host: config.host,
        // Pageviews + leave events are tracked by the provider's effect,
        // not by PostHog's autocapture — gives us route-aware pageviews
        // under Next.js App Router (autocapture mis-fires on RSC nav).
        capture_pageview: false,
        capture_pageleave: true,
        // Autocapture clicks/etc. — useful for funnel analysis. Off in
        // development to keep dev consoles quiet.
        autocapture: config.autocapture ?? true,
        // Session replay is OFF — protects DPDP-grade patient data.
        // Memory rule: never record clinical content (chat photos,
        // assessments) into a third-party replay vendor.
        disable_session_recording: true,
        // localStorage + cookie hybrid so identification survives
        // cookie clearing (memory rule #5 partial redundancy).
        persistence: 'localStorage+cookie',
        // Honour DNT — required for EU users and a defence-in-depth
        // posture for India's DPDP framework.
        respect_dnt: true,
        // Bootstrap with the SSR-evaluated flag map so the very first
        // render does not flicker between default and personalised.
        bootstrap: config.bootstrap
          ? { featureFlags: config.bootstrap as Record<string, boolean | string> }
          : undefined,
      });

      posthogInstance = mod.default;
      return mod.default;
    } catch {
      // Network blocked (ad-blocker, corporate proxy, CSP miss) — degrade.
      posthogInstance = null;
      return null;
    }
  })();

  return initPromise;
}

// ─── Helpers used across the app ─────────────────────────────────

export function capturePostHogEvent(event: string, properties?: Record<string, unknown>): void {
  posthogInstance?.capture(event, properties);
}

export function identifyPostHogUser(distinctId: string, props?: Record<string, unknown>): void {
  posthogInstance?.identify(distinctId, props);
}

export function resetPostHogIdentity(): void {
  posthogInstance?.reset();
}

export function reloadPostHogFlags(): void {
  posthogInstance?.reloadFeatureFlags?.();
}

/**
 * Manual override for a flag at the BROWSER level only. Useful for
 * QA on staging without touching the DB. Never propagates to the
 * server-side evaluator — the next /api/flags refetch wipes it.
 */
export function overridePostHogFlag(key: string, value: boolean): void {
  posthogInstance?.feature_flags?.override?.({ [key]: value });
}

/**
 * Test seam.
 */
export function __resetPostHogForTests(): void {
  posthogInstance = null;
  initPromise = null;
}
