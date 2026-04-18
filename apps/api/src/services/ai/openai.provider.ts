// ═══════════════════════════════════════════════════════════════
// OPENAI PROVIDER — GPT-4 Turbo fallback
// Activated ONLY when OPENAI_API_KEY is set in env.
// Same interface as ClaudeProvider — aiClient doesn't know difference.
//
// 📝 SAVE TO NOTES: When OpenAI key obtained, add to Railway env:
//   OPENAI_API_KEY=sk-... → provider auto-activates on next deploy.
//   Zero code change needed.
// ═══════════════════════════════════════════════════════════════

import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { ExternalServiceError } from '../../errors/index.js';
import type {
  AIProvider,
  AIResponse,
  ChatMessage,
  CompletionOptions,
  ContentBlock,
} from './types.js';

const API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = 'gpt-4-turbo';
const RETRY_DELAYS = [2000, 5000];

// Pricing per million tokens (USD)
const PRICING = { input: 10.0, output: 30.0 };

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai' as const;

  isConfigured(): boolean {
    return Boolean(env.OPENAI_API_KEY);
  }

  async complete(
    systemPrompt: string,
    messages: ChatMessage[],
    options: CompletionOptions = {},
  ): Promise<AIResponse> {
    if (!this.isConfigured()) {
      throw new ExternalServiceError('OpenAI', 'OPENAI_API_KEY not configured');
    }

    const maxTokens = options.maxTokens ?? 8096;
    const timeoutMs = options.timeoutMs ?? 60000;
    const maxRetries = options.maxRetries ?? 2;
    const startTime = Date.now();

    // Convert messages to OpenAI format
    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: this.convertContent(m.content),
      })),
    ];

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(
          API_URL,
          {
            model: DEFAULT_MODEL,
            max_tokens: maxTokens,
            messages: openaiMessages,
          },
          {
            headers: {
              Authorization: `Bearer ${env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            timeout: timeoutMs,
          },
        );

        const data = response.data as {
          choices: Array<{ message: { content: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };

        const text = data.choices[0]?.message?.content ?? '';
        const inputTokens = data.usage?.prompt_tokens ?? 0;
        const outputTokens = data.usage?.completion_tokens ?? 0;

        const costUsd =
          (inputTokens * PRICING.input) / 1_000_000 + (outputTokens * PRICING.output) / 1_000_000;

        return {
          text,
          usage: {
            inputTokens,
            outputTokens,
            cacheReadTokens: 0,
            cacheCreationTokens: 0,
          },
          latencyMs: Date.now() - startTime,
          model: DEFAULT_MODEL,
          provider: 'openai',
          costUsd,
          cached: false,
        };
      } catch (err) {
        const status = (err as { response?: { status: number } }).response?.status;
        if (status === 429 && attempt < maxRetries) {
          const delay = RETRY_DELAYS[attempt] ?? 5000;
          logger.warn(`[OpenAI] 429, retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }

    throw new ExternalServiceError('OpenAI', 'Max retries exceeded');
  }

  /** Convert Claude-format content to OpenAI-format */
  private convertContent(content: string | ContentBlock[]): string {
    if (typeof content === 'string') return content;

    // OpenAI vision: only text blocks supported in this basic implementation
    // 📝 SAVE TO NOTES: For photo analysis fallback, add OpenAI Vision
    // support here — convert base64 image blocks to OpenAI's image_url format.
    return content
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('');
  }
}
