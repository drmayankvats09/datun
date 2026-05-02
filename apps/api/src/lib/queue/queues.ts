// ═══════════════════════════════════════════════════════════════
// QUEUE REGISTRY — One Queue instance per queue name
//
// Why single instance per queue:
//   - Connection pooling (one Redis socket per queue, not per .add())
//   - Listener attachment (events shared across producers in API)
//
// Lifecycle:
//   - Lazy-created on first access (saves connection on cold start)
//   - Closed on graceful shutdown (closeAllQueues)
//
// Pattern: Stripe queue registry, Linear job system
// ═══════════════════════════════════════════════════════════════

import { Queue, type QueueOptions } from 'bullmq';
import { QUEUE_NAMES, QUEUE_DEFAULTS, type QueueName } from '@repo/shared';
import { getProducerConnection } from './connection.js';
import { logger } from '../logger.js';
import { env } from '../../config/env.js';

const queues = new Map<QueueName, Queue>();

/**
 * Get or create a Queue instance for a given queue name.
 * Lazy initialization — first call creates, subsequent calls reuse.
 *
 * Returns null if QUEUE_REDIS_URL not configured (graceful degradation in dev).
 */
export function getQueue(name: QueueName): Queue | null {
  if (!env.QUEUE_REDIS_URL) {
    return null;
  }

  let queue = queues.get(name);
  if (!queue) {
    const opts: QueueOptions = {
      connection: getProducerConnection(),
      defaultJobOptions: QUEUE_DEFAULTS[name],
      // Prefix all keys — prevents collision if multiple Datun envs
      // share Redis (dev/staging/prod). Production sets env.NODE_ENV.
      prefix: `datun:${env.NODE_ENV}:bullmq`,
    };

    queue = new Queue(name, opts);

    queue.on('error', (err) => {
      logger.error(`[Queue:${name}] error`, {
        error: err.message,
      });
    });

    queues.set(name, queue);
    logger.info(`[Queue:${name}] initialized`);
  }

  return queue;
}

/**
 * Get all initialized queues. Used by bull-board dashboard + health check.
 */
export function getAllQueues(): Queue[] {
  // Force-init all queues so dashboard can show them all
  if (env.QUEUE_REDIS_URL) {
    for (const name of Object.values(QUEUE_NAMES)) {
      getQueue(name);
    }
  }
  return Array.from(queues.values());
}

/**
 * Graceful shutdown — close all queue connections on SIGTERM.
 * Idempotent — safe to call multiple times.
 */
export async function closeAllQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map((q) =>
    q.close().catch((err) => {
      logger.warn(`[Queue:${q.name}] close error`, {
        error: (err as Error).message,
      });
    }),
  );
  await Promise.all(closePromises);
  queues.clear();
  logger.info('[Queue] All queues closed');
}
