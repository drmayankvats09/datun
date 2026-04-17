// ═══════════════════════════════════════════════════════════════
// AI PROVIDER TYPES — Abstraction for LLM providers
// Today: Claude. Tomorrow: own fine-tuned model.
// Provider swap = zero route/service code changes.
// ═══════════════════════════════════════════════════════════════

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

export interface AIResponse {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheCreationTokens: number;
  };
  latencyMs: number;
  model: string;
  /** Estimated cost in USD (for tracking) */
  costUsd: number;
}

export interface AIProvider {
  readonly name: string;

  /** Send a chat completion request */
  complete(
    systemPrompt: string,
    messages: ChatMessage[],
    options?: { maxTokens?: number },
  ): Promise<AIResponse>;
}
