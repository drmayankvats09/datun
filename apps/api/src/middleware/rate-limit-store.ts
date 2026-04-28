// ═══════════════════════════════════════════════════════════════
// REDIS RATE LIMIT STORE — Distributed counters for express-rate-limit
//
// Why not in-memory (default):
//   - Railway auto-scales to 2+ instances
//   - Each instance has its own Map → attacker gets N × max attempts
//   - Redis = single shared counter → consistent enforcement
//
// Why not @upstash/ratelimit (separate package):
//   - We already have @upstash/redis + in-memory fallback in redis.ts
//   - Custom store reuses that abstraction (DRY, no new dependency)
//   - express-rate-limit's middleware pattern stays unchanged
//   - In-memory fallback automatic when Redis is down
//
// Pattern: Stripe rate limiter, Vercel Edge rate limiting.
// ═══════════════════════════════════════════════════════════════

import type { Store, IncrementResponse, Options } from 'express-rate-limit';
import { cache } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

/**
 * Creates a Redis-backed store for express-rate-limit.
 *
 * Uses cache.incr() which:
 *   - Tries Upstash Redis first (distributed, survives restart)
 *   - Falls back to in-memory Map (still works, just per-instance)
 *
 * @param prefix — Key namespace (e.g., 'rl:general', 'rl:auth')
 */
export function createRedisStore(prefix: string): Store {
  let windowMs = 60_000; // Default, overridden by init()

  const store: Store = {
    /**
     * Called once by express-rate-limit with the middleware options.
     * We extract windowMs to calculate TTL for Redis keys.
     */
    init(options: Options): void {
      windowMs = options.windowMs;
      logger.info(`[RateLimit] Redis store initialized: ${prefix} (window: ${windowMs}ms)`);
    },

    /**
     * Increment hit counter for a client IP.
     * Returns total hits and estimated reset time.
     *
     * cache.incr() is atomic in Redis (INCR command) — no race condition.
     * TTL set on first hit only (val === 1), auto-expires after window.
     */
    async increment(key: string): Promise<IncrementResponse> {
      const storeKey = `${prefix}:${key}`;
      const ttlSeconds = Math.ceil(windowMs / 1000);

      const totalHits = await cache.incr(storeKey, ttlSeconds);

      return {
        totalHits,
        resetTime: new Date(Date.now() + windowMs),
      };
    },

    /**
     * Decrement counter (used when request completes successfully in some configs).
     * Redis doesn't have native DECR with TTL, so we skip.
     * express-rate-limit docs: "decrement is optional and rarely needed."
     */
    async decrement(_key: string): Promise<void> {
      // No-op — express-rate-limit calls this rarely, and skipping is safe.
      // Redis key auto-expires via TTL anyway.
    },

    /**
     * Reset a specific client's counter (e.g., after successful CAPTCHA).
     */
    async resetKey(key: string): Promise<void> {
      const storeKey = `${prefix}:${key}`;
      await cache.del(storeKey);
    },

    /**
     * Reset ALL counters. Called when express-rate-limit is re-initialized.
     * We don't implement full Redis SCAN + DELETE for safety.
     * Keys auto-expire via TTL anyway.
     */
    async resetAll(): Promise<void> {
      logger.info(`[RateLimit] resetAll called for ${prefix} (keys expire via TTL)`);
    },
  };

  return store;
}
