// ═══════════════════════════════════════════════════════════════
// AI CLIENT — Multi-provider failover chain with circuit breaker
//
// Architecture:
//   Caller → aiClient.complete() → HealthManager checks availability
//   → Try Provider 1 (Claude) → success? return
//   → Failed + healthy alternatives? → Try Provider 2 (OpenAI)
//   → Failed? → Try Provider 3 (Gemini)
//   → All failed? → ExternalServiceError
//
// CRITICAL RULE: Only ONE provider charges per request.
// Failed requests = zero cost. Fallback = single charge on fallback.
//
// Pattern: Stripe multi-processor, Netflix Zuul, AWS Route53 health.
// ═══════════════════════════════════════════════════════════════

import { logger } from '../../lib/logger.js';
import { Sentry } from '../../lib/sentry.js';
import { ExternalServiceError } from '../../errors/index.js';
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
  circuitBreakerThreshold: 5, // 5 failures → trip
  circuitBreakerWindowMs: 60_000, // within 60 seconds
  circuitBreakerCooldownMs: 600_000, // 10 min cooldown
};

// ── Singleton instances ──
let healthManager: HealthManager | null = null;
let costTracker: CostTracker | null = null;
let providers: AIProvider[] = [];
let initialized = false;

/**
 * Initialize provider chain. Called once at boot.
 * Only providers with valid API keys are added to the chain.
 */
function initialize(config: AIClientConfig = DEFAULT_CONFIG): void {
  if (initialized) return;

  healthManager = new HealthManager(config);
  costTracker = new CostTracker();

  // Priority order: Claude (primary) → OpenAI (fallback) → Gemini (emergency)
  // Only configured providers enter the chain
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
 * Send a chat completion through the failover chain.
 * This is the ONLY function callers should use.
 *
 * @example
 * ```ts
 * import { aiComplete } from '../services/ai/index.js';
 * const response = await aiComplete(systemPrompt, messages);
 * console.log(response.text, response.provider, response.costUsd);
 * ```
 */
export async function aiComplete(
  systemPrompt: string,
  messages: ChatMessage[],
  options: CompletionOptions = {},
): Promise<AIResponse> {
  // Lazy init (runs once)
  if (!initialized) initialize();

  if (providers.length === 0) {
    throw new ExternalServiceError('AI', 'No AI providers configured');
  }

  const errors: Array<{ provider: ProviderName; error: Error }> = [];

  for (const provider of providers) {
    // Circuit breaker check
    if (!healthManager!.isAvailable(provider.name)) {
      logger.debug(`[AIClient] Skipping ${provider.name} — circuit breaker OPEN`);
      continue;
    }

    try {
      const response = await provider.complete(systemPrompt, messages, options);

      // Record success
      healthManager!.recordSuccess(provider.name);

      // Track cost
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

      // If this wasn't the primary provider, log that fallback was used
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

      // Record failure (may trip circuit breaker)
      healthManager!.recordFailure(provider.name, error);

      logger.error(`[AIClient] ${provider.name} FAILED`, {
        error: error.message,
        attempt: errors.length,
        remainingProviders: providers
          .slice(providers.indexOf(provider) + 1)
          .filter((p) => healthManager!.isAvailable(p.name))
          .map((p) => p.name),
      });

      // Continue to next provider in chain
      continue;
    }
  }

  // ALL providers failed
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

// Re-export types for consumers
export type {
  AIProvider,
  AIResponse,
  ChatMessage,
  ContentBlock,
  CompletionOptions,
} from './types.js';
