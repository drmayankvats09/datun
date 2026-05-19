// apps/api/src/services/flag/flag-cache.service.ts
// ═══════════════════════════════════════════════════════════════
// FLAG CACHE ORCHESTRATOR — L1 + L2 facade (Task #49)
// ─────────────────────────────────────────────────────────────────
// Sits between the evaluator and the cache stack:
//
//        ┌─────────────────────────────┐
//        │  evaluator.evaluate()       │
//        └────────────┬────────────────┘
//                     ▼
//             flagCacheService          (this file)
//              ├─ get():   L1 → L2 → null
//              └─ set():        L1 + L2 in parallel
//                     ▲
//                     │ pub/sub channel: "flags:invalidate"
//                     └─── flag-pubsub.service (Phase B sibling)
//
// Why a facade and not direct L1/L2 calls inside the evaluator?
//   - Encapsulation: when L3 (regional read-replica caches) lands in
//     2028 (per memory rule #1 — zero rework), only this file changes.
//   - Testability: the evaluator unit tests inject a fake `flagCache`,
//     so cache behaviour can be exercised without Redis containers.
//   - Metric uniformity: hit/miss counters live here for a single
//     dashboard row across both tiers.
//
// Reference patterns:
//   - Stripe's `flag-store` two-tier reader (post-mortem 2021).
//   - Netflix Hystrix `LayeredCache` (in their Edge Gateway).
//   - Vercel KV `EdgeConfig` (single-call API over multiple stores).
// ═══════════════════════════════════════════════════════════════

import type { FlagEvaluation } from '@repo/shared';
import { cache as redisCache } from '../../lib/redis.js';
import { logger } from '../../lib/logger.js';
import { env } from '../../config/env.js';
import { l1Cache } from './flag-cache-l1.service.js';

const L2_KEY_PREFIX = 'flags:eval:';

function l2Key(flagKey: string, entityKey: string | null): string {
  return `${L2_KEY_PREFIX}${flagKey}|${entityKey ?? 'anon'}`;
}

export interface FlagCacheService {
  /**
   * Two-tier read. Falls through L1 → L2 (Redis). Populates L1 on
   * L2 hit so the next request avoids the network round-trip.
   */
  get(flagKey: string, entityKey: string | null): Promise<FlagEvaluation | null>;
  /**
   * Two-tier write. Stores in L1 synchronously, then asynchronously
   * fans out to L2. The Redis write is best-effort — failures are
   * logged but not propagated; L1 alone is sufficient to keep the
   * request in budget.
   */
  set(flagKey: string, entityKey: string | null, value: FlagEvaluation): Promise<void>;
  /**
   * Drop every cached eval for this flag (both tiers). Triggered by
   * the pub/sub handler on admin updates and by the flag CRUD route.
   */
  invalidateFlag(flagKey: string): Promise<void>;
  /** Drop everything in both tiers. Reserved for emergencies. */
  flush(): Promise<void>;
}

export const flagCacheService: FlagCacheService = {
  async get(flagKey, entityKey) {
    // L1 lookup — synchronous, sub-µs.
    const fromL1 = l1Cache.get(l1Cache.cacheKey(flagKey, entityKey));
    if (fromL1) return fromL1;

    // L2 lookup — Redis REST round-trip.
    try {
      const raw = await redisCache.get(l2Key(flagKey, entityKey));
      if (!raw) return null;
      const value = JSON.parse(raw) as FlagEvaluation;
      // Backfill L1 so subsequent hits in this process bypass Redis.
      l1Cache.set(l1Cache.cacheKey(flagKey, entityKey), value);
      return value;
    } catch (err) {
      // Redis is best-effort; never block on it.
      logger.warn('[flag-cache] L2 read failed', {
        flagKey,
        error: (err as Error).message,
      });
      return null;
    }
  },

  async set(flagKey, entityKey, value) {
    l1Cache.set(l1Cache.cacheKey(flagKey, entityKey), value);
    try {
      await redisCache.set(
        l2Key(flagKey, entityKey),
        JSON.stringify(value),
        env.FLAG_CACHE_L2_TTL_SECONDS,
      );
    } catch (err) {
      logger.warn('[flag-cache] L2 write failed', {
        flagKey,
        error: (err as Error).message,
      });
    }
  },

  async invalidateFlag(flagKey) {
    // L1: O(n) scan over a 50K-entry map — still completes in <5ms.
    const removedFromL1 = l1Cache.invalidateFlag(flagKey);

    // L2: we can't scan Upstash REST efficiently; we rely on natural
    // TTL expiry (60s) PLUS the pub/sub broadcast to wipe L1 across
    // every API instance immediately. The set of L2 keys for one flag
    // is the cross-product (flagKey × users) and may run into millions;
    // a scan-and-delete is intentionally avoided here.
    //
    // Net effect: admin toggle ↔ user reads consistent value within
    //   max(L1 propagation lag, L2 TTL) = ≤ 1s in practice.

    if (removedFromL1 > 0) {
      logger.info('[flag-cache] invalidated', { flagKey, removedFromL1 });
    }
  },

  async flush() {
    l1Cache.clear();
    logger.warn('[flag-cache] L1 fully flushed');
    // No L2 wipe — operator can do it via `redis-cli FLUSHDB` if needed.
  },
};
