import { describe, it, expect, beforeEach } from 'vitest';
import { CostTracker } from '../../services/ai/cost-tracker.js';

describe('CostTracker', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  it('starts with zero totals', () => {
    const totals = tracker.getDailyTotals();
    expect(totals.totalCostUsd).toBe(0);
    expect(totals.requestCount).toBe(0);
    expect(totals.totalInputTokens).toBe(0);
    expect(totals.totalOutputTokens).toBe(0);
  });

  it('records a single request correctly', () => {
    tracker.record({
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadTokens: 200,
      costUsd: 0.005,
      latencyMs: 1200,
      cached: false,
      timestamp: new Date(),
    });

    const totals = tracker.getDailyTotals();
    expect(totals.requestCount).toBe(1);
    expect(totals.totalCostUsd).toBe(0.005);
    expect(totals.totalInputTokens).toBe(1000);
    expect(totals.totalOutputTokens).toBe(500);
    expect(totals.totalCacheReadTokens).toBe(200);
  });

  it('accumulates multiple requests', () => {
    for (let i = 0; i < 5; i++) {
      tracker.record({
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        costUsd: 0.001,
        latencyMs: 500,
        cached: false,
        timestamp: new Date(),
      });
    }

    const totals = tracker.getDailyTotals();
    expect(totals.requestCount).toBe(5);
    expect(totals.totalCostUsd).toBeCloseTo(0.005);
    expect(totals.totalInputTokens).toBe(500);
    expect(totals.totalOutputTokens).toBe(250);
  });

  it('tracks costs per provider', () => {
    tracker.record({
      provider: 'claude',
      model: 'claude-sonnet-4-20250514',
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: 0,
      costUsd: 0.003,
      latencyMs: 500,
      cached: false,
      timestamp: new Date(),
    });

    tracker.record({
      provider: 'openai',
      model: 'gpt-4',
      inputTokens: 200,
      outputTokens: 100,
      cacheReadTokens: 0,
      costUsd: 0.006,
      latencyMs: 800,
      cached: false,
      timestamp: new Date(),
    });

    const totals = tracker.getDailyTotals();
    expect(totals.byProvider['claude']?.requests).toBe(1);
    expect(totals.byProvider['claude']?.cost).toBe(0.003);
    expect(totals.byProvider['openai']?.requests).toBe(1);
    expect(totals.byProvider['openai']?.cost).toBe(0.006);
  });

  it('date format is YYYY-MM-DD', () => {
    const totals = tracker.getDailyTotals();
    expect(totals.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('getDailyTotals returns a copy (immutable)', () => {
    const totals1 = tracker.getDailyTotals();
    totals1.requestCount = 999;
    const totals2 = tracker.getDailyTotals();
    expect(totals2.requestCount).toBe(0);
  });
});
