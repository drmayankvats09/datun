// apps/web/__tests__/lib/errors/recovery.test.ts
// ═══════════════════════════════════════════════════════════════
// RECOVERY TESTS — Task #52 Phase 1
//
// Coverage:
//   - Strategy mapping for every ErrorCategory
//   - Exponential backoff math (no jitter, deterministic)
//   - Jitter behaviour (RNG injection, bounds)
//   - Edge cases (attempt=0, large attempts, invalid inputs)
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { getRecoveryStrategy, computeBackoffMs, type ErrorCategory } from '@/lib/errors';

describe('getRecoveryStrategy()', () => {
  it('maps network → retry (3 attempts, home fallback)', () => {
    const s = getRecoveryStrategy('network');
    expect(s.action).toBe('retry');
    expect(s.maxRetries).toBe(3);
    expect(s.offerHomeAsFallback).toBe(true);
    expect(s.intentKey).toBe('recoveryNetwork');
  });

  it('maps auth → reauthenticate (no retry, no home)', () => {
    const s = getRecoveryStrategy('auth');
    expect(s.action).toBe('reauthenticate');
    expect(s.maxRetries).toBeUndefined();
    expect(s.offerHomeAsFallback).toBe(false);
  });

  it('maps validation → contact-support (home fallback)', () => {
    const s = getRecoveryStrategy('validation');
    expect(s.action).toBe('contact-support');
    expect(s.offerHomeAsFallback).toBe(true);
  });

  it('maps rate-limit → wait-and-retry with 30s wait', () => {
    const s = getRecoveryStrategy('rate-limit');
    expect(s.action).toBe('wait-and-retry');
    expect(s.waitSeconds).toBe(30);
    expect(s.maxRetries).toBe(2);
  });

  it('maps not-found → navigate-home', () => {
    const s = getRecoveryStrategy('not-found');
    expect(s.action).toBe('navigate-home');
    expect(s.offerHomeAsFallback).toBe(false);
  });

  it('maps server → retry (3 attempts)', () => {
    const s = getRecoveryStrategy('server');
    expect(s.action).toBe('retry');
    expect(s.maxRetries).toBe(3);
  });

  it('maps ai-service → retry (2 attempts only)', () => {
    const s = getRecoveryStrategy('ai-service');
    expect(s.action).toBe('retry');
    expect(s.maxRetries).toBe(2);
  });

  it('maps consultation-state → navigate-home', () => {
    const s = getRecoveryStrategy('consultation-state');
    expect(s.action).toBe('navigate-home');
  });

  it('maps chunk-load → reload (the only fix)', () => {
    const s = getRecoveryStrategy('chunk-load');
    expect(s.action).toBe('reload');
    expect(s.maxRetries).toBeUndefined();
  });

  it('maps unknown → retry (3 attempts, conservative)', () => {
    const s = getRecoveryStrategy('unknown');
    expect(s.action).toBe('retry');
    expect(s.maxRetries).toBe(3);
  });

  it('every category produces a defined strategy', () => {
    const categories: ReadonlyArray<ErrorCategory> = [
      'network',
      'auth',
      'validation',
      'rate-limit',
      'not-found',
      'server',
      'ai-service',
      'consultation-state',
      'chunk-load',
      'unknown',
    ];
    for (const c of categories) {
      const s = getRecoveryStrategy(c);
      expect(s).toBeDefined();
      expect(typeof s.action).toBe('string');
      expect(typeof s.intentKey).toBe('string');
      expect(typeof s.offerHomeAsFallback).toBe('boolean');
    }
  });

  it('every intentKey is unique (no duplicate copy keys)', () => {
    const categories: ReadonlyArray<ErrorCategory> = [
      'network',
      'auth',
      'validation',
      'rate-limit',
      'not-found',
      'server',
      'ai-service',
      'consultation-state',
      'chunk-load',
      'unknown',
    ];
    const keys = categories.map((c) => getRecoveryStrategy(c).intentKey);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('computeBackoffMs() — no jitter (deterministic)', () => {
  const opts = { jitter: false };

  it('attempt 0 → baseDelay', () => {
    expect(computeBackoffMs(0, opts)).toBe(500);
  });

  it('attempt 1 → 2× baseDelay', () => {
    expect(computeBackoffMs(1, opts)).toBe(1_000);
  });

  it('attempt 2 → 4× baseDelay', () => {
    expect(computeBackoffMs(2, opts)).toBe(2_000);
  });

  it('attempt 3 → 8× baseDelay', () => {
    expect(computeBackoffMs(3, opts)).toBe(4_000);
  });

  it('caps at maxDelayMs', () => {
    // 2^10 × 500 = 512_000, which exceeds default 30s cap.
    expect(computeBackoffMs(10, opts)).toBe(30_000);
  });

  it('honours custom baseDelay', () => {
    expect(computeBackoffMs(0, { ...opts, baseDelayMs: 250 })).toBe(250);
    expect(computeBackoffMs(2, { ...opts, baseDelayMs: 250 })).toBe(1_000);
  });

  it('honours custom maxDelayMs', () => {
    expect(computeBackoffMs(20, { ...opts, maxDelayMs: 5_000 })).toBe(5_000);
  });

  it('handles very large attempt counts without overflow (cap at exponent 20)', () => {
    // Internal cap on the exponent prevents 2^99 floating-point chaos.
    expect(computeBackoffMs(100, opts)).toBe(30_000);
  });
});

describe('computeBackoffMs() — with jitter', () => {
  it('full jitter stays within [0, capped] bounds', () => {
    // Inject deterministic RNG.
    const samples = [0, 0.25, 0.5, 0.75, 0.9999];
    for (const r of samples) {
      const delay = computeBackoffMs(2, { random: () => r });
      // attempt=2 → exponential = 2000ms, jitter result = floor(r*2000)
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThanOrEqual(2_000);
      expect(delay).toBe(Math.floor(r * 2_000));
    }
  });

  it('uses Math.random by default (smoke test, not deterministic)', () => {
    const delay = computeBackoffMs(1);
    expect(delay).toBeGreaterThanOrEqual(0);
    expect(delay).toBeLessThanOrEqual(1_000);
  });

  it('jitter=false bypasses the RNG entirely', () => {
    let rngCalls = 0;
    computeBackoffMs(2, {
      jitter: false,
      random: () => {
        rngCalls += 1;
        return 0.5;
      },
    });
    expect(rngCalls).toBe(0);
  });
});

describe('computeBackoffMs() — input validation', () => {
  it('throws on negative attempt', () => {
    expect(() => computeBackoffMs(-1)).toThrow(TypeError);
  });

  it('throws on NaN attempt', () => {
    expect(() => computeBackoffMs(Number.NaN)).toThrow(TypeError);
  });

  it('throws on Infinity attempt', () => {
    expect(() => computeBackoffMs(Number.POSITIVE_INFINITY)).toThrow(TypeError);
  });
});
