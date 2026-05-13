// apps/api/src/__tests__/services/csp-report-dedup.test.ts
// ═══════════════════════════════════════════════════════════════
// CSP DEDUP CACHE — Unit tests
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { isDuplicate, __resetDedupCache, __getDedupSize } from '../../services/csp-report-dedup.js';

beforeEach(() => __resetDedupCache());
afterEach(() => vi.useRealTimers());

describe('isDuplicate', () => {
  it('returns false for first occurrence, true for second', () => {
    expect(isDuplicate('key-a')).toBe(false);
    expect(isDuplicate('key-a')).toBe(true);
  });

  it('different keys treated independently', () => {
    expect(isDuplicate('key-a')).toBe(false);
    expect(isDuplicate('key-b')).toBe(false);
    expect(isDuplicate('key-a')).toBe(true);
    expect(isDuplicate('key-b')).toBe(true);
  });

  it('expires after 1-hour TTL', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    expect(isDuplicate('key-a')).toBe(false);
    expect(isDuplicate('key-a')).toBe(true);

    // Advance 61 minutes.
    vi.setSystemTime(new Date('2026-01-01T01:01:00Z'));

    expect(isDuplicate('key-a')).toBe(false); // expired, fresh again
  });

  it('LRU evicts oldest after 1000 entries', () => {
    for (let i = 0; i < 1001; i++) {
      isDuplicate(`key-${i}`);
    }
    expect(__getDedupSize()).toBe(1000);

    // key-0 should have been evicted (oldest).
    expect(isDuplicate('key-0')).toBe(false);
  });

  it('re-querying an existing key bumps it to most recent', () => {
    // Fill cache halfway, then re-query the very first entry.
    for (let i = 0; i < 500; i++) {
      isDuplicate(`key-${i}`);
    }
    // Re-query key-0 — bumps it to most recent.
    isDuplicate('key-0');

    // Fill up to capacity + 1; the next inserted entry should evict key-1
    // (now the oldest), NOT key-0 (which we just bumped).
    for (let i = 500; i < 1000; i++) {
      isDuplicate(`key-${i}`);
    }
    isDuplicate('key-extra'); // triggers eviction

    expect(__getDedupSize()).toBe(1000);
    expect(isDuplicate('key-0')).toBe(true); // still present (bumped)
  });
});
