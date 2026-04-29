// ═══════════════════════════════════════════════════════════════
// 24-HOUR WINDOW TRACKER TESTS
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../lib/redis.js', () => {
  const store = new Map<string, { value: string; expiresAt: number }>();
  return {
    cache: {
      async get(key: string) {
        const entry = store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
          store.delete(key);
          return null;
        }
        return entry.value;
      },
      async set(key: string, value: string, ttlSeconds: number) {
        store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
      },
      async del(key: string) {
        store.delete(key);
      },
    },
    __reset() {
      store.clear();
    },
  };
});

import {
  markInbound,
  isWindowOpen,
  getRemainingWindowMs,
  closeWindow,
} from '../../services/whatsapp/window-tracker.js';

describe('Window Tracker', () => {
  beforeEach(async () => {
    const mod = (await import('../../lib/redis.js')) as unknown as { __reset: () => void };
    mod.__reset();
  });

  it('window closed by default for unknown phone', async () => {
    expect(await isWindowOpen('919999999999')).toBe(false);
  });

  it('markInbound opens window', async () => {
    await markInbound('919999999999');
    expect(await isWindowOpen('919999999999')).toBe(true);
  });

  it('windows are isolated per phone', async () => {
    await markInbound('919999999999');
    expect(await isWindowOpen('918888888888')).toBe(false);
  });

  it('getRemainingWindowMs returns positive when open', async () => {
    await markInbound('919999999999');
    const remaining = await getRemainingWindowMs('919999999999');
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it('getRemainingWindowMs returns 0 when closed', async () => {
    expect(await getRemainingWindowMs('919999999999')).toBe(0);
  });

  it('closeWindow forcibly closes window', async () => {
    await markInbound('919999999999');
    expect(await isWindowOpen('919999999999')).toBe(true);
    await closeWindow('919999999999');
    expect(await isWindowOpen('919999999999')).toBe(false);
  });

  it('window stays open after multiple inbounds', async () => {
    await markInbound('919999999999');
    await markInbound('919999999999');
    await markInbound('919999999999');
    expect(await isWindowOpen('919999999999')).toBe(true);
  });
});
