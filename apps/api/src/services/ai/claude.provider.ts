// ═══════════════════════════════════════════════════════════════
// CLAUDE PROVIDER — Anthropic API with prompt caching
// Retry: 429/529 → exponential backoff → same model retry.
// Intra-provider fallback: Sonnet → Haiku (both Claude).
// Cost: calculated per-request from token counts + model pricing.
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { ExternalServiceError } from '../../errors/index.js';
import type { AIProvider, AIResponse, ChatMessage, CompletionOptions } from './types.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MAX_RETRIES = 2;
const RETRY_DELAYS = [2000, 5000, 10000];

// Pricing per million tokens (USD) — update when Anthropic changes pricing
// 📝 SAVE TO NOTES: Check Anthropic pricing page quarterly. Last verified: April 2026.
const MODEL_PRICING: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0, cacheRead: 0.3 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4.0, cacheRead: 0.08 },
};

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude' as const;

  isConfigured(): boolean {
    return Boolean(env.ANTHROPIC_API_KEY);
  }

  async complete(
    systemPrompt: string,
    messages: ChatMessage[],
    options: CompletionOptions = {},
  ): Promise<AIResponse> {
    if (!this.isConfigured()) {
      throw new ExternalServiceError('Claude', 'ANTHROPIC_API_KEY not configured');
    }

    const maxTokens = options.maxTokens ?? 8096;
    const timeoutMs = options.timeoutMs ?? 60000;
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    // Intra-provider fallback: primary model → fallback model (both Claude)
    const models = [env.AI_PRIMARY_MODEL, env.AI_FALLBACK_MODEL].filter(Boolean);

    for (const model of models) {
      try {
        return await this.callWithRetry(
          model,
          systemPrompt,
          messages,
          maxTokens,
          timeoutMs,
          maxRetries,
        );
      } catch (err) {
        const status = (err as { response?: { status: number } }).response?.status;
        // On non-retryable error with primary, try fallback model
        if (model === models[0] && models.length > 1 && status !== 429 && status !== 529) {
          logger.warn(`[Claude] Primary ${model} failed, trying fallback ${models[1]}`, {
            error: (err as Error).message,
            status,
          });
          continue;
        }
        throw err;
      }
    }

    throw new ExternalServiceError('Claude', 'All Claude models failed');
  }

  private async callWithRetry(
    model: string,
    systemPrompt: string,
    messages: ChatMessage[],
    maxTokens: number,
    timeoutMs: number,
    maxRetries: number,
  ): Promise<AIResponse> {
    const startTime = Date.now();

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(
          API_URL,
          {
            model,
            max_tokens: maxTokens,
            system: [
              {
                type: 'text',
                text: systemPrompt,
                cache_control: { type: 'ephemeral' },
              },
            ],
            messages,
          },
          {
            headers: {
              'x-api-key': env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'anthropic-beta': 'prompt-caching-2024-07-31',
              'Content-Type': 'application/json',
            },
            timeout: timeoutMs,
          },
        );

        const data = response.data as {
          content: Array<{ type: string; text?: string }>;
          usage?: {
            input_tokens?: number;
            output_tokens?: number;
            cache_read_input_tokens?: number;
            cache_creation_input_tokens?: number;
          };
        };

        const text = data.content
          .filter((c) => c.type === 'text')
          .map((c) => c.text ?? '')
          .join('');

        const usage = {
          inputTokens: data.usage?.input_tokens ?? 0,
          outputTokens: data.usage?.output_tokens ?? 0,
          cacheReadTokens: data.usage?.cache_read_input_tokens ?? 0,
          cacheCreationTokens: data.usage?.cache_creation_input_tokens ?? 0,
        };

        const costUsd = this.calculateCost(model, usage);

        return {
          text,
          usage,
          latencyMs: Date.now() - startTime,
          model,
          provider: 'claude',
          costUsd,
          cached: false,
        };
      } catch (err) {
        const status = (err as { response?: { status: number } }).response?.status;

        // Retryable errors: 429 (rate limit), 529 (overloaded)
        if ((status === 429 || status === 529) && attempt < maxRetries) {
          const delay = RETRY_DELAYS[attempt] ?? 5000;
          logger.warn(
            `[Claude] ${status} on ${model}, retry ${attempt + 1}/${maxRetries} in ${delay}ms`,
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        // Non-retryable or max retries exhausted — throw to aiClient for failover
        throw err;
      }
    }

    throw new ExternalServiceError('Claude', `Max retries exceeded on ${model}`);
  }

  private calculateCost(
    model: string,
    usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number },
  ): number {
    const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['claude-sonnet-4-20250514']!;
    const inputCost = ((usage.inputTokens - usage.cacheReadTokens) * pricing.input) / 1_000_000;
    const cacheCost = (usage.cacheReadTokens * pricing.cacheRead) / 1_000_000;
    const outputCost = (usage.outputTokens * pricing.output) / 1_000_000;
    return inputCost + cacheCost + outputCost;
  }
}
