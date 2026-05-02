// ═══════════════════════════════════════════════════════════════
// QUEUE REDIS CONNECTION — ioredis instance for BullMQ
//
// Why TWO separate connection factories (producer + worker):
//   Producer: maxRetriesPerRequest=3 — fail fast if Redis down
//             (caller should NOT block forever on enqueue)
//   Worker:   maxRetriesPerRequest=null — wait forever for Redis
//             (worker MUST keep processing — exception breaks worker loop)
//
// Why enableReadyCheck=false: Faster connection, prevents BullMQ warning.
// Why TLS auto-detect: rediss:// URLs need TLS, redis:// URLs don't.
// Pattern: BullMQ official docs (https://docs.bullmq.io/guide/connections)
// ═══════════════════════════════════════════════════════════════

import { Redis, type RedisOptions } from 'ioredis';
import { env } from '../../config/env.js';
import { logger } from '../logger.js';

/** Parse Redis URL once — reused by both producer + worker connections */
function parseConnectionOptions(): RedisOptions {
  if (!env.QUEUE_REDIS_URL) {
    throw new Error('[Queue] QUEUE_REDIS_URL not set — cannot create Redis connection');
  }

  const url = new URL(env.QUEUE_REDIS_URL);
  const useTls = url.protocol === 'rediss:';

  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    family: 0, // IPv4 + IPv6 — Railway's redis.railway.internal needs IPv6
    enableReadyCheck: false,
    ...(useTls && { tls: {} }),
  };
}

let producerInstance: Redis | null = null;

/**
 * Producer connection — for adding jobs to queues.
 * Fails fast (3 retries) so API request handlers don't hang on Redis outage.
 * Single shared instance (BullMQ supports this for Queue class).
 */
export function getProducerConnection(): Redis {
  if (producerInstance) return producerInstance;

  const opts = parseConnectionOptions();
  producerInstance = new Redis({
    ...opts,
    maxRetriesPerRequest: 3,
    // Disable offline queue on producer — fail fast, return error to caller
    enableOfflineQueue: false,
  });

  producerInstance.on('error', (err) => {
    // Don't crash on Redis errors — caller will get rejected promise
    logger.error('[Queue] Producer Redis error', {
      error: err.message,
      code: (err as NodeJS.ErrnoException).code,
    });
  });

  producerInstance.on('connect', () => {
    logger.info('[Queue] Producer Redis connected');
  });

  return producerInstance;
}

/**
 * Worker connection — for consuming jobs from queues.
 * Waits forever (maxRetries=null) — worker must NEVER throw on transient
 * Redis hiccups, or worker loop dies and stalls jobs.
 *
 * Each call returns a NEW connection (BullMQ Worker requires its own).
 */
export function createWorkerConnection(): Redis {
  const opts = parseConnectionOptions();
  const conn = new Redis({
    ...opts,
    maxRetriesPerRequest: null,
    // Keep offline queue ON for worker — buffer commands during reconnect
    enableOfflineQueue: true,
  });

  conn.on('error', (err) => {
    logger.error('[Worker] Worker Redis error', {
      error: err.message,
      code: (err as NodeJS.ErrnoException).code,
    });
  });

  conn.on('connect', () => {
    logger.info('[Worker] Worker Redis connected');
  });

  return conn;
}

/**
 * Graceful shutdown — close producer connection on SIGTERM.
 * Workers handle their own connection close (in worker package).
 */
export async function closeProducerConnection(): Promise<void> {
  if (producerInstance) {
    await producerInstance.quit().catch(() => {
      // Force disconnect if quit hangs (TCP socket already gone)
      producerInstance?.disconnect();
    });
    producerInstance = null;
    logger.info('[Queue] Producer Redis closed');
  }
}

/**
 * Health check — used by /health endpoint.
 * Returns latency or null if Redis unreachable.
 */
export async function pingQueueRedis(): Promise<{
  ok: boolean;
  latencyMs: number;
  error?: string;
}> {
  if (!env.QUEUE_REDIS_URL) {
    return { ok: false, latencyMs: 0, error: 'QUEUE_REDIS_URL not set' };
  }
  try {
    const conn = getProducerConnection();
    const start = Date.now();
    const pong = await conn.ping();
    const latencyMs = Date.now() - start;
    return { ok: pong === 'PONG', latencyMs };
  } catch (err) {
    return {
      ok: false,
      latencyMs: 0,
      error: (err as Error).message,
    };
  }
}
