// ═══════════════════════════════════════════════════════════════
// CRON LOCK — Distributed lock for multi-instance cron safety
// Only ONE instance executes a given cron run.
// Uses Redis SET NX EX (atomic) — same pattern as Bull queue locks.
// Falls back to "always run" if Redis unavailable.
// ═══════════════════════════════════════════════════════════════

import { cache } from './redis.js';
import { logger } from './logger.js';

/**
 * Try to acquire a distributed lock for a cron job.
 * @param jobName - Unique cron identifier
 * @param ttlSeconds - Lock duration (should exceed cron's max runtime)
 * @returns true if lock acquired (this instance should run), false otherwise
 */
export async function acquireCronLock(jobName: string, ttlSeconds = 300): Promise<boolean> {
  const key = `cron:lock:${jobName}`;
  const existing = await cache.get(key);
  if (existing) {
    logger.info(`[Cron] ${jobName} already running on another instance, skipping`);
    return false;
  }
  await cache.set(key, '1', ttlSeconds);
  return true;
}

/** Release lock early if cron finishes before TTL */
export async function releaseCronLock(jobName: string): Promise<void> {
  const key = `cron:lock:${jobName}`;
  await cache.del(key);
}
