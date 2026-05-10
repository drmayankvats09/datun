// ═══════════════════════════════════════════════════════════════
// LENGTH FILTER
//
// Filters training examples by token-length bounds. Required by:
//   - Anthropic fine-tuning (8k context max for current FT)
//   - OpenAI fine-tuning (16k tokens hard limit)
//   - Quality: very short (<10 tokens) examples = label noise
//   - Quality: very long (>4k tokens) examples = costly with marginal gain
//
// Used by quality-orchestrator.ts and synthesis dedup pipeline.
// Token estimation uses simple heuristic (1 token ≈ 4 chars for English).
// For production accuracy, swap in @anthropic-ai/tokenizer or tiktoken.
// ═══════════════════════════════════════════════════════════════

export interface LengthBounds {
  readonly minTokens: number;
  readonly maxTokens: number;
}

export const DEFAULT_BOUNDS: LengthBounds = { minTokens: 10, maxTokens: 4000 };

/** 1 token ≈ 4 chars for English; 1 token ≈ 2.5 chars for Hindi/regional. */
export function estimateTokens(text: string, locale: string = 'en'): number {
  const charsPerToken = locale === 'en' ? 4 : 2.5;
  return Math.ceil(text.length / charsPerToken);
}

export interface FilterableExample {
  readonly id: string;
  readonly text: string;
  readonly locale?: string;
}

export interface LengthFilterResult<T extends FilterableExample> {
  readonly kept: readonly T[];
  readonly droppedTooShort: readonly T[];
  readonly droppedTooLong: readonly T[];
  readonly stats: {
    readonly inputCount: number;
    readonly keptCount: number;
    readonly dropRate: number;
    readonly meanTokens: number;
    readonly medianTokens: number;
  };
}

export function filterByLength<T extends FilterableExample>(
  examples: readonly T[],
  bounds: LengthBounds = DEFAULT_BOUNDS,
): LengthFilterResult<T> {
  const kept: T[] = [];
  const droppedTooShort: T[] = [];
  const droppedTooLong: T[] = [];
  const tokenCounts: number[] = [];

  for (const ex of examples) {
    const tokens = estimateTokens(ex.text, ex.locale);
    if (tokens < bounds.minTokens) {
      droppedTooShort.push(ex);
    } else if (tokens > bounds.maxTokens) {
      droppedTooLong.push(ex);
    } else {
      kept.push(ex);
      tokenCounts.push(tokens);
    }
  }

  tokenCounts.sort((a, b) => a - b);
  const meanTokens = tokenCounts.reduce((s, t) => s + t, 0) / Math.max(1, tokenCounts.length);
  const medianTokens = tokenCounts[Math.floor(tokenCounts.length / 2)] ?? 0;

  return {
    kept,
    droppedTooShort,
    droppedTooLong,
    stats: {
      inputCount: examples.length,
      keptCount: kept.length,
      dropRate: (examples.length - kept.length) / Math.max(1, examples.length),
      meanTokens: Math.round(meanTokens),
      medianTokens,
    },
  };
}
