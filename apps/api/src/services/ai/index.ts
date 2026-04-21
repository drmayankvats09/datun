// ═══════════════════════════════════════════════════════════════
// AI CLIENT — Multi-provider failover + Redis response cache
//
// Architecture:
//   Caller → aiComplete() → Cache check (Redis)
//   → Cache HIT? Return immediately (zero cost)
//   → Cache MISS? → HealthManager checks availability
//   → Try Provider 1 (Claude) → success? cache + return
//   → Failed? → Try Provider 2 (OpenAI) → Try Provider 3 (Gemini)
//   → All failed? → ExternalServiceError
//
// Cache key = SHA256(promptVersion + last 3 user messages)
// Cache TTL = 24 hours. Hit rate target: 60-70% for dental queries.
// At 1L users, this saves ₹50K-1L/month in AI API costs.
//
// Pattern: Stripe multi-processor, Netflix Zuul, AWS Route53 health.
// ═══════════════════════════════════════════════════════════════

import { logger } from '../../lib/logger.js';
import { Sentry } from '../../lib/sentry.js';
import { ExternalServiceError } from '../../errors/index.js';
import { aiCache } from '../../lib/redis.js';
import { ClaudeProvider } from './claude.provider.js';
import { OpenAIProvider } from './openai.provider.js';
import { GeminiProvider } from './gemini.provider.js';
import { HealthManager } from './health-manager.js';
import { CostTracker } from './cost-tracker.js';
import type {
  AIProvider,
  AIResponse,
  ChatMessage,
  CompletionOptions,
  AIClientConfig,
  ProviderName,
} from './types.js';

// ── Default config ──
const DEFAULT_CONFIG: AIClientConfig = {
  circuitBreakerThreshold: 5,
  circuitBreakerWindowMs: 60_000,
  circuitBreakerCooldownMs: 600_000,
};

// ── Singleton instances ──
let healthManager: HealthManager | null = null;
let costTracker: CostTracker | null = null;
let providers: AIProvider[] = [];
let initialized = false;

function initialize(config: AIClientConfig = DEFAULT_CONFIG): void {
  if (initialized) return;

  healthManager = new HealthManager(config);
  costTracker = new CostTracker();

  const candidates: AIProvider[] = [
    new ClaudeProvider(),
    new OpenAIProvider(),
    new GeminiProvider(),
  ];

  providers = candidates.filter((p) => p.isConfigured());

  const activeNames = providers.map((p) => p.name);
  const inactiveNames = candidates.filter((p) => !p.isConfigured()).map((p) => p.name);

  logger.info('[AIClient] Initialized', {
    activeProviders: activeNames,
    inactiveProviders: inactiveNames,
    circuitBreaker: {
      threshold: config.circuitBreakerThreshold,
      windowMs: config.circuitBreakerWindowMs,
      cooldownMs: config.circuitBreakerCooldownMs,
    },
    responseCache: 'enabled (Redis/memory)',
  });

  if (providers.length === 0) {
    logger.error('[AIClient] NO AI PROVIDERS CONFIGURED — all requests will fail');
  }

  if (providers.length === 1) {
    logger.warn(
      `[AIClient] Only ${activeNames[0]} configured — no fallback available. Add OPENAI_API_KEY or GEMINI_API_KEY for redundancy.`,
    );
  }

  initialized = true;
}

/**
 * Send a chat completion through the failover chain WITH cache.
 *
 * @param options.skipCache — Set true for follow-up messages where context matters
 */
export async function aiComplete(
  systemPrompt: string,
  messages: ChatMessage[],
  options: CompletionOptions = {},
): Promise<AIResponse> {
  if (!initialized) initialize();

  if (providers.length === 0) {
    throw new ExternalServiceError('AI', 'No AI providers configured');
  }

  // ── Cache check (skip for multi-turn conversations with >3 messages) ──
  const shouldCache = !options.skipCache && messages.length <= 4;
  let cacheKey: string | null = null;

  if (shouldCache) {
    cacheKey = aiCache.generateKey('v2.1', messages);

    try {
      const cached = await aiCache.get(cacheKey);
      if (cached) {
        const cachedResponse = JSON.parse(cached) as AIResponse;
        logger.info('[AIClient] Cache HIT — returning cached response', {
          cacheKey,
          originalProvider: cachedResponse.provider,
          savedCostUsd: cachedResponse.costUsd.toFixed(6),
        });
        // Mark as cached, zero cost for this request
        return {
          ...cachedResponse,
          cached: true,
          costUsd: 0,
          latencyMs: 0,
        };
      }
    } catch {
      // Cache read failed — proceed with normal flow
    }
  }

  // ── Provider failover chain ──
  const errors: Array<{ provider: ProviderName; error: Error }> = [];

  for (const provider of providers) {
    if (!healthManager!.isAvailable(provider.name)) {
      logger.debug(`[AIClient] Skipping ${provider.name} — circuit breaker OPEN`);
      continue;
    }

    try {
      const response = await provider.complete(systemPrompt, messages, options);

      healthManager!.recordSuccess(provider.name);

      costTracker!.record({
        provider: response.provider,
        model: response.model,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        cacheReadTokens: response.usage.cacheReadTokens,
        costUsd: response.costUsd,
        latencyMs: response.latencyMs,
        cached: response.cached,
        timestamp: new Date(),
      });

      // ── Store in cache (non-blocking) ──
      if (shouldCache && cacheKey) {
        aiCache.set(cacheKey, JSON.stringify(response)).catch(() => {});
      }

      if (provider !== providers[0]) {
        logger.warn(`[AIClient] Request served by FALLBACK provider: ${provider.name}`, {
          primaryProvider: providers[0]!.name,
          fallbackProvider: provider.name,
          latencyMs: response.latencyMs,
        });
        Sentry.captureMessage(
          `AI fallback activated: ${providers[0]!.name} → ${provider.name}`,
          'warning',
        );
      }

      return response;
    } catch (err) {
      const error = err as Error;
      errors.push({ provider: provider.name, error });

      healthManager!.recordFailure(provider.name, error);

      logger.error(`[AIClient] ${provider.name} FAILED`, {
        error: error.message,
        attempt: errors.length,
        remainingProviders: providers
          .slice(providers.indexOf(provider) + 1)
          .filter((p) => healthManager!.isAvailable(p.name))
          .map((p) => p.name),
      });

      continue;
    }
  }

  const errorSummary = errors.map((e) => `${e.provider}: ${e.error.message}`).join(' | ');

  logger.error('[AIClient] ALL PROVIDERS FAILED', {
    errors: errors.map((e) => ({ provider: e.provider, message: e.error.message })),
  });

  Sentry.captureMessage(`All AI providers failed: ${errorSummary}`, 'error');

  throw new ExternalServiceError(
    'AI',
    `All AI providers unavailable. Tried: ${errors.map((e) => e.provider).join(', ')}`,
  );
}

/**
 * Get health status of all providers — exposed via /health endpoint.
 */
export function getAIHealth(): {
  providers: ReturnType<HealthManager['getAllHealth']>;
  dailyCosts: ReturnType<CostTracker['getDailyTotals']>;
} {
  if (!initialized) initialize();
  return {
    providers: healthManager!.getAllHealth(),
    dailyCosts: costTracker!.getDailyTotals(),
  };
}

export type {
  AIProvider,
  AIResponse,
  ChatMessage,
  ContentBlock,
  CompletionOptions,
} from './types.js';
