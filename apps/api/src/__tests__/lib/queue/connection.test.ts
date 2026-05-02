// ═══════════════════════════════════════════════════════════════
// QUEUE CONNECTION TESTS — Health check + lifecycle
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../config/env.js', () => ({
  env: {
    QUEUE_REDIS_URL: 'redis://localhost:6379',
    NODE_ENV: 'test',
  },
}));

vi.mock('ioredis', () => {
  const mockRedis = {
    on: vi.fn(),
    ping: vi.fn().mockResolvedValue('PONG'),
    quit: vi.fn().mockResolvedValue('OK'),
    disconnect: vi.fn(),
  };
  function Redis() {
    return mockRedis;
  }
  return { Redis, default: Redis };
});

import { pingQueueRedis, closeProducerConnection } from '../../../lib/queue/connection.js';

describe('Queue Redis connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('pingQueueRedis', () => {
    it('returns ok=true with latency on healthy Redis', async () => {
      const result = await pingQueueRedis();
      expect(result.ok).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('closeProducerConnection', () => {
    it('is idempotent — multiple closes do not throw', async () => {
      await expect(closeProducerConnection()).resolves.not.toThrow();
      await expect(closeProducerConnection()).resolves.not.toThrow();
    });
  });
});
