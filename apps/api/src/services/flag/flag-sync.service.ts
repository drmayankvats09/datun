// apps/api/src/services/flag/flag-sync.service.ts
// ═══════════════════════════════════════════════════════════════
// FLAG SYNC — PostHog → DB mirror (Task #49)
// ─────────────────────────────────────────────────────────────────
// Periodically (default every 60s) pulls flag definitions from
// PostHog and upserts them into the local `feature_flags` table.
//
// Why:
//   - PostHog is the admin UI source-of-truth, but a hard dep on
//     PostHog being reachable would be a single point of failure
//     (memory rule #5). The DB acts as the authoritative cache: if
//     PostHog goes down for hours, the evaluator keeps serving the
//     last-known flag state from the DB.
//   - Cache invalidation on change: after a successful upsert that
//     altered status / rolloutPercent / targeting, we call
//     `flagCacheService.invalidateFlag()` so the next read picks up
//     the new value within seconds.
//
// Mechanics:
//   - Server-side `posthog-node` SDK does not expose a "list flags"
//     call. We use the public REST endpoint
//     `GET /api/projects/:project_id/feature_flags/`
//     authenticated with the Personal API key (POSTHOG_API_KEY).
//   - We treat the REST call as best-effort: a transient 5xx / network
//     error logs a warning and we retry on the next tick.
//   - Sync runs only when BOTH POSTHOG_API_KEY and POSTHOG_PROJECT_KEY
//     are configured. Otherwise the API stays in "DB-only mode" —
//     admins manage flags directly via the admin UI (Phase B/C).
//
// Lifecycle:
//   - `startFlagSync()` is called from `server.ts` after boot.
//   - On SIGTERM the timer is cleared by `stopFlagSync()`.
//
// Reference patterns:
//   - LaunchDarkly streaming polling fallback (server SDKs).
//   - Sentry release sync (periodic REST mirror).
//   - GrowthBook SDK polling mode.
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@repo/db';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { flagCacheService } from './flag-cache.service.js';

// ─── Module state ────────────────────────────────────────────────

let timer: NodeJS.Timeout | null = null;
let running = false;
let lastSuccessAt: number | null = null;
let lastErrorMessage: string | null = null;

// ─── PostHog REST response shape (only the bits we use) ──────────

interface PostHogFlagListResponse {
  readonly results?: ReadonlyArray<PostHogFlag>;
}

interface PostHogFlag {
  readonly id: number;
  readonly key: string;
  readonly name?: string;
  readonly active: boolean;
  readonly deleted?: boolean;
  /** Filters control rollout + targeting. We only need rollout %. */
  readonly filters?: {
    readonly groups?: ReadonlyArray<{
      readonly rollout_percentage?: number | null;
    }>;
  };
}

// ─── Lifecycle ───────────────────────────────────────────────────

/**
 * Start the periodic sync. Idempotent — safe to call multiple times.
 * No-op when credentials are missing (degraded DB-only mode).
 */
export function startFlagSync(): void {
  if (timer) return;

  if (!env.POSTHOG_API_KEY || !env.POSTHOG_PROJECT_KEY) {
    logger.info('[flag-sync] disabled — POSTHOG_API_KEY / POSTHOG_PROJECT_KEY not set');
    return;
  }

  const intervalMs = env.FLAG_SYNC_INTERVAL_SECONDS * 1000;
  logger.info('[flag-sync] starting', { intervalSeconds: env.FLAG_SYNC_INTERVAL_SECONDS });

  // Run once at boot so the DB warms up immediately, then on interval.
  void runOnce();
  timer = setInterval(() => {
    void runOnce();
  }, intervalMs);

  // Don't keep the event loop alive solely on this timer — graceful
  // shutdowns shouldn't have to wait for the next tick.
  if (timer && typeof timer.unref === 'function') {
    timer.unref();
  }
}

/**
 * Halt the periodic sync. Safe to call when sync was never started.
 */
export function stopFlagSync(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info('[flag-sync] stopped');
  }
}

/**
 * One-shot sync (also exposed for the admin "force-sync" route in
 * Phase B). Resolves to a small status object that the route returns
 * verbatim.
 */
