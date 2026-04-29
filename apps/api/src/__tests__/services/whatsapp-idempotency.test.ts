// ═══════════════════════════════════════════════════════════════
// IDEMPOTENCY TESTS — Webhook duplicate detection
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../lib/redis.js', () => {
  const store = new Map<string, { value: string; expiresAt: number }>();
  return {
    cache: {
      async setNX(key: string, value: string, ttlSeconds: number) {
        if (store.has(key)) {
          const entry = store.get(key)!;
          if (Date.now() <= entry.expiresAt) return false;
        }
        store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
        return true;
      },
    },
    __reset() {
      store.clear();
    },
  };
});

import { claimWebhook } from '../../services/whatsapp/idempotency.js';

describe('Idempotency', () => {
  beforeEach(async () => {
    const mod = (await import('../../lib/redis.js')) as unknown as { __reset: () => void };
    mod.__reset();
  });

  it('first claim succeeds', async () => {
    expect(await claimWebhook('wamid-001')).toBe(true);
  });

  it('duplicate claim fails', async () => {
    await claimWebhook('wamid-001');
    expect(await claimWebhook('wamid-001')).toBe(false);
  });

  it('different IDs are independent', async () => {
    await claimWebhook('wamid-001');
    expect(await claimWebhook('wamid-002')).toBe(true);
  });

  it('empty messageId always processes', async () => {
    expect(await claimWebhook('')).toBe(true);
    expect(await claimWebhook('')).toBe(true); // still true — no dedup possible
  });

  it('"unknown" messageId always processes', async () => {
    expect(await claimWebhook('unknown')).toBe(true);
    expect(await claimWebhook('unknown')).toBe(true);
  });

  it('100 unique IDs all claim successfully', async () => {
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) => claimWebhook(`wamid-${i}`)),
    );
    expect(results.every((r) => r)).toBe(true);
  });
});
