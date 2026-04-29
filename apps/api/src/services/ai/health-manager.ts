// ═══════════════════════════════════════════════════════════════
// HEALTH MANAGER — Circuit breaker for AI providers
// REFACTORED (Task #40): now wraps generic lib/circuit-breaker.
// Public API unchanged — all existing AI tests pass without edits.
// ═══════════════════════════════════════════════════════════════

import { CircuitBreaker } from '../../lib/circuit-breaker.js';
import type { ProviderName, ProviderHealth, AIClientConfig } from './types.js';

export class HealthManager {
  private readonly breaker: CircuitBreaker<ProviderName>;

  constructor(config: AIClientConfig) {
    this.breaker = new CircuitBreaker<ProviderName>(
      {
        threshold: config.circuitBreakerThreshold,
        windowMs: config.circuitBreakerWindowMs,
        cooldownMs: config.circuitBreakerCooldownMs,
      },
      '[HealthManager:AI]',
    );
  }

  /** Get or create health record for a provider */
  getHealth(provider: ProviderName): ProviderHealth {
    return this.toProviderHealth(this.breaker.getHealth(provider));
  }

  /** Check if provider is available for requests */
  isAvailable(provider: ProviderName): boolean {
    return this.breaker.isAvailable(provider);
  }

  /** Record successful request */
  recordSuccess(provider: ProviderName): void {
    this.breaker.recordSuccess(provider);
  }

  /** Record failed request */
  recordFailure(provider: ProviderName): void {
    this.breaker.recordFailure(provider);
  }

  /** Get all provider health states (preserves legacy field names for existing tests) */
  getAllHealth(): Record<string, ProviderHealth> {
    const states = this.breaker.getAllHealth();
    const result: Record<string, ProviderHealth> = {};
    for (const [name, s] of Object.entries(states)) {
      result[name] = this.toProviderHealth(s);
    }
    return result;
  }

  /** Reset state (test utility) */
  reset(): void {
    this.breaker.reset();
  }

  /** Map generic circuit-breaker state → legacy ProviderHealth shape */
  private toProviderHealth(s: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    consecutiveFailures: number;
    lastSuccessAt: number | null;
    lastFailureAt: number | null;
    unhealthyUntil: number | null;
    totalRequests: number;
    totalFailures: number;
  }): ProviderHealth {
    // Legacy shape used 'currentStatus' field — preserve for backward compat
    const legacyStatus = s.status === 'degraded' ? 'healthy' : s.status;
    return {
      status: legacyStatus,
      currentStatus: legacyStatus,
      consecutiveFailures: s.consecutiveFailures,
      lastSuccessAt: s.lastSuccessAt,
      lastFailureAt: s.lastFailureAt,
      unhealthyUntil: s.unhealthyUntil,
      totalRequests: s.totalRequests,
      totalFailures: s.totalFailures,
    } as ProviderHealth;
  }
}
