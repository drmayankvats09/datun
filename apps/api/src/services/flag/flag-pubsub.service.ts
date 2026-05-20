// apps/api/src/services/flag/flag-pubsub.service.ts
// ═══════════════════════════════════════════════════════════════
// FLAG PUB/SUB — Cross-instance L1 invalidation (Task #49)
// ─────────────────────────────────────────────────────────────────
// Problem: API runs as 2+ replicas behind the Railway load-balancer.
// When an admin toggles a flag on replica A, replica B's L1 cache
// would still serve the stale value until its 30-second TTL expires.
// That's 30 seconds of inconsistency — unacceptable for kill switches.
//
// Solution: ioredis pub/sub broadcasts an invalidation message on a
// dedicated channel; every replica subscribes and wipes the matching
// entries from its L1 LRU. Convergence target: < 100ms.
//
// Why ioredis (TCP) and not Upstash (REST):
//   Upstash REST has no SUBSCRIBE primitive — REST is request/response.
//   Railway's `QUEUE_REDIS_URL` is a TCP endpoint and ioredis is
//   already a dependency for BullMQ. We reuse the same Redis instance
//   for pub/sub, but on dedicated subscriber + publisher connections
//   (ioredis requires this — a subscribed connection can't issue
//   other commands).
//
// Degraded mode: if `QUEUE_REDIS_URL` is unset (dev / first boot), we
// log a warning and skip subscription. The L1 cache then converges
// through natural TTL expiry only — slower but safe.
//
// Reference patterns:
//   - LaunchDarkly server-side relay daemon (uses Redis pub/sub).
//   - PgBouncer's notify-based config reload.
//   - Stripe's flag-relay broadcast model (post-mortem 2022).
// ═══════════════════════════════════════════════════════════════

import { Redis } from 'ioredis';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { l1Cache } from './flag-cache-l1.service.js';

// ─── Channel name + payload schema ───────────────────────────────

export const FLAG_INVALIDATE_CHANNEL = 'datun:flags:invalidate';

interface InvalidatePayload {
  readonly flagKey: string;
  /** Hostname of the publisher — useful for debugging echo loops. */
  readonly publishedBy?: string;
}

// ─── Module state ────────────────────────────────────────────────

let subscriber: Redis | null = null;
let publisher: Redis | null = null;
let subscribed = false;

// ─── Init ────────────────────────────────────────────────────────

/**
 * Boot the subscriber. Idempotent — safe across multiple imports.
 * No-op when `QUEUE_REDIS_URL` is unset (degraded TTL-only mode).
 *
 * Called from `server.ts` after Redis health check.
 */
export async function initFlagPubsub(): Promise<void> {
  if (subscribed) return;
  if (!env.QUEUE_REDIS_URL) {
    logger.warn('[flag-pubsub] disabled — QUEUE_REDIS_URL not set; L1 will converge via TTL only');
    return;
  }

  try {
    subscriber = new Redis(env.QUEUE_REDIS_URL, {
      // Subscriber connections must wait forever — losing the
      // subscription is worse than slow startup.
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      // Subscriber loses the connection on transient errors; auto-reconnect.
      retryStrategy: (attempt) => Math.min(attempt * 200, 5000),
    });

    subscriber.on('error', (err) => {
      logger.warn('[flag-pubsub] subscriber error', { error: err.message });
    });

    subscriber.on('message', (channel, raw) => {
      if (channel !== FLAG_INVALIDATE_CHANNEL) return;
      try {
        const payload = JSON.parse(raw) as InvalidatePayload;
        if (!payload?.flagKey) return;
        const removed = l1Cache.invalidateFlag(payload.flagKey);
        if (removed > 0) {
          logger.debug('[flag-pubsub] invalidated L1', {
            flagKey: payload.flagKey,
            entries: removed,
            from: payload.publishedBy ?? 'unknown',
          });
        }
      } catch (err) {
        logger.warn('[flag-pubsub] bad invalidate message', {
          raw,
          error: (err as Error).message,
        });
      }
    });

    await subscriber.subscribe(FLAG_INVALIDATE_CHANNEL);
    subscribed = true;
    logger.info('[flag-pubsub] subscribed', { channel: FLAG_INVALIDATE_CHANNEL });
  } catch (err) {
    logger.warn('[flag-pubsub] init failed; running with TTL-only convergence', {
      error: (err as Error).message,
    });
    subscriber = null;
    subscribed = false;
  }
}

/**
 * Broadcast: tell every replica (including this one) to drop
 * cached evaluations for `flagKey`. Best-effort: if Redis is down,
 * we log and let TTL handle it.
 *
 * Called from the admin CRUD route after a successful upsert.
 */
export async function publishFlagInvalidation(flagKey: string): Promise<void> {
  if (!env.QUEUE_REDIS_URL) return;
  if (!publisher) {
    publisher = new Redis(env.QUEUE_REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      enableOfflineQueue: false,
    });
    publisher.on('error', (err) => {
      logger.warn('[flag-pubsub] publisher error', { error: err.message });
    });
  }
  const payload: InvalidatePayload = {
    flagKey,
    publishedBy: process.env.HOSTNAME ?? 'api',
  };
  try {
    await publisher.publish(FLAG_INVALIDATE_CHANNEL, JSON.stringify(payload));
  } catch (err) {
    logger.warn('[flag-pubsub] publish failed', {
      flagKey,
      error: (err as Error).message,
    });
  }
}

/**
 * Graceful shutdown — close both connections cleanly on SIGTERM.
 */
export async function shutdownFlagPubsub(): Promise<void> {
  const tasks: Array<Promise<unknown>> = [];
  if (subscriber) {
    tasks.push(
      subscriber.quit().catch(() => {
        subscriber?.disconnect();
      }),
    );
    subscriber = null;
    subscribed = false;
  }
  if (publisher) {
    tasks.push(
      publisher.quit().catch(() => {
        publisher?.disconnect();
      }),
    );
    publisher = null;
  }
  await Promise.allSettled(tasks);
  logger.info('[flag-pubsub] shutdown complete');
}

/**
 * Test seam — wipe singletons between vitest cases.
 */
export function __resetPubsubForTests(): void {
  subscriber = null;
  publisher = null;
  subscribed = false;
}
