// ═══════════════════════════════════════════════════════════════
// GENERIC CIRCUIT BREAKER — Provider-agnostic resilience layer
//
// Pattern: Netflix Hystrix, AWS Circuit Breaker, Resilience4j.
// Used by: services/ai (Claude→GPT→Gemini),
//          services/email (Resend→SES),
//          services/whatsapp (Meta→Gupshup→AiSensy).
//
// State machine:
//   healthy → (3 failures within 60s window) → unhealthy
//   unhealthy → (cooldown expires) → degraded (canary mode)
//   degraded → (canary success) → healthy
//   degraded → (canary fail) → unhealthy (cooldown reset)
//
// Why in-memory (not Redis): Per Railway-container instance state
// is intentional. Each container independently detects provider
// health based on its own observations. Redis-backed global state
// is Task #29 upgrade path — interface designed to support both.
// ═══════════════════════════════════════════════════════════════

import { logger } from './logger.js';

export interface CircuitBreakerConfig {
  /** Failures before tripping the circuit (default: 3) */
  threshold: number;
  /** Sliding window for failure counting in ms (default: 60_000 = 1 min) */
  windowMs: number;
  /** Cooldown duration before canary attempt in ms (default: 300_000 = 5 min) */
  cooldownMs: number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  threshold: 3,
  windowMs: 60_000,
  cooldownMs: 300_000,
};

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ProviderHealthState {
  status: HealthStatus;
  consecutiveFailures: number;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  unhealthyUntil: number | null;
  totalRequests: number;
  totalFailures: number;
}

export class CircuitBreaker<TKey extends string = string> {
  private readonly health = new Map<TKey, ProviderHealthState>();
  private readonly failureTimestamps = new Map<TKey, number[]>();

  constructor(
    private readonly config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG,
    private readonly logPrefix: string = '[CircuitBreaker]',
  ) {}

  /**
   * Get or create health record for a provider.
   * Lazy initialization — providers register on first interaction.
   */
  getHealth(provider: TKey): ProviderHealthState {
    let h = this.health.get(provider);
    if (!h) {
      h = {
        status: 'healthy',
        consecutiveFailures: 0,
        lastSuccessAt: null,
        lastFailureAt: null,
        unhealthyUntil: null,
        totalRequests: 0,
        totalFailures: 0,
      };
      this.health.set(provider, h);
    }
    return h;
  }

  /**
   * Check if provider is available for requests.
   * Returns true for: healthy, degraded (canary slot).
   * Returns false for: unhealthy (still in cooldown).
   */
  isAvailable(provider: TKey): boolean {
    const h = this.getHealth(provider);

    if (h.status === 'healthy') return true;

    if (h.status === 'unhealthy' && h.unhealthyUntil) {
      // Cooldown expired → allow ONE canary request
      if (Date.now() >= h.unhealthyUntil) {
        h.status = 'degraded';
        logger.info(`${this.logPrefix} ${provider}: cooldown expired, canary allowed`);
        return true;
      }
      return false; // still in cooldown
    }

    // degraded = canary in progress, allow
    return h.status === 'degraded';
  }

  /** Record a successful request — resets failure count, restores health */
  recordSuccess(provider: TKey): void {
    const h = this.getHealth(provider);
    h.consecutiveFailures = 0;
    h.lastSuccessAt = Date.now();
    h.totalRequests++;

    if (h.status !== 'healthy') {
      logger.info(`${this.logPrefix} ${provider}: recovered → HEALTHY`, {
        previousStatus: h.status,
        totalRequests: h.totalRequests,
      });
      h.status = 'healthy';
      h.unhealthyUntil = null;
    }

    // Reset failure timestamps on success
    this.failureTimestamps.set(provider, []);
  }

  /** Record a failed request — may trip the circuit if threshold reached */
  recordFailure(provider: TKey): void {
    const h = this.getHealth(provider);
    const now = Date.now();
    h.consecutiveFailures++;
    h.lastFailureAt = now;
    h.totalRequests++;
    h.totalFailures++;

    // Track failures within sliding window
    const timestamps = this.failureTimestamps.get(provider) ?? [];
    timestamps.push(now);
    const windowStart = now - this.config.windowMs;
    const recentFailures = timestamps.filter((t) => t >= windowStart);
    this.failureTimestamps.set(provider, recentFailures);

    // Canary failure → reset cooldown, mark unhealthy again
    if (h.status === 'degraded') {
      h.status = 'unhealthy';
      h.unhealthyUntil = now + this.config.cooldownMs;
      logger.warn(`${this.logPrefix} ${provider}: canary FAILED, cooldown reset`, {
        cooldownUntil: new Date(h.unhealthyUntil).toISOString(),
      });
      return;
    }

    // Trip circuit if threshold reached within window
    if (h.status === 'healthy' && recentFailures.length >= this.config.threshold) {
      h.status = 'unhealthy';
      h.unhealthyUntil = now + this.config.cooldownMs;
      logger.warn(`${this.logPrefix} ${provider}: circuit TRIPPED → UNHEALTHY`, {
        failuresInWindow: recentFailures.length,
        threshold: this.config.threshold,
        cooldownUntil: new Date(h.unhealthyUntil).toISOString(),
      });
    }
  }

  /** Get all provider health states (for admin dashboard / heartbeat) */
  getAllHealth(): Record<string, ProviderHealthState> {
    const result: Record<string, ProviderHealthState> = {};
    for (const [key, value] of this.health) {
      result[key] = { ...value };
    }
    return result;
  }

  /** Reset state (test utility) */
  reset(): void {
    this.health.clear();
    this.failureTimestamps.clear();
  }
}
