// ═══════════════════════════════════════════════════════════════
// AI SERVICE FACTORY — Returns configured AI provider
// To switch from Claude to own model: change this one file.
// ═══════════════════════════════════════════════════════════════

import type { AIProvider } from './types.js';
import { ClaudeProvider } from './claude.provider.js';

let instance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!instance) {
    // Future: switch based on env.AI_PROVIDER (claude | openai | datun-v1)
    instance = new ClaudeProvider();
  }
  return instance;
}

export type { AIProvider, AIResponse, ChatMessage, ContentBlock } from './types.js';
