// ═══════════════════════════════════════════════════════════════
// CRON LOCK — Atomic distributed lock for multi-instance safety
// Pattern: Redis INCR + TTL (used by Shopify, Stripe job runners)
//
// How it works:
//   1. INCR is atomic — first caller gets 1, second gets 2
//   2. Only value === 1 means "you got the lock"
//   3. TTL auto-releases if job crashes (no orphaned locks)
//   4. In-memory fallback = single instance always gets lock
//
// Usage in cron jobs:
//   if (!(await acquireCronLock('3day-followup', 600))) return;
//   try { ... } finally { await releaseCronLock('3day-followup'); }
// ═══════════════════════════════════════════════════════════════

import { cache } from './redis.js';
import { logger } from './logger.js';

/**
 * Try to acquire a distributed lock for a cron job.
 *
 * @param jobName  — Unique cron identifier (e.g., '3day-followup')
 * @param ttlSeconds — Lock duration. MUST exceed job's max runtime.
 *                     Default 600s (10 min) — safe for all current jobs.
 * @returns `true` if lock acquired (this instance should run), `false` otherwise
 */
export async function acquireCronLock(jobName: string, ttlSeconds = 600): Promise<boolean> {
  const key = `cron:lock:${jobName}`;

  try {
    // INCR is atomic in Redis — no race condition possible.
    // First caller: 0 → 1 (lock acquired)
    // Second caller: 1 → 2 (lock denied)
    const count = await cache.incr(key, ttlSeconds);

    if (count === 1) {
      logger.info(`[Cron] Lock acquired: ${jobName} (TTL ${ttlSeconds}s)`);
      return true;
    }

    // Another instance already running this job
    logger.info(
      `[Cron] Lock denied: ${jobName} (instance #${count} — another instance is running it)`,
    );
    return false;
  } catch (err) {
    // If Redis completely unavailable AND in-memory fallback fails,
    // let the job run anyway (single instance = safe, multi-instance = minor risk)
    logger.warn(`[Cron] Lock error for ${jobName}, running anyway`, {
      error: (err as Error).message,
    });
    return true;
  }
}

/**
 * Release lock early when job finishes before TTL expires.
 * Allows next scheduled run to execute immediately.
 * Safe to call even if lock wasn't acquired (no-op).
 */
export async function releaseCronLock(jobName: string): Promise<void> {
  const key = `cron:lock:${jobName}`;
  try {
    await cache.del(key);
    logger.info(`[Cron] Lock released: ${jobName}`);
  } catch {
    // Non-critical — TTL will auto-release anyway
  }
}

/**
 * Higher-order function — wraps any async cron handler with lock.
 * Usage: cron.schedule('0 10 * * *', withCronLock('3day-followup', run3DayFollowUp));
 *
 * @param jobName — Lock identifier
 * @param handler — The actual cron function to run
 * @param ttlSeconds — Lock TTL (default 600s = 10 min)
 */
export function withCronLock(
  jobName: string,
  handler: () => Promise<void>,
  ttlSeconds = 600,
): () => Promise<void> {
  return async () => {
    if (!(await acquireCronLock(jobName, ttlSeconds))) return;
    try {
      await handler();
    } finally {
      await releaseCronLock(jobName);
    }
  };
}
