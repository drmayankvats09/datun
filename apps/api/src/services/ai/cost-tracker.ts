// ═══════════════════════════════════════════════════════════════
// COST TRACKER — Per-request AI cost logging + cumulative totals
// Every request logged with provider, tokens, cost, latency.
// Used for: billing analysis, provider comparison, budget alerts.
//
// Current: In-memory running totals + per-request logs (Winston).
// 📝 SAVE TO NOTES: When Redis comes (Task #29), persist daily
// totals to Redis sorted set for dashboard graphs.
// 📝 SAVE TO NOTES: When PostHog comes (Task #49), fire
// 'ai_request' event with {provider, cost, tokens} for analytics.
// ═══════════════════════════════════════════════════════════════

import { logger } from '../../lib/logger.js';
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

export class CostTracker {
  private daily: DailyTotals;

  constructor() {
    this.daily = this.newDailyRecord();
  }

  /** Record a completed AI request */
  record(entry: CostEntry): void {
    // Roll over day if needed
    const today = this.todayString();
    if (this.daily.date !== today) {
      // Log previous day's summary before resetting
      if (this.daily.requestCount > 0) {
        logger.info('[CostTracker] Daily summary', {
          date: this.daily.date,
          totalCostUsd: this.daily.totalCostUsd.toFixed(6),
          totalRequests: this.daily.requestCount,
          byProvider: this.daily.byProvider,
        });
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
  }

  /** Get today's running totals — for /health or admin dashboard */
  getDailyTotals(): DailyTotals {
    return { ...this.daily };
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
