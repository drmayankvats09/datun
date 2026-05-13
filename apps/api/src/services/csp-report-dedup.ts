// apps/api/src/services/csp-report-dedup.ts
// ═══════════════════════════════════════════════════════════════
// CSP REPORT DEDUP — In-memory LRU cache with 1-hour TTL
//
// WHY IN-MEMORY (not Redis):
//   - Dedup is a HOT path (every report checks).
//   - Cross-instance dedup is NOT required — CSP violations are reported by
//     many users; some duplication across instances is acceptable. We
//     prioritize speed over perfect cross-instance dedup.
//   - Memory footprint is bounded (max 1000 entries).
//
// EVICTION:
//   - LRU: on `isDuplicate(key)`, the key moves to the "most recent" position.
//   - When size exceeds MAX_ENTRIES, oldest entry is evicted.
//
// TTL:
//   - Each entry stores its insertion timestamp.
//   - On lookup, if entry is older than TTL_MS, treat as fresh (re-insert).
//   - This means dedup window is "rolling 1 hour from last occurrence".
//
// THREAD SAFETY:
//   Node.js is single-threaded — no locks needed. Multiple async handlers
//   share the same Map; reads/writes are atomic per JS tick.
//
// PATTERN:
//   - lru-cache library does this, but we keep it dependency-free (CSP code
//     should have minimal external surface).
//   - Stripe's idempotency cache, Cloudflare's request dedup layer.
// ═══════════════════════════════════════════════════════════════

/** Maximum number of dedup entries to keep in memory. */
const MAX_ENTRIES = 1000;

/** Time-to-live for each entry (1 hour). */
const TTL_MS = 60 * 60 * 1000;

/** Map preserves insertion order — used for LRU semantics. */
const cache = new Map<string, number>();

/**
 * Check if a key was seen within TTL. Records the key as seen.
 *
 * @param key - Deduplication key (typically `ipHash|blockedUri|directive`).
 * @returns `true` if the key was seen within TTL (duplicate); `false` if fresh.
 */
export function isDuplicate(key: string): boolean {
  const now = Date.now();
  const lastSeen = cache.get(key);

  if (lastSeen !== undefined && now - lastSeen < TTL_MS) {
    // Duplicate — bump it to "most recent" position (re-insert).
    cache.delete(key);
    cache.set(key, now);
    return true;
  }

  // Fresh — insert as new entry.
  // Delete first (if existed) to ensure it goes to the END (most recent).
  cache.delete(key);
  cache.set(key, now);

  // Evict oldest if over capacity.
  if (cache.size > MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }

  return false;
}

/** Reset the cache — exported for tests. */
export function __resetDedupCache(): void {
  cache.clear();
}

/** Current cache size — exported for tests. */
export function __getDedupSize(): number {
  return cache.size;
}
