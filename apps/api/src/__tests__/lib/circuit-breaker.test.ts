// ═══════════════════════════════════════════════════════════════
// CIRCUIT BREAKER TESTS — Generic resilience pattern
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CircuitBreaker } from '../../lib/circuit-breaker.js';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker<string>;

  beforeEach(() => {
    breaker = new CircuitBreaker<string>({
      threshold: 3,
      windowMs: 60_000,
      cooldownMs: 300_000,
    });
  });

  describe('Initial state', () => {
    it('new provider starts as healthy', () => {
      expect(breaker.isAvailable('meta')).toBe(true);
      expect(breaker.getHealth('meta').status).toBe('healthy');
    });

    it('zero counters on init', () => {
      const h = breaker.getHealth('meta');
      expect(h.consecutiveFailures).toBe(0);
      expect(h.totalRequests).toBe(0);
      expect(h.totalFailures).toBe(0);
    });
  });

  describe('Success recording', () => {
    it('increments totalRequests', () => {
      breaker.recordSuccess('meta');
      expect(breaker.getHealth('meta').totalRequests).toBe(1);
    });

    it('resets consecutiveFailures', () => {
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      breaker.recordSuccess('meta');
      expect(breaker.getHealth('meta').consecutiveFailures).toBe(0);
    });

    it('updates lastSuccessAt', () => {
      const before = Date.now();
      breaker.recordSuccess('meta');
      const after = Date.now();
      const ts = breaker.getHealth('meta').lastSuccessAt!;
      expect(ts).toBeGreaterThanOrEqual(before);
      expect(ts).toBeLessThanOrEqual(after);
    });
  });

  describe('Failure recording', () => {
    it('increments totalFailures', () => {
      breaker.recordFailure('meta');
      expect(breaker.getHealth('meta').totalFailures).toBe(1);
    });

    it('does NOT trip on first 2 failures', () => {
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      expect(breaker.isAvailable('meta')).toBe(true);
      expect(breaker.getHealth('meta').status).toBe('healthy');
    });

    it('TRIPS on 3rd consecutive failure (threshold)', () => {
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      expect(breaker.isAvailable('meta')).toBe(false);
      expect(breaker.getHealth('meta').status).toBe('unhealthy');
    });

    it('sets unhealthyUntil cooldown timestamp', () => {
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      const until = breaker.getHealth('meta').unhealthyUntil!;
      expect(until).toBeGreaterThan(Date.now() + 290_000);
      expect(until).toBeLessThan(Date.now() + 310_000);
    });
  });

  describe('Cooldown + canary recovery', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('isAvailable false during cooldown', () => {
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      expect(breaker.isAvailable('meta')).toBe(false);
    });

    it('allows canary after cooldown expires', () => {
      vi.useFakeTimers();
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      vi.advanceTimersByTime(301_000); // past 5 min cooldown
      expect(breaker.isAvailable('meta')).toBe(true);
      expect(breaker.getHealth('meta').status).toBe('degraded');
    });

    it('canary success → fully healthy', () => {
      vi.useFakeTimers();
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      vi.advanceTimersByTime(301_000);
      breaker.isAvailable('meta'); // triggers degraded
      breaker.recordSuccess('meta');
      expect(breaker.getHealth('meta').status).toBe('healthy');
      expect(breaker.getHealth('meta').unhealthyUntil).toBeNull();
    });

    it('canary failure → unhealthy with reset cooldown', () => {
      vi.useFakeTimers();
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      vi.advanceTimersByTime(301_000);
      breaker.isAvailable('meta'); // degraded
      breaker.recordFailure('meta');
      expect(breaker.getHealth('meta').status).toBe('unhealthy');
      const until = breaker.getHealth('meta').unhealthyUntil!;
      expect(until).toBeGreaterThan(Date.now() + 290_000);
    });
  });

  describe('Multi-provider isolation', () => {
    it('one provider failure does not affect another', () => {
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      expect(breaker.isAvailable('meta')).toBe(false);
      expect(breaker.isAvailable('gupshup')).toBe(true);
    });

    it('getAllHealth returns all providers', () => {
      breaker.recordSuccess('meta');
      breaker.recordSuccess('gupshup');
      const all = breaker.getAllHealth();
      expect(Object.keys(all).sort()).toEqual(['gupshup', 'meta']);
    });
  });

  describe('Reset utility', () => {
    it('clears all state', () => {
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      breaker.recordFailure('meta');
      breaker.reset();
      expect(breaker.isAvailable('meta')).toBe(true);
      expect(breaker.getHealth('meta').consecutiveFailures).toBe(0);
    });
  });
});
