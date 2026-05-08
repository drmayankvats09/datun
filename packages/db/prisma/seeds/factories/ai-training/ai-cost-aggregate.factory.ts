// ═══════════════════════════════════════════════════════════════
// AI COST AGGREGATE FACTORY — Pre-computed daily/monthly cost summaries
// Used by admin dashboard — query speed critical
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

interface AiCostAggregateOutput {
  readonly id: string;
  readonly aggregationLevel: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CLINIC' | 'PROVIDER';
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly clinicId: string | null;
  readonly provider: string | null;
  readonly totalRequests: number;
  readonly totalInputTokens: number;
  readonly totalOutputTokens: number;
  readonly totalCacheReadTokens: number;
  readonly totalCacheWriteTokens: number;
  readonly totalCostUsd: number;
  readonly totalCostInr: number;
  readonly avgLatencyMs: number;
  readonly p99LatencyMs: number;
  readonly errorRate: number;
  readonly cacheHitRate: number;
  readonly modelDistribution: object;
  readonly operationDistribution: object;
  readonly costPerConsultationInr: number;
  readonly aggregatedAt: Date;
  readonly createdAt: Date;
}

interface AiCostAggregateTransient {
  readonly level: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CLINIC' | 'PROVIDER';
  readonly periodStart: Date;
  readonly clinicId?: string | null;
  readonly provider?: string | null;
}

export const aiCostAggregateFactory = defineFactory<
  AiCostAggregateOutput,
  AiCostAggregateTransient
>({
  name: 'consultation' as 'consultation',
  defaultTransient: { level: 'DAILY', periodStart: new Date() },

  build: ({ sequence, faker, transient }) => {
    const level = transient.level;
    const periodEnd =
      level === 'DAILY'
        ? new Date(transient.periodStart.getTime() + 86400000)
        : level === 'WEEKLY'
          ? new Date(transient.periodStart.getTime() + 7 * 86400000)
          : level === 'MONTHLY'
            ? new Date(transient.periodStart.getTime() + 30 * 86400000)
            : new Date();

    const totalRequests = faker.number.int({ min: 50, max: 50000 });
    const avgInputTokens = faker.number.int({ min: 800, max: 3500 });
    const avgOutputTokens = faker.number.int({ min: 200, max: 1500 });
    const totalInputTokens = totalRequests * avgInputTokens;
    const totalOutputTokens = totalRequests * avgOutputTokens;
    const costUsd = (totalInputTokens * 3) / 1_000_000 + (totalOutputTokens * 15) / 1_000_000;

    return {
      id: `aiagg-${String(sequence).padStart(10, '0')}`,
      aggregationLevel: level,
      periodStart: transient.periodStart,
      periodEnd,
      clinicId: transient.clinicId ?? null,
      provider: transient.provider ?? null,
      totalRequests,
      totalInputTokens,
      totalOutputTokens,
      totalCacheReadTokens: Math.floor(totalInputTokens * 0.4),
      totalCacheWriteTokens: Math.floor(totalInputTokens * 0.05),
      totalCostUsd: costUsd,
      totalCostInr: costUsd * 83.5,
      avgLatencyMs: faker.number.int({ min: 800, max: 4000 }),
      p99LatencyMs: faker.number.int({ min: 5000, max: 15000 }),
      errorRate: faker.number.float({ min: 0.001, max: 0.05 }),
      cacheHitRate: faker.number.float({ min: 0.3, max: 0.8 }),
      modelDistribution: {
        'claude-sonnet-4': 0.7,
        'claude-haiku-4-5': 0.2,
        'gpt-4-turbo': 0.1,
      },
      operationDistribution: {
        CHAT_COMPLETION: 0.75,
        VISION_ANALYSIS: 0.12,
        TRANSCRIPTION: 0.08,
        EMBEDDING: 0.03,
        TRANSLATION: 0.02,
      },
      costPerConsultationInr: totalRequests > 0 ? (costUsd * 83.5) / (totalRequests / 5) : 0,
      aggregatedAt: new Date(),
      createdAt: new Date(),
    };
  },

  persist: async (agg) => agg,
});
