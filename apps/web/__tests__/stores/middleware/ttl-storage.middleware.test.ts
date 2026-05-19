// ═══════════════════════════════════════════════════════════════
// TTL STORAGE TESTS — Time-to-live wrapper for StateStorage
//
// Verifies:
//   - setItem writes data + metadata sibling key
//   - getItem returns null for expired entries (and purges them)
//   - getItem returns value for non-expired entries
//   - Missing metadata = treated as non-expiring (legacy entry)
//   - removeItem cleans up both keys
//   - Async base storage backends work
//   - Clock override (`now`) enables deterministic time tests
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import type { StateStorage } from 'zustand/middleware';
import { createTTLStorage } from '../../../stores/middleware/ttl-storage.middleware';

// ─── In-memory test storage (sync) ───────────────────────────

function createMemoryStorage(): StateStorage & { dump: () => Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (name) => map.get(name) ?? null,
    setItem: (name, value) => {
      map.set(name, value);
    },
    removeItem: (name) => {
      map.delete(name);
    },
    dump: () => Object.fromEntries(map.entries()),
  };
}

// ─── In-memory async storage (Promise-returning) ─────────────

function createAsyncMemoryStorage(): StateStorage {
  const map = new Map<string, string>();
  return {
    getItem: async (name) => map.get(name) ?? null,
    setItem: async (name, value) => {
      map.set(name, value);
    },
    removeItem: async (name) => {
      map.delete(name);
    },
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe('createTTLStorage — sync base storage', () => {
  let base: ReturnType<typeof createMemoryStorage>;
  let now: number;

  beforeEach(() => {
    base = createMemoryStorage();
    now = 1_700_000_000_000;
  });

  it('setItem writes value + expiry metadata sibling key', async () => {
    const ttl = createTTLStorage(base, {
      ttlMs: 10_000,
      now: () => now,
    });
    await ttl.setItem('key1', 'value1');
    expect(base.dump()['key1']).toBe('value1');
    expect(base.dump()['key1::__expires_at']).toBe(String(now + 10_000));
  });

  it('getItem returns value when not expired', async () => {
    const ttl = createTTLStorage(base, { ttlMs: 10_000, now: () => now });
    await ttl.setItem('k', 'v');
    // Advance time but stay within TTL
    now += 5_000;
    expect(await ttl.getItem('k')).toBe('v');
  });

  it('getItem returns null and purges both keys when expired', async () => {
    const ttl = createTTLStorage(base, { ttlMs: 10_000, now: () => now });
    await ttl.setItem('k', 'v');
    // Advance past TTL
    now += 10_001;
    expect(await ttl.getItem('k')).toBeNull();
    expect(base.dump()['k']).toBeUndefined();
    expect(base.dump()['k::__expires_at']).toBeUndefined();
  });

  it('getItem treats missing metadata as non-expiring (legacy entry)', async () => {
    const ttl = createTTLStorage(base, { ttlMs: 10_000, now: () => now });
    // Simulate a pre-TTL entry: write directly to base, skipping metadata
    base.setItem('legacy', 'data');
    expect(await ttl.getItem('legacy')).toBe('data');
  });

  it('getItem returns null and purges on corrupted (non-numeric) metadata', async () => {
    const ttl = createTTLStorage(base, { ttlMs: 10_000, now: () => now });
    base.setItem('corrupt', 'value');
    base.setItem('corrupt::__expires_at', 'not-a-number');
    expect(await ttl.getItem('corrupt')).toBeNull();
    expect(base.dump()['corrupt']).toBeUndefined();
    expect(base.dump()['corrupt::__expires_at']).toBeUndefined();
  });

  it('getItem returns null for keys never written', async () => {
    const ttl = createTTLStorage(base, { ttlMs: 10_000, now: () => now });
    expect(await ttl.getItem('never-written')).toBeNull();
  });

  it('removeItem cleans up both data + metadata', async () => {
    const ttl = createTTLStorage(base, { ttlMs: 10_000, now: () => now });
    await ttl.setItem('k', 'v');
    await ttl.removeItem('k');
    expect(base.dump()['k']).toBeUndefined();
    expect(base.dump()['k::__expires_at']).toBeUndefined();
  });

  it('setItem overwriting refreshes the expiry timestamp', async () => {
    const ttl = createTTLStorage(base, { ttlMs: 10_000, now: () => now });
    await ttl.setItem('k', 'v1');
    const firstExpiry = base.dump()['k::__expires_at'];
    now += 5_000;
    await ttl.setItem('k', 'v2');
    const secondExpiry = base.dump()['k::__expires_at'];
    expect(Number(secondExpiry)).toBeGreaterThan(Number(firstExpiry));
  });
});

describe('createTTLStorage — async base storage', () => {
  it('works with Promise-returning getItem/setItem/removeItem', async () => {
    const base = createAsyncMemoryStorage();
    let now = 1_700_000_000_000;
    const ttl = createTTLStorage(base, { ttlMs: 1_000, now: () => now });

    await ttl.setItem('async-k', 'async-v');
    expect(await ttl.getItem('async-k')).toBe('async-v');

    now += 1_001;
    expect(await ttl.getItem('async-k')).toBeNull();
  });
});

describe('createTTLStorage — default clock', () => {
  it('uses Date.now when no clock override is provided', async () => {
    const base = createMemoryStorage();
    const ttl = createTTLStorage(base, { ttlMs: 60_000 });
    await ttl.setItem('k', 'v');
    // Should be non-expired immediately after write
    expect(await ttl.getItem('k')).toBe('v');
  });
});
