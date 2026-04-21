// ═══════════════════════════════════════════════════════════════
// COST TRACKER — Per-request AI cost logging + cumulative totals
// Every request logged with provider, tokens, cost, latency.
// Daily totals persisted to Redis (survives restart).
// Fallback: in-memory (same as before).
// ═══════════════════════════════════════════════════════════════

import { logger } from '../../lib/logger.js';
import { cache, TTL } from '../../lib/redis.js';
import type { CostEntry, ProviderName } from './types.js';

interface DailyTotals {
  date: string;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  requestCount: number;
  byProvider: Record<string, { cost: number; requests: number }>;
}

// Redis key pattern for daily cost totals
const dailyCostKey = (date: string) => `cost:daily:${date}`;

export class CostTracker {
  private daily: DailyTotals;

  constructor() {
    this.daily = this.newDailyRecord();
    // Hydrate from Redis on startup (non-blocking)
    this.hydrateFromRedis().catch(() => {});
  }

  /** Record a completed AI request */
  record(entry: CostEntry): void {
    // Roll over day if needed
    const today = this.todayString();
    if (this.daily.date !== today) {
      // Persist previous day's summary to Redis before resetting
      if (this.daily.requestCount > 0) {
        logger.info('[CostTracker] Daily summary', {
          date: this.daily.date,
          totalCostUsd: this.daily.totalCostUsd.toFixed(6),
          totalRequests: this.daily.requestCount,
          byProvider: this.daily.byProvider,
        });
        this.persistToRedis(this.daily).catch(() => {});
      }
      this.daily = this.newDailyRecord();
    }

    // Accumulate
    this.daily.totalCostUsd += entry.costUsd;
    this.daily.totalInputTokens += entry.inputTokens;
    this.daily.totalOutputTokens += entry.outputTokens;
    this.daily.totalCacheReadTokens += entry.cacheReadTokens;
    this.daily.requestCount++;

    const provKey = entry.provider;
    if (!this.daily.byProvider[provKey]) {
      this.daily.byProvider[provKey] = { cost: 0, requests: 0 };
    }
    this.daily.byProvider[provKey]!.cost += entry.costUsd;
    this.daily.byProvider[provKey]!.requests++;

    // Per-request structured log (Winston → Better Stack → searchable)
    logger.info('[CostTracker] AI request', {
      provider: entry.provider,
      model: entry.model,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      cacheReadTokens: entry.cacheReadTokens,
      costUsd: entry.costUsd.toFixed(6),
      latencyMs: entry.latencyMs,
      cached: entry.cached,
      dailyTotalUsd: this.daily.totalCostUsd.toFixed(6),
      dailyRequestCount: this.daily.requestCount,
    });

    // Persist current day to Redis (non-blocking, every request)
    this.persistToRedis(this.daily).catch(() => {});
  }

  /** Get today's running totals — for /health or admin dashboard */
  getDailyTotals(): DailyTotals {
    return { ...this.daily };
  }

  // ── Redis persistence ──

  private async persistToRedis(totals: DailyTotals): Promise<void> {
    try {
      await cache.set(dailyCostKey(totals.date), JSON.stringify(totals), TTL.COST_DAILY);
    } catch {
      // Non-critical — Winston logs are the primary record
    }
  }

  private async hydrateFromRedis(): Promise<void> {
    try {
      const today = this.todayString();
      const raw = await cache.get(dailyCostKey(today));
      if (raw) {
        const saved = JSON.parse(raw) as DailyTotals;
        if (saved.date === today) {
          this.daily = saved;
          logger.info('[CostTracker] Hydrated from Redis', {
            date: today,
            requests: saved.requestCount,
            cost: saved.totalCostUsd.toFixed(6),
          });
        }
      }
    } catch {
      // Fresh start — no problem
    }
  }

  private todayString(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  private newDailyRecord(): DailyTotals {
    return {
      date: this.todayString(),
      totalCostUsd: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCacheReadTokens: 0,
      requestCount: 0,
      byProvider: {},
    };
  }
}
