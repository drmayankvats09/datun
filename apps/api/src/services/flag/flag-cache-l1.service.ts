// apps/api/src/services/flag/flag-cache-l1.service.ts
// ═══════════════════════════════════════════════════════════════
// L1 FLAG CACHE — In-memory LRU (per-process) (Task #49)
// ─────────────────────────────────────────────────────────────────
// The hottest cache layer in the evaluator's chain:
//   L1 (this file, in-process Map)  →  L2 (Redis)  →  L3 (Postgres)
//
// Why an LRU and not a plain Map:
//   A naive Map would grow unbounded — under heavy traffic (10K req/s)
//   we'd accumulate millions of (flagKey, userId) tuples and OOM the
//   container within hours. An LRU caps memory at `maxEntries` and
//   evicts the oldest entries first, which matches the access pattern
//   (most flags are read once at request boot and re-read soon after).
//
// Implementation:
//   - Map's iteration is insertion-ordered → re-inserting a key moves
//     it to the tail, enabling O(1) "touch on access".
//   - TTL is per-entry, set at write time. We DO NOT use a timer per
//     entry (that's a memory leak vector for short-lived keys); we
//     check expiry on `get()` and lazily evict.
//
// Memory rule #1 (zero rework): the size + TTL knobs come from env
// vars so production can tune without a deploy.
//
// Reference patterns:
//   - lru-cache npm package (Isaac Schlueter) — same Map-based trick.
//   - Stripe internal "memo cache" used by their flag evaluator.
//   - PostgreSQL relcache (per-backend in-memory cache layer).
// ═══════════════════════════════════════════════════════════════

import { env } from '../../config/env.js';
import type { FlagEvaluation } from '@repo/shared';

interface CacheEntry {
  readonly value: FlagEvaluation;
  readonly expiresAt: number; // epoch ms
}

/**
 * Bounded LRU. Capacity selected with headroom for ~10K active flags
 * × ~1K active users per API container = 10M is too much; we ship
 * with 50K entries (~3 MB at ~60 B/entry). Tune via `maxEntries`.
 */
export class FlagL1Cache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly maxEntries: number;
  private readonly defaultTtlMs: number;

  // Lightweight metrics for /metrics + tests.
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(opts?: { maxEntries?: number; ttlMs?: number }) {
    this.maxEntries = opts?.maxEntries ?? 50_000;
    this.defaultTtlMs = opts?.ttlMs ?? env.FLAG_CACHE_L1_TTL_SECONDS * 1000;
  }

  /**
   * Cache key format: `<flagKey>|<entityIdOrAnon>`.
   * Anonymous evaluations share a single bucket; consumers that need
   * per-IP slicing should override `cacheKey()` upstream.
   */
  cacheKey(flagKey: string, entityKey: string | null): string {
    return `${flagKey}|${entityKey ?? 'anon'}`;
  }

  /**
   * Fetch a cached evaluation. Returns `null` on miss or expiry.
   * Side effects: increments hits/misses, re-inserts on hit to make
   * the entry "freshly used" (LRU touch).
   */
  get(key: string): FlagEvaluation | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      // Lazy eviction on access — cheaper than a sweeper interval.
      this.store.delete(key);
      this.misses++;
      return null;
    }
    // LRU touch: move to tail by re-inserting.
    this.store.delete(key);
    this.store.set(key, entry);
    this.hits++;
    return entry.value;
  }

  /**
   * Insert / overwrite a cache entry. If capacity is hit, drops the
   * least-recently-used entry (the first one in iteration order).
   */
  set(key: string, value: FlagEvaluation, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    const entry: CacheEntry = { value, expiresAt: Date.now() + ttl };

    // If the key already exists, delete first so re-insertion moves
    // it to the tail (consistent ordering for the LRU eviction below).
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      // Evict the oldest (first iterator entry).
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
        this.evictions++;
      }
    }

    this.store.set(key, entry);
  }

  /**
   * Evict every entry whose key starts with the given flag prefix.
   * Used by the pub/sub invalidation handler when an admin updates
   * a flag — every cached eval of that flag becomes stale.
   */
  invalidateFlag(flagKey: string): number {
    const prefix = `${flagKey}|`;
    let removed = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /** Drop everything. Used by `__resetForTests` and admin "flush all". */
  clear(): void {
    this.store.clear();
  }

  /** Diagnostic metrics. Exposed by the /metrics route in Phase B. */
  metrics(): {
    size: number;
    maxEntries: number;
    hits: number;
    misses: number;
    evictions: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      maxEntries: this.maxEntries,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }

  /** Internal — test seam. */
  __debugDump(): ReadonlyMap<string, CacheEntry> {
    return this.store;
  }
}

/**
 * Module-level singleton. Hot path imports this directly; sharing one
 * instance across all callers ensures consistent hit rates.
 */
export const l1Cache = new FlagL1Cache();
