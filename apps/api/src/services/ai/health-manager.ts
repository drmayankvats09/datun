// ═══════════════════════════════════════════════════════════════
// HEALTH MANAGER — Circuit breaker for AI providers
// Pattern: Netflix Hystrix, AWS Circuit Breaker, Resilience4j
//
// Flow:
// 1. Provider fails → consecutiveFailures++
// 2. Failures >= threshold within window → mark UNHEALTHY
// 3. Unhealthy provider skipped for cooldown period
// 4. After cooldown → ONE canary request allowed
// 5. Canary succeeds → HEALTHY. Canary fails → reset cooldown.
//
// Why in-memory (not Redis): Circuit breaker is per-instance.
// Each Railway container has its own health state — intentional.
// If instance A sees Claude down, instance B independently detects too.
// Redis-based global circuit breaker is Task #29 upgrade path.
// ═══════════════════════════════════════════════════════════════

import { logger } from '../../lib/logger.js';
import type { ProviderName, ProviderHealth, HealthStatus, AIClientConfig } from './types.js';

export class HealthManager {
  private readonly health = new Map<ProviderName, ProviderHealth>();
  private readonly failureTimestamps = new Map<ProviderName, number[]>();

  constructor(private readonly config: AIClientConfig) {}

  /** Get or create health record for a provider */
  getHealth(provider: ProviderName): ProviderHealth {
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

  /** Check if provider is available for requests */
  isAvailable(provider: ProviderName): boolean {
    const h = this.getHealth(provider);

    if (h.status === 'healthy') return true;

    if (h.status === 'unhealthy' && h.unhealthyUntil) {
      // Cooldown expired → allow ONE canary request
      if (Date.now() >= h.unhealthyUntil) {
        h.status = 'degraded'; // canary mode
        logger.info(`[HealthManager] ${provider}: cooldown expired, allowing canary request`);
        return true;
      }
      return false; // still in cooldown
    }

    // degraded = canary in progress, allow
    return h.status === 'degraded';
  }

  /** Record successful request */
  recordSuccess(provider: ProviderName): void {
    const h = this.getHealth(provider);
    h.consecutiveFailures = 0;
    h.lastSuccessAt = Date.now();
    h.totalRequests++;

    if (h.status !== 'healthy') {
      logger.info(`[HealthManager] ${provider}: recovered → HEALTHY`, {
        previousStatus: h.status,
        totalRequests: h.totalRequests,
      });
      h.status = 'healthy';
      h.unhealthyUntil = null;
    }
  }

  /** Record failed request — may trip circuit breaker */
  recordFailure(provider: ProviderName, error: Error): void {
    const h = this.getHealth(provider);
    const now = Date.now();

    h.consecutiveFailures++;
    h.lastFailureAt = now;
    h.totalRequests++;
    h.totalFailures++;

    // Track failure timestamps for window-based counting
    let timestamps = this.failureTimestamps.get(provider) ?? [];
    timestamps.push(now);
    // Keep only failures within the window
    timestamps = timestamps.filter((t) => now - t < this.config.circuitBreakerWindowMs);
    this.failureTimestamps.set(provider, timestamps);

    // If canary failed → back to unhealthy with fresh cooldown
    if (h.status === 'degraded') {
      h.status = 'unhealthy';
      h.unhealthyUntil = now + this.config.circuitBreakerCooldownMs;
      logger.warn(`[HealthManager] ${provider}: canary FAILED → UNHEALTHY again`, {
        cooldownMs: this.config.circuitBreakerCooldownMs,
        error: error.message,
      });
      return;
    }

    // Check if threshold breached within window
    if (timestamps.length >= this.config.circuitBreakerThreshold) {
      h.status = 'unhealthy';
      h.unhealthyUntil = now + this.config.circuitBreakerCooldownMs;
      logger.error(`[HealthManager] ${provider}: circuit OPEN → UNHEALTHY`, {
        failures: timestamps.length,
        windowMs: this.config.circuitBreakerWindowMs,
        cooldownMs: this.config.circuitBreakerCooldownMs,
        error: error.message,
      });
    } else {
      logger.warn(
        `[HealthManager] ${provider}: failure ${timestamps.length}/${this.config.circuitBreakerThreshold}`,
        {
          error: error.message,
        },
      );
    }
  }

  /** Get snapshot of all provider health — for /health endpoint */
  getAllHealth(): Record<ProviderName, ProviderHealth & { currentStatus: HealthStatus }> {
    const result: Record<string, ProviderHealth & { currentStatus: HealthStatus }> = {};
    for (const [name, h] of this.health.entries()) {
      result[name] = {
        ...h,
        currentStatus: this.isAvailable(name) ? h.status : 'unhealthy',
      };
    }
    return result as Record<ProviderName, ProviderHealth & { currentStatus: HealthStatus }>;
  }
}
