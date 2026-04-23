// ═══════════════════════════════════════════════════════════════
// COST TRACKER — Per-request AI cost logging + budget alerts
// ═══════════════════════════════════════════════════════════════

import { logger } from '../../lib/logger.js';
import { cache, TTL } from '../../lib/redis.js';
import { checkCostThresholds } from './cost-alerts.js';
import type { CostEntry } from './types.js';

interface DailyTotals {
  date: string;
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  requestCount: number;
  byProvider: Record<string, { cost: number; requests: number }>;
}

const dailyCostKey = (date: string) => `cost:daily:${date}`;

export class CostTracker {
  private daily: DailyTotals;

  constructor() {
    this.daily = this.newDailyRecord();
    this.hydrateFromRedis().catch(() => {});
  }

  record(entry: CostEntry): void {
    const today = this.todayString();
    if (this.daily.date !== today) {
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

    this.persistToRedis(this.daily).catch(() => {});

    // Budget threshold check (non-blocking — never breaks AI responses)
    checkCostThresholds(this.daily.totalCostUsd, entry.costUsd).catch(() => {});
  }

  getDailyTotals(): DailyTotals {
    return { ...this.daily };
  }

  private async persistToRedis(totals: DailyTotals): Promise<void> {
    try {
      await cache.set(dailyCostKey(totals.date), JSON.stringify(totals), TTL.COST_DAILY);
    } catch {
      /* Non-critical */
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
      /* Fresh start */
    }
  }

  private todayString(): string {
    return new Date().toISOString().slice(0, 10);
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
