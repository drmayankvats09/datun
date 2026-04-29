import { describe, it, expect, beforeEach } from 'vitest';
import { HealthManager } from '../../services/ai/health-manager.js';
import type { AIClientConfig } from '../../services/ai/types.js';

const testConfig: AIClientConfig = {
  circuitBreakerThreshold: 3,
  circuitBreakerWindowMs: 10_000,
  circuitBreakerCooldownMs: 5_000,
};

describe('HealthManager (Circuit Breaker)', () => {
  let manager: HealthManager;

  beforeEach(() => {
    manager = new HealthManager(testConfig);
  });

  it('starts healthy — all providers available', () => {
    expect(manager.isAvailable('claude')).toBe(true);
    expect(manager.isAvailable('openai')).toBe(true);
    expect(manager.isAvailable('gemini')).toBe(true);
  });

  it('stays healthy below failure threshold', () => {
    manager.recordFailure('claude');
    manager.recordFailure('claude');
    // 2 failures < 3 threshold
    expect(manager.isAvailable('claude')).toBe(true);
  });

  it('trips circuit breaker at threshold', () => {
    for (let i = 0; i < 3; i++) {
      manager.recordFailure('claude');
    }
    expect(manager.isAvailable('claude')).toBe(false);
  });

  it('recovers after cooldown expires', async () => {
    // Use short cooldown for test
    const shortConfig: AIClientConfig = {
      circuitBreakerThreshold: 2,
      circuitBreakerWindowMs: 10_000,
      circuitBreakerCooldownMs: 50, // 50ms
    };
    const mgr = new HealthManager(shortConfig);

    mgr.recordFailure('claude');
    mgr.recordFailure('claude');
    expect(mgr.isAvailable('claude')).toBe(false);

    // Wait for cooldown
    await new Promise((r) => setTimeout(r, 60));
    // Should allow canary (degraded mode)
    expect(mgr.isAvailable('claude')).toBe(true);
  });

  it('recordSuccess resets consecutive failures', () => {
    manager.recordFailure('claude');
    manager.recordFailure('claude');
    manager.recordSuccess('claude');

    const health = manager.getHealth('claude');
    expect(health.consecutiveFailures).toBe(0);
    expect(health.status).toBe('healthy');
  });

  it('tracks total requests and failures', () => {
    manager.recordSuccess('claude');
    manager.recordSuccess('claude');
    manager.recordFailure('claude');

    const health = manager.getHealth('claude');
    expect(health.totalRequests).toBe(3);
    expect(health.totalFailures).toBe(1);
  });

  it('independent health per provider', () => {
    for (let i = 0; i < 3; i++) {
      manager.recordFailure('claude');
    }
    expect(manager.isAvailable('claude')).toBe(false);
    expect(manager.isAvailable('openai')).toBe(true);
    expect(manager.isAvailable('gemini')).toBe(true);
  });

  it('getAllHealth returns snapshot of all tracked providers', () => {
    manager.recordSuccess('claude');
    manager.recordSuccess('openai');

    const all = manager.getAllHealth();
    expect(all['claude']?.currentStatus).toBe('healthy');
    expect(all['openai']?.currentStatus).toBe('healthy');
  });
});
