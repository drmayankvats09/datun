// ═══════════════════════════════════════════════════════════════
// WORKER REDIS CONNECTION — One per worker
// Pattern: BullMQ docs (https://docs.bullmq.io/guide/connections)
// ═══════════════════════════════════════════════════════════════

import { Redis, type RedisOptions } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

function parseConnectionOptions(): RedisOptions {
  const url = new URL(env.QUEUE_REDIS_URL);
  const useTls = url.protocol === 'rediss:';

  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    username: url.username || undefined,
    password: url.password || undefined,
    family: 0,
    enableReadyCheck: false,
    maxRetriesPerRequest: null, // Workers wait forever
    enableOfflineQueue: true,
    ...(useTls && { tls: {} }),
  };
}

export function createWorkerConnection(): Redis {
  const conn = new Redis(parseConnectionOptions());

  conn.on('error', (err) => {
    logger.error('[Worker] Redis error', {
      error: err.message,
    });
  });

  conn.on('connect', () => {
    logger.info('[Worker] Redis connected');
  });

  return conn;
}
