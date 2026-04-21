// ═══════════════════════════════════════════════════════════════
// REDIS CLIENT — Upstash REST API + In-memory fallback
// Serverless-compatible (no TCP, no connection pool).
// If Redis is down or not configured → graceful fallback to Map.
// Pattern: Vercel KV, Cloudflare KV, every edge-compatible cache.
//
// TTL Strategy (from Task PDF):
//   OTP: 600s (10 min) | OTP hourly count: 3600s (1 hr)
//   Alert dedup: 1800s (30 min) | Cost daily: 30 days
//   Sessions: 7 days (future) | AI cache: 24hr (future)
//   Dashboard: 5 min (future)
//
// Free tier: 10k commands/day — sufficient up to 5k DAU.
// ═══════════════════════════════════════════════════════════════

import { Redis } from '@upstash/redis';
import { env } from '../config/env.js';
import { logger } from './logger.js';

// ── State ──

let redis: Redis | null = null;
let redisAvailable = false;

// ── In-memory fallback (when Redis not configured or down) ──

const memoryStore = new Map<string, { value: string; expiresAt: number | null }>();

// Cleanup expired keys every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expiresAt && entry.expiresAt < now) {
      memoryStore.delete(key);
    }
  }
}, 60_000);

// ── Initialize ──

export function initRedis(): void {
  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    logger.warn(
      '⚠️ Redis not configured — using in-memory fallback (add UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)',
    );
    return;
  }

  try {
    redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });
    redisAvailable = true;
    logger.info('Redis client initialized (Upstash REST)');
  } catch (err) {
    logger.error('Redis client init failed', { error: (err as Error).message });
    redisAvailable = false;
  }
}

// ── Health Check ──

export async function verifyRedis(): Promise<{ ok: boolean; latencyMs: number }> {
  if (!redis) return { ok: false, latencyMs: 0 };

  try {
    const start = Date.now();
    const pong = await redis.ping();
    const latencyMs = Date.now() - start;

    if (pong === 'PONG') {
      redisAvailable = true;
      logger.info(`✅ Redis connected (${latencyMs}ms)`);
      return { ok: true, latencyMs };
    }

    redisAvailable = false;
    return { ok: false, latencyMs };
  } catch (err) {
    logger.error('❌ Redis health check failed — falling back to in-memory', {
      error: (err as Error).message,
    });
    redisAvailable = false;
    return { ok: false, latencyMs: 0 };
  }
}

export function isRedisHealthy(): boolean {
  return redisAvailable;
}

// ═══════════════════════════════════════════════════════════════
// CACHE — Unified API with automatic fallback
// Services call cache.get/set/del — don't care if Redis or memory.
// ═══════════════════════════════════════════════════════════════

export const cache = {
  /**
   * Get a string value by key.
   * Returns null if key doesn't exist or is expired.
   */
  async get(key: string): Promise<string | null> {
    if (redis && redisAvailable) {
      try {
        const val = await redis.get<string>(key);
        return val ?? null;
      } catch (err) {
        logger.warn('Redis GET failed, using memory fallback', {
          key,
          error: (err as Error).message,
        });
        markUnhealthy();
      }
    }

    // Memory fallback
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value;
  },

  /**
   * Set a string value with optional TTL (seconds).
   * No TTL = lives forever (until deleted or server restart for memory).
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (redis && redisAvailable) {
      try {
        if (ttlSeconds) {
          await redis.set(key, value, { ex: ttlSeconds });
        } else {
          await redis.set(key, value);
        }
        return;
      } catch (err) {
        logger.warn('Redis SET failed, using memory fallback', {
          key,
          error: (err as Error).message,
        });
        markUnhealthy();
      }
    }

    // Memory fallback
    memoryStore.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  },

  /**
   * Delete a key.
   */
  async del(key: string): Promise<void> {
    if (redis && redisAvailable) {
      try {
        await redis.del(key);
        return;
      } catch (err) {
        logger.warn('Redis DEL failed, using memory fallback', {
          key,
          error: (err as Error).message,
        });
        markUnhealthy();
      }
    }

    memoryStore.delete(key);
  },

  /**
   * Increment a counter atomically.
   * If key doesn't exist, starts at 0 then increments to 1.
   * Optional TTL only applied when key is first created (counter = 1).
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (redis && redisAvailable) {
      try {
        const val = await redis.incr(key);
        // Set TTL only on first increment (new key)
        if (ttlSeconds && val === 1) {
          await redis.expire(key, ttlSeconds);
        }
        return val;
      } catch (err) {
        logger.warn('Redis INCR failed, using memory fallback', {
          key,
          error: (err as Error).message,
        });
        markUnhealthy();
      }
    }

    // Memory fallback
    const entry = memoryStore.get(key);
    const current = entry ? parseInt(entry.value, 10) || 0 : 0;
    const newVal = current + 1;
    memoryStore.set(key, {
      value: String(newVal),
      expiresAt:
        ttlSeconds && newVal === 1 ? Date.now() + ttlSeconds * 1000 : (entry?.expiresAt ?? null),
    });
    return newVal;
  },

  /**
   * Increment a float value atomically (for cost tracking).
   */
  async incrByFloat(key: string, amount: number, ttlSeconds?: number): Promise<number> {
    if (redis && redisAvailable) {
      try {
        const val = await redis.incrbyfloat(key, amount);
        if (ttlSeconds) {
          // Check TTL — only set if not already set
          const ttl = await redis.ttl(key);
          if (ttl === -1) await redis.expire(key, ttlSeconds);
        }
        return val;
      } catch (err) {
        logger.warn('Redis INCRBYFLOAT failed, using memory fallback', {
          key,
          error: (err as Error).message,
        });
        markUnhealthy();
      }
    }

    // Memory fallback
    const entry = memoryStore.get(key);
    const current = entry ? parseFloat(entry.value) || 0 : 0;
    const newVal = current + amount;
    memoryStore.set(key, {
      value: String(newVal),
      expiresAt: entry?.expiresAt ?? (ttlSeconds ? Date.now() + ttlSeconds * 1000 : null),
    });
    return newVal;
  },

  /**
   * Check if a key exists.
   */
  async exists(key: string): Promise<boolean> {
    if (redis && redisAvailable) {
      try {
        const count = await redis.exists(key);
        return count > 0;
      } catch {
        markUnhealthy();
      }
    }

    const entry = memoryStore.get(key);
    if (!entry) return false;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      memoryStore.delete(key);
      return false;
    }
    return true;
  },
};

// ── TTL Constants (exported for services) ──

export const TTL = {
  /** OTP code: 10 minutes */
  OTP: 600,
  /** OTP hourly rate limit: 1 hour */
  OTP_HOURLY: 3600,
  /** Alert dedup cooldown: 30 minutes (default) */
  ALERT_DEDUP: 1800,
  /** AI cost daily totals: 30 days */
  COST_DAILY: 30 * 24 * 3600,
  /** User session: 7 days (future) */
  SESSION: 7 * 24 * 3600,
  /** AI response cache: 24 hours (future) */
  AI_CACHE: 24 * 3600,
  /** Dashboard data cache: 5 minutes (future) */
  DASHBOARD: 300,
} as const;

// ── Internal ──

function markUnhealthy(): void {
  redisAvailable = false;
  // Try to reconnect after 30 seconds
  setTimeout(async () => {
    if (redis) {
      try {
        await redis.ping();
        redisAvailable = true;
        logger.info('Redis reconnected after failure');
      } catch {
        // Still down — next operation will try again
      }
    }
  }, 30_000);
}
