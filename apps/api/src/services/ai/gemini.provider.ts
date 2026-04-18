// ═══════════════════════════════════════════════════════════════
// GEMINI PROVIDER — Google Gemini 1.5 Pro emergency fallback
// Activated ONLY when GEMINI_API_KEY is set in env.
// Third-priority: Claude → OpenAI → Gemini.
//
// 📝 SAVE TO NOTES: When GCP for Startups credit arrives (Task #26),
//   use Vertex AI endpoint instead of public API for better SLA.
//   GEMINI_API_KEY=AIza... → provider auto-activates.
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

const DEFAULT_MODEL = 'gemini-1.5-pro';
const RETRY_DELAYS = [2000, 5000];

// Pricing per million tokens (USD) — Google AI Studio pricing
const PRICING = { input: 3.5, output: 10.5 };

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const;

  isConfigured(): boolean {
    return Boolean(env.GEMINI_API_KEY);
  }

  async complete(
    systemPrompt: string,
    messages: ChatMessage[],
    options: CompletionOptions = {},
  ): Promise<AIResponse> {
    if (!this.isConfigured()) {
      throw new ExternalServiceError('Gemini', 'GEMINI_API_KEY not configured');
    }

    const maxTokens = options.maxTokens ?? 8096;
    const timeoutMs = options.timeoutMs ?? 60000;
    const maxRetries = options.maxRetries ?? 2;
    const startTime = Date.now();

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;

    // Convert to Gemini format
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: this.extractText(m.content) }],
    }));

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.post(
          apiUrl,
          {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: { maxOutputTokens: maxTokens },
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: timeoutMs,
          },
        );

        const data = response.data as {
          candidates?: Array<{
            content: { parts: Array<{ text: string }> };
          }>;
          usageMetadata?: {
            promptTokenCount?: number;
            candidatesTokenCount?: number;
          };
        };

        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';

        const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
        const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;

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
          provider: 'gemini',
          costUsd,
          cached: false,
        };
      } catch (err) {
        const status = (err as { response?: { status: number } }).response?.status;
        if (status === 429 && attempt < maxRetries) {
          const delay = RETRY_DELAYS[attempt] ?? 5000;
          logger.warn(`[Gemini] 429, retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }

    throw new ExternalServiceError('Gemini', 'Max retries exceeded');
  }

  private extractText(content: string | ContentBlock[]): string {
    if (typeof content === 'string') return content;
    return content
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('');
  }
}
