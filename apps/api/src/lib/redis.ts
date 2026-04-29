// ═══════════════════════════════════════════════════════════════
// REDIS CLIENT — Upstash REST API + In-memory fallback
// THE central cache layer for Datun AI. Every service uses this.
// If Redis is down or not configured → graceful fallback to Map.
//
// Modules:
//   cache.*       — Generic get/set/del/incr (OTP, alerts, costs)
//   blacklist.*   — Token blacklist (logout, password change)
//   featureFlag.* — Feature flags (A/B test, rollout, kill switch)
//   aiCache.*     — AI response cache (semantic dedup)
//   rateLimitUser.* — Per-user rate limiting
//
// TTL Strategy:
//   OTP: 600s (10min) | OTP hourly: 3600s (1hr)
//   Alert dedup: 1800s (30min) | Cost daily: 30 days
//   Token blacklist: 7 days (match refresh token expiry)
//   AI cache: 24hr | Dashboard: 5min (future)
//   Feature flags: no expiry (manual control)
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
// MODULE 1: CACHE — Generic key-value with TTL
// Used by: OTP, alerts, cost tracker, any future service
// ═══════════════════════════════════════════════════════════════

export const cache = {
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
    const entry = memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return entry.value;
  },

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
    memoryStore.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  },

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

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    if (redis && redisAvailable) {
      try {
        const val = await redis.incr(key);
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
    const entry = memoryStore.get(key);
    const current = entry ? parseInt(entry.value, 10) || 0 : 0;
    const newVal = current + 1;
    // P2-F17: Always set expiresAt if ttlSeconds provided (fixes memory leak
    // when expired entry is re-incremented before cleanup runs)
    const computedExpiry = ttlSeconds
      ? entry?.expiresAt && entry.expiresAt > Date.now()
        ? entry.expiresAt
        : Date.now() + ttlSeconds * 1000
      : (entry?.expiresAt ?? null);
    memoryStore.set(key, {
      value: String(newVal),
      expiresAt: computedExpiry,
    });
    return newVal;
  },

  async incrByFloat(key: string, amount: number, ttlSeconds?: number): Promise<number> {
    if (redis && redisAvailable) {
      try {
        const val = await redis.incrbyfloat(key, amount);
        if (ttlSeconds) {
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
    const entry = memoryStore.get(key);
    const current = entry ? parseFloat(entry.value) || 0 : 0;
    const newVal = current + amount;
    memoryStore.set(key, {
      value: String(newVal),
      expiresAt: entry?.expiresAt ?? (ttlSeconds ? Date.now() + ttlSeconds * 1000 : null),
    });
    return newVal;
  },

  async setNX(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    if (redis && redisAvailable) {
      try {
        const result = await redis.set(key, value, { nx: true, ex: ttlSeconds });
        return result === 'OK';
      } catch (err) {
        logger.warn('Redis SETNX failed, using memory fallback', {
          key,
          error: (err as Error).message,
        });
        markUnhealthy();
      }
    }
    // In-memory fallback — atomic check-and-set
    const entry = memoryStore.get(key);
    if (entry) {
      // Key exists — but check if expired
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        // Expired → treat as not exists, set new value
        memoryStore.set(key, {
          value,
          expiresAt: Date.now() + ttlSeconds * 1000,
        });
        return true;
      }
      // Key exists and not expired → setNX fails
      return false;
    }
    // Key doesn't exist → set it
    memoryStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return true;
  },

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

// ═══════════════════════════════════════════════════════════════
// MODULE 2: TOKEN BLACKLIST — Logout + password change
// When user logs out, their JWT is blacklisted until expiry.
// Every auth check verifies token is NOT blacklisted.
// Pattern: Auth0 token revocation, Clerk session invalidation.
// ═══════════════════════════════════════════════════════════════

export const blacklist = {
  /** Blacklist a token (on logout, password change, account deactivation) */
  async add(userId: string, tokenExp: number): Promise<void> {
    const ttl = Math.max(tokenExp - Math.floor(Date.now() / 1000), 0);
    if (ttl <= 0) return; // Already expired, no need to blacklist
    await cache.set(`blacklist:${userId}`, '1', ttl);
  },

  /** Check if a user's tokens are blacklisted */
  async isBlacklisted(userId: string): Promise<boolean> {
    return cache.exists(`blacklist:${userId}`);
  },

  /** Remove blacklist (re-login after logout) */
  async remove(userId: string): Promise<void> {
    await cache.del(`blacklist:${userId}`);
  },
};

// ═══════════════════════════════════════════════════════════════
// MODULE 3: FEATURE FLAGS — Runtime feature control
// Toggle features without deploy. A/B test. Kill switch.
// Pattern: LaunchDarkly, Unleash, Vercel Edge Config.
//
// Usage:
//   await featureFlag.set('new-chat-ui', { enabled: true, percentage: 10 });
//   if (await featureFlag.isEnabled('new-chat-ui', userId)) { ... }
// ═══════════════════════════════════════════════════════════════

export interface FeatureFlagConfig {
  enabled: boolean;
  /** Percentage of users who see this feature (0-100). Null = all users */
  percentage?: number | null;
  /** Specific user IDs that always see this feature */
  allowList?: string[];
  /** Description for admin dashboard */
  description?: string;
}

export const featureFlag = {
  /** Set/update a feature flag */
  async set(flagName: string, config: FeatureFlagConfig): Promise<void> {
    await cache.set(`flag:${flagName}`, JSON.stringify(config));
  },

  /** Get a feature flag config */
  async get(flagName: string): Promise<FeatureFlagConfig | null> {
    const raw = await cache.get(`flag:${flagName}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as FeatureFlagConfig;
    } catch {
      return null;
    }
  },

  /** Check if feature is enabled for a specific user */
  async isEnabled(flagName: string, userId?: string): Promise<boolean> {
    const config = await featureFlag.get(flagName);
    if (!config) return false;
    if (!config.enabled) return false;

    // Allow list — specific users always get the feature
    if (userId && config.allowList?.includes(userId)) return true;

    // Percentage rollout — deterministic hash so same user always gets same result
    if (config.percentage != null && config.percentage < 100) {
      if (!userId) return false;
      const hash = simpleHash(userId + flagName);
      return hash % 100 < config.percentage;
    }

    return true;
  },

  /** Delete a feature flag */
  async remove(flagName: string): Promise<void> {
    await cache.del(`flag:${flagName}`);
  },
};

// Deterministic hash for percentage rollout (consistent per user+flag)
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// ═══════════════════════════════════════════════════════════════
// MODULE 4: AI RESPONSE CACHE — Semantic dedup
// Hash the last N messages → check cache → skip Claude if hit.
// At 70% hit rate, saves ₹50K-1L/month at scale.
// Pattern: OpenAI semantic cache, Anthropic prompt caching.
// ═══════════════════════════════════════════════════════════════

import crypto from 'node:crypto';

export const aiCache = {
  /** Generate cache key from messages (last 3 user messages) */
  generateKey(
    systemPromptVersion: string,
    messages: Array<{ role: string; content: unknown }>,
  ): string {
    // Take last 3 user messages for semantic fingerprint
    const userMessages = messages
      .filter((m) => m.role === 'user')
      .slice(-3)
      .map((m) => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
      .join('|');

    const fingerprint = `${systemPromptVersion}:${userMessages}`;
    const hash = crypto.createHash('sha256').update(fingerprint).digest('hex').slice(0, 16);
    return `ai:cache:${hash}`;
  },

  /** Get cached AI response */
  async get(key: string): Promise<string | null> {
    return cache.get(key);
  },

  /** Store AI response in cache */
  async set(key: string, response: string): Promise<void> {
    await cache.set(key, response, TTL.AI_CACHE);
  },
};

// ═══════════════════════════════════════════════════════════════
// MODULE 5: PER-USER RATE LIMITING
// IP-based rate limiting already exists (express-rate-limit).
// This adds per-userId limiting — survives restarts, distributed.
// Pattern: Stripe API rate limits, GitHub API per-token limits.
//
// Usage:
//   const allowed = await userRateLimit.check(userId, 'chat', 50, 3600);
//   if (!allowed) throw new RateLimitError();
// ═══════════════════════════════════════════════════════════════

export const userRateLimit = {
  /**
   * Check + increment rate limit for a user.
   * @returns true if allowed, false if limit exceeded
   */
  async check(
    userId: string,
    action: string,
    maxRequests: number,
    windowSeconds: number,
  ): Promise<boolean> {
    const key = `rl:${action}:${userId}`;
    const count = await cache.incr(key, windowSeconds);
    return count <= maxRequests;
  },

  /** Get current count for a user's rate limit */
  async getCount(userId: string, action: string): Promise<number> {
    const key = `rl:${action}:${userId}`;
    const raw = await cache.get(key);
    return raw ? parseInt(raw, 10) || 0 : 0;
  },
};

// ═══════════════════════════════════════════════════════════════
// TTL Constants (exported for all services)
// ═══════════════════════════════════════════════════════════════

export const TTL = {
  /** OTP code: 10 minutes */
  OTP: 600,
  /** OTP hourly rate limit: 1 hour */
  OTP_HOURLY: 3600,
  /** Alert dedup cooldown: 30 minutes (default) */
  ALERT_DEDUP: 1800,
  /** AI cost daily totals: 30 days */
  COST_DAILY: 30 * 24 * 3600,
  /** Token blacklist: 7 days (matches refresh token expiry) */
  BLACKLIST: 7 * 24 * 3600,
  /** AI response cache: 24 hours */
  AI_CACHE: 24 * 3600,
  /** User session: 7 days */
  SESSION: 7 * 24 * 3600,
  /** Dashboard data cache: 5 minutes */
  DASHBOARD: 300,
  /** Feature flags: no expiry (manual control) — use 0 */
  FLAG: 0,
} as const;

// ═══════════════════════════════════════════════════════════════
// Internal — Auto-reconnect after failure
// ═══════════════════════════════════════════════════════════════

function markUnhealthy(): void {
  redisAvailable = false;
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
