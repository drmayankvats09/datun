// ═══════════════════════════════════════════════════════════════
// AI PROVIDER TYPES — Multi-provider abstraction layer
// Interface-first: today Claude, tomorrow own fine-tuned model.
// Provider swap = zero route/service code changes.
// Pattern: Stripe's multi-processor, Netflix's multi-CDN.
// ═══════════════════════════════════════════════════════════════

// ── Message Types ──

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: 'text' | 'image';
  text?: string;
  source?: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

// ── Response ──

export interface AIResponse {
  /** Raw text response from AI */
  text: string;

  /** Token usage breakdown */
  usage: TokenUsage;

  /** Wall-clock time for the request (ms) */
  latencyMs: number;

  /** Exact model string used (e.g., 'claude-sonnet-4-20250514') */
  model: string;

  /** Which provider served this request */
  provider: ProviderName;

  /** Estimated cost in USD */
  costUsd: number;

  /** Whether this was served from cache */
  cached: boolean;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

// ── Provider Interface ──

/** All registered provider names */
export type ProviderName = 'claude' | 'openai' | 'gemini' | 'datun';

export interface AIProvider {
  /** Unique provider identifier */
  readonly name: ProviderName;

  /** Whether this provider is configured (has API key) */
  isConfigured(): boolean;

  /** Send a chat completion request */
  complete(
    systemPrompt: string,
    messages: ChatMessage[],
    options?: CompletionOptions,
  ): Promise<AIResponse>;
}

export interface CompletionOptions {
  /** Max tokens in response (default: 8096) */
  maxTokens?: number;
  /** Request timeout in ms (default: 60000) */
  timeoutMs?: number;
  /** Number of retries before giving up (default: 2) */
  maxRetries?: number;
  /** Skip Redis response cache (use for follow-up conversations) */
  skipCache?: boolean;
}

// ── Health Manager Types ──

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

export interface ProviderHealth {
  /** Current status */
  status: HealthStatus;
  /** Legacy alias for status (for backward compat with old tests) */
  currentStatus?: HealthStatus;
  /** Consecutive failure count */
  consecutiveFailures: number;
  /** Timestamp of last successful request */
  lastSuccessAt: number | null;
  /** Timestamp of last failure */
  lastFailureAt: number | null;
  /** When unhealthy status expires (auto-recovery) */
  unhealthyUntil: number | null;
  /** Total requests served (lifetime) */
  totalRequests: number;
  /** Total failures (lifetime) */
  totalFailures: number;
}

// ── Cost Tracker Types ──

export interface CostEntry {
  provider: ProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  costUsd: number;
  latencyMs: number;
  cached: boolean;
  timestamp: Date;
}

// ── Client Config ──

export interface AIClientConfig {
  /** Circuit breaker: failures before marking unhealthy (default: 5) */
  circuitBreakerThreshold: number;
  /** Circuit breaker: window for counting failures in ms (default: 60000) */
  circuitBreakerWindowMs: number;
  /** Circuit breaker: cooldown before retrying unhealthy provider in ms (default: 600000 = 10 min) */
  circuitBreakerCooldownMs: number;
}
