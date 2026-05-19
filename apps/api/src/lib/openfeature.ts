// apps/api/src/lib/openfeature.ts
// ═══════════════════════════════════════════════════════════════
// OPENFEATURE — Vendor-agnostic provider seam (Task #49)
// ─────────────────────────────────────────────────────────────────
// This file defines a minimal `FlagProvider` interface that wraps
// whatever vendor (PostHog today, possibly LaunchDarkly/GrowthBook
// later) actually evaluates flags. The rest of the codebase only
// imports the interface — switching vendor is a one-file change.
//
// We do NOT import the official `@openfeature/server-sdk` package
// because:
//   1. It adds ~120KB of weight for plug-in resolution we don't need.
//   2. The hot path (evaluator) prefers our own L1+L2 cache and only
//      hits a vendor on DB miss — full SDK lifecycle is overkill.
//   3. Keeping the seam local lets us evolve it (e.g. add `getReason`
//      to match our `FlagEvaluationReason` taxonomy).
//
// Spec reference:
//   - OpenFeature provider spec v0.7 (Jan 2026)
//     https://openfeature.dev/specification/sections/providers
//   - LaunchDarkly server SDK ResolveDetails shape
//   - Vercel Flags SDK provider contract
// ═══════════════════════════════════════════════════════════════

import type { FlagContext, FlagEvaluation, FlagKey } from '@repo/shared';
import { getPostHog } from './posthog.js';
import { logger } from './logger.js';

// ─── Provider contract ────────────────────────────────────────────

/**
 * Minimal contract every provider implementation must satisfy.
 *
 * Methods return `null` when the provider cannot answer (rate limit,
 * network failure, unknown flag). The caller treats `null` as "ask
 * the next layer" — falls back to defaults.
 */
export interface FlagProvider {
  readonly name: string;
  /** Boolean eval. Returns null when the provider has no answer. */
  evaluateBoolean(
    key: FlagKey,
    context: FlagContext,
    defaultValue: boolean,
  ): Promise<{ value: boolean; reason: FlagEvaluation['reason'] } | null>;
  /** Bulk read used by the sync worker. Returns full snapshot. */
  listAll(): Promise<ReadonlyArray<RemoteFlagSnapshot> | null>;
}

/**
 * Subset of vendor flag definition the sync worker needs to mirror
 * a flag into our DB cache. Intentionally vendor-neutral.
 */
export interface RemoteFlagSnapshot {
  readonly flagKey: string;
  readonly status: 'OFF' | 'ON' | 'ROLLOUT_BUCKET' | 'TARGETED';
  readonly defaultValue: boolean;
  readonly rolloutPercent: number;
  readonly archived: boolean;
}

// ─── PostHog provider (day-one default) ──────────────────────────

class PostHogProvider implements FlagProvider {
  public readonly name = 'posthog';

  async evaluateBoolean(
    key: FlagKey,
    context: FlagContext,
  ): Promise<{ value: boolean; reason: FlagEvaluation['reason'] } | null> {
    const ph = await getPostHog();
    if (!ph || !ph.isFeatureEnabled) return null;
    const distinctId = context.userId ?? context.clinicId ?? 'anonymous';
    try {
      const result = await ph.isFeatureEnabled(key, distinctId, {
        groups: context.clinicId ? { clinic: context.clinicId } : undefined,
      });
      if (typeof result !== 'boolean') return null;
      // PostHog does not expose a reason taxonomy — we tag broadly.
      return { value: result, reason: result ? 'TARGETED_HIT' : 'TARGETED_MISS' };
    } catch (err) {
      logger.warn('[openfeature] PostHog evaluation failed', {
        flagKey: key,
        error: (err as Error).message,
      });
      return null;
    }
  }

  async listAll(): Promise<ReadonlyArray<RemoteFlagSnapshot> | null> {
    // PostHog Personal API key is required to read the full flag list.
    // We do not call it from here; the sync worker uses its own
    // REST client (`flag-sync.service.ts`) for richer metadata.
    // Returning null tells the caller to use the worker path.
    return null;
  }
}

// ─── Null provider (used when no vendor is configured) ────────────

class NullProvider implements FlagProvider {
  public readonly name = 'null';
  async evaluateBoolean(): Promise<null> {
    return null;
  }
  async listAll(): Promise<ReadonlyArray<RemoteFlagSnapshot> | null> {
    return null;
  }
}

// ─── Registry ─────────────────────────────────────────────────────

let activeProvider: FlagProvider = new PostHogProvider();

/**
 * Read-only accessor for the active provider. Imported by the
 * evaluator. The provider is module-level (not request-scoped) —
 * swapping is a deploy-time operation.
 */
export function getProvider(): FlagProvider {
  return activeProvider;
}

/**
 * Switch providers at boot. Currently called from `server.ts` only
 * when `POSTHOG_API_KEY` is missing → we install `NullProvider` to
 * suppress the chatty "PostHog disabled" warning from every eval.
 */
export function setProvider(provider: FlagProvider): void {
  logger.info('[openfeature] active provider', { name: provider.name });
  activeProvider = provider;
}

/**
 * Convenience for test teardown.
 */
export function __resetProviderForTests(): void {
  activeProvider = new PostHogProvider();
}

export { PostHogProvider, NullProvider };
