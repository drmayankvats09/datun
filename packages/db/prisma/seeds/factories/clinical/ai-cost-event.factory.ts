// ═══════════════════════════════════════════════════════════════
// AI COST EVENT FACTORY — Per-token cost tracking
// Critical for billing reconciliation + cost optimization
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';
import { realisticAiInputTokens, realisticAiCost } from '../distributions/distributions';

type AiProvider = 'ANTHROPIC' | 'OPENAI' | 'GOOGLE' | 'AZURE_OPENAI' | 'AWS_BEDROCK';
type AiOperation =
  | 'CHAT_COMPLETION'
  | 'VISION_ANALYSIS'
  | 'EMBEDDING'
  | 'TRANSCRIPTION'
  | 'TRANSLATION'
  | 'IMAGE_GENERATION';

interface AiCostEventOutput {
  readonly id: string;
  readonly consultationId: string | null;
  readonly userId: string | null;
  readonly clinicId: string | null;
  readonly provider: AiProvider;
  readonly modelId: string;
  readonly operation: AiOperation;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly costUsd: number;
  readonly costInr: number;
  readonly inrUsdRate: number;
  readonly latencyMs: number;
  readonly success: boolean;
  readonly errorCode: string | null;
  readonly providerRequestId: string;
  readonly billingPeriod: string; // YYYY-MM
  readonly recordedAt: Date;
}

interface AiCostEventTransient {
  readonly consultationId?: string | null;
  readonly userId?: string | null;
  readonly clinicId?: string | null;
  readonly provider?: AiProvider;
  readonly operation?: AiOperation;
}

export const aiCostEventFactory = defineFactory<AiCostEventOutput, AiCostEventTransient>({
  name: 'consultation' as 'consultation',
  defaultTransient: {},

  build: ({ sequence, seed, faker, transient }) => {
    const provider =
      transient.provider ??
      faker.helpers.weightedArrayElement([
        { weight: 70, value: 'ANTHROPIC' as const },
        { weight: 18, value: 'OPENAI' as const },
        { weight: 8, value: 'GOOGLE' as const },
        { weight: 3, value: 'AZURE_OPENAI' as const },
        { weight: 1, value: 'AWS_BEDROCK' as const },
      ]);

    const modelId =
      provider === 'ANTHROPIC'
        ? faker.helpers.arrayElement(['claude-sonnet-4', 'claude-haiku-4-5', 'claude-opus-4'])
        : provider === 'OPENAI'
          ? faker.helpers.arrayElement(['gpt-4-turbo', 'gpt-4o', 'gpt-3.5-turbo'])
          : provider === 'GOOGLE'
            ? faker.helpers.arrayElement(['gemini-1.5-pro', 'gemini-1.5-flash'])
            : 'unknown-model';

    const operation =
      transient.operation ??
      faker.helpers.weightedArrayElement([
        { weight: 75, value: 'CHAT_COMPLETION' as const },
        { weight: 12, value: 'VISION_ANALYSIS' as const },
        { weight: 8, value: 'TRANSCRIPTION' as const },
        { weight: 3, value: 'EMBEDDING' as const },
        { weight: 2, value: 'TRANSLATION' as const },
      ]);

    const inputTokens = realisticAiInputTokens(seed);
    const outputTokens = Math.floor(inputTokens * faker.number.float({ min: 0.1, max: 0.5 }));
    const cacheReadTokens = Math.floor(inputTokens * faker.number.float({ min: 0, max: 0.7 }));
    const cacheWriteTokens = Math.floor(inputTokens * faker.number.float({ min: 0, max: 0.1 }));

    const inrUsdRate = 83.5;
    const costUsd = realisticAiCost(inputTokens, outputTokens);

    return {
      id: `aicost-${String(sequence).padStart(12, '0')}`,
      consultationId: transient.consultationId ?? null,
      userId: transient.userId ?? null,
      clinicId: transient.clinicId ?? null,
      provider,
      modelId,
      operation,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cacheReadTokens,
      cacheWriteTokens,
      costUsd,
      costInr: costUsd * inrUsdRate,
      inrUsdRate,
      latencyMs: faker.number.int({ min: 500, max: 15000 }),
      success: faker.datatype.boolean({ probability: 0.97 }),
      errorCode: faker.datatype.boolean({ probability: 0.03 })
        ? faker.helpers.arrayElement([
            'rate_limit_exceeded',
            'context_length_exceeded',
            'invalid_request',
            'timeout',
          ])
        : null,
      providerRequestId: faker.string.alphanumeric(32),
      billingPeriod: new Date().toISOString().slice(0, 7),
      recordedAt: new Date(),
    };
  },

  persist: async (event) => event,
});