export async function runOnce(): Promise<{
  ok: boolean;
  flagsSynced: number;
  errors: number;
  message?: string;
}> {
  if (running) {
    return { ok: false, flagsSynced: 0, errors: 0, message: 'sync already in progress' };
  }
  running = true;
  const startedAt = Date.now();
  let flagsSynced = 0;
  let errors = 0;

  try {
    const flags = await fetchFlagsFromPostHog();
    for (const f of flags) {
      try {
        const changed = await upsertFlagRow(f);
        flagsSynced++;
        if (changed) {
          await flagCacheService.invalidateFlag(f.key);
        }
      } catch (err) {
        errors++;
        logger.warn('[flag-sync] upsert failed', {
          flagKey: f.key,
          error: (err as Error).message,
        });
      }
    }
    lastSuccessAt = Date.now();
    lastErrorMessage = null;
    logger.info('[flag-sync] tick complete', {
      flagsSynced,
      errors,
      durationMs: Date.now() - startedAt,
    });
    return { ok: true, flagsSynced, errors };
  } catch (err) {
    lastErrorMessage = (err as Error).message;
    logger.warn('[flag-sync] tick failed', { error: lastErrorMessage });
    return { ok: false, flagsSynced, errors, message: lastErrorMessage };
  } finally {
    running = false;
  }
}

/**
 * Diagnostic snapshot — surfaced by Phase B's /api/admin/flags/sync-status.
 */
export function getSyncStatus(): {
  enabled: boolean;
  intervalSeconds: number;
  lastSuccessAt: string | null;
  lastErrorMessage: string | null;
} {
  return {
    enabled: Boolean(env.POSTHOG_API_KEY && env.POSTHOG_PROJECT_KEY),
    intervalSeconds: env.FLAG_SYNC_INTERVAL_SECONDS,
    lastSuccessAt: lastSuccessAt ? new Date(lastSuccessAt).toISOString() : null,
    lastErrorMessage,
  };
}

// ─── Internals ───────────────────────────────────────────────────

async function fetchFlagsFromPostHog(): Promise<ReadonlyArray<PostHogFlag>> {
  if (!env.POSTHOG_API_KEY || !env.POSTHOG_PROJECT_KEY) return [];

  // PostHog REST: `GET /api/projects/<project_id>/feature_flags/`
  // The project key (NEXT_PUBLIC_POSTHOG_KEY mirror) is NOT the
  // numeric project id; for a Personal-API-key call we hit the user-
  // scoped endpoint that infers the project from auth context.
  const url = new URL('/api/projects/@current/feature_flags/', env.POSTHOG_HOST);
  url.searchParams.set('limit', '200');

  // AbortController guards against PostHog stalls eating the timer slot.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.POSTHOG_API_KEY}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`PostHog flag list failed: HTTP ${res.status}`);
    }
    const body = (await res.json()) as PostHogFlagListResponse;
    return body.results ?? [];
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Upsert a single PostHog flag into the local DB cache. Returns
 * `true` when the DB row was created or its status / rollout changed
 * (caller invalidates the cache only on true changes).
 */
async function upsertFlagRow(remote: PostHogFlag): Promise<boolean> {
  const rolloutPercent = clampRolloutPercent(remote.filters?.groups?.[0]?.rollout_percentage);
  const archivedAt = remote.deleted ? new Date() : null;
  const status: 'OFF' | 'ON' | 'ROLLOUT_BUCKET' = !remote.active
    ? 'OFF'
    : rolloutPercent >= 100
      ? 'ON'
      : 'ROLLOUT_BUCKET';

  const existing = await prisma.featureFlag.findUnique({
    where: { flagKey: remote.key },
    select: {
      status: true,
      rolloutPercent: true,
      archivedAt: true,
    },
  });

  const changed =
    !existing ||
    existing.status !== status ||
    existing.rolloutPercent !== rolloutPercent ||
    Boolean(existing.archivedAt) !== Boolean(archivedAt);

  // Upsert by flagKey. We DO NOT overwrite admin-edited fields like
  // targetingRules, enabledClinicIds, etc. — those are managed only
  // through our admin UI (Phase C). PostHog controls the lifecycle
  // (active/percent/deleted); everything else is local.
  await prisma.featureFlag.upsert({
    where: { flagKey: remote.key },
    create: {
      flagKey: remote.key,
      name: remote.name ?? remote.key,
      description: '',
      // Unknown PostHog flag = treat as RELEASE by default. Admin can
      // re-categorise via the local admin UI.
      category: 'RELEASE',
      status,
      rolloutPercent,
      defaultValue: false,
      archivedAt,
      createdByUserId: 'system-flag-sync',
    },
    update: {
      // Only mirror lifecycle-managed fields.
      status,
      rolloutPercent,
      archivedAt,
    },
  });

  return changed;
}

function clampRolloutPercent(input: number | null | undefined): number {
  if (typeof input !== 'number' || Number.isNaN(input)) return 0;
  if (input < 0) return 0;
  if (input > 100) return 100;
  return Math.floor(input);
}
