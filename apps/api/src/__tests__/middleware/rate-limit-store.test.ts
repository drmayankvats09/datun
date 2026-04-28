// ═══════════════════════════════════════════════════════════════
// RATE LIMIT STORE TESTS — Redis-backed distributed counters
// Verifies increment, reset, and init behavior.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { createRedisStore } from '../../middleware/rate-limit-store.js';

describe('Redis Rate Limit Store', () => {
  const store = createRedisStore('rl:test');

  beforeEach(() => {
    // Init with standard window (60 seconds)
    store.init?.({ windowMs: 60_000 } as Parameters<NonNullable<typeof store.init>>[0]);
  });

  it('first increment returns totalHits = 1', async () => {
    const result = await store.increment('ip-1.2.3.4');
    expect(result.totalHits).toBe(1);
    expect(result.resetTime).toBeInstanceOf(Date);
    expect(result.resetTime!.getTime()).toBeGreaterThan(Date.now());
  });

  it('consecutive increments increase totalHits', async () => {
    await store.increment('ip-5.6.7.8');
    await store.increment('ip-5.6.7.8');
    const result = await store.increment('ip-5.6.7.8');
    expect(result.totalHits).toBe(3);
  });

  it('different keys have independent counters', async () => {
    await store.increment('ip-A');
    await store.increment('ip-A');
    const resultA = await store.increment('ip-A');

    const resultB = await store.increment('ip-B');

    expect(resultA.totalHits).toBe(3);
    expect(resultB.totalHits).toBe(1);
  });

  it('resetKey clears counter for specific IP', async () => {
    await store.increment('ip-reset-test');
    await store.increment('ip-reset-test');

    await store.resetKey('ip-reset-test');

    // After reset, next increment should start fresh
    const result = await store.increment('ip-reset-test');
    expect(result.totalHits).toBe(1);
  });

  it('resetAll does not throw', async () => {
    await expect(store.resetAll?.()).resolves.not.toThrow();
  });

  it('decrement does not throw (no-op)', async () => {
    await expect(store.decrement('any-key')).resolves.not.toThrow();
  });
});
