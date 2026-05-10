// ═══════════════════════════════════════════════════════════════
// EVOL-INSTRUCT — Iterative instruction evolution for synthesis
//
// Source: Xu et al. "WizardLM: Empowering Large Pre-trained Language
// Models to Follow Complex Instructions" (Apr 2023, arXiv:2304.12244).
//
// Strategy: take a seed instruction, evolve via 5 strategies:
//   - DEEPENING:    add specificity / constraints
//   - REASONING:    require multi-step reasoning
//   - COMPLICATING: add edge cases
//   - DIVERSIFY:    rewrite from different angle
//   - CONCRETE:     replace abstractions with concrete entities
//
// Why useful for Datun: dental triage seed cases (~100) → evolved
// dataset of ~5000 with same diagnostic skeleton, diverse phrasing.
// ═══════════════════════════════════════════════════════════════

import { logger } from '../../utils/logger';
import type { ModelAdapter } from '../eval/eval-runner';

export type EvolutionStrategy =
  | 'DEEPENING'
  | 'REASONING'
  | 'COMPLICATING'
  | 'DIVERSIFY'
  | 'CONCRETE';

export interface EvolInput {
  readonly seedInstruction: string;
  readonly strategy: EvolutionStrategy;
}

export interface EvolOutput {
  readonly seed: string;
  readonly evolved: string;
  readonly strategy: EvolutionStrategy;
  readonly modelId: string;
  readonly latencyMs: number;
}

const STRATEGY_PROMPTS: Record<EvolutionStrategy, string> = {
  DEEPENING:
    'Rewrite the following instruction to add specificity and constraints, making it more detailed without changing the core task. Keep it dental-clinical realistic.',
  REASONING:
    'Rewrite the following instruction to require explicit multi-step reasoning before answering. Keep it dental-clinical realistic.',
  COMPLICATING:
    'Rewrite the following instruction to introduce additional realistic edge cases (e.g., comorbidities, allergies, age extremes). Keep it dental-clinical realistic.',
  DIVERSIFY:
    'Rewrite the following instruction from a different angle (e.g., switch from patient narrative to clinician note, or vice versa). Keep meaning intact.',
  CONCRETE:
    'Rewrite the following instruction by replacing abstract phrases with concrete dental entities (specific tooth numbers, named medications, exact pain scales).',
};

export interface EvolveOptions {
  readonly model: ModelAdapter;
  readonly inputs: readonly EvolInput[];
  /** Throttle to avoid provider rate limits. Default 250ms. */
  readonly delayMs?: number;
}

export interface EvolveResult {
  readonly outputs: readonly EvolOutput[];
  readonly errorCount: number;
  readonly totalDurationMs: number;
}

/**
 * Evolve a batch of seed instructions sequentially. Sequential rather
 * than parallel because most providers throttle anyway, and the
 * synthesis pipeline is run offline (CI/cron) — total wall time isn't
 * critical, error attribution is.
 */
export async function evolve(opts: EvolveOptions): Promise<EvolveResult> {
  const t0 = Date.now();
  const outputs: EvolOutput[] = [];
  let errorCount = 0;

  for (const input of opts.inputs) {
    const systemPrompt = STRATEGY_PROMPTS[input.strategy];
    const userPrompt = `INSTRUCTION:\n${input.seedInstruction}\n\nReturn ONLY the rewritten instruction, no preamble.`;
    const taskStart = Date.now();

    try {
      const evolvedText = await opts.model.generate(systemPrompt, userPrompt);
      const cleaned = evolvedText.trim();
      if (cleaned.length < 10) {
        errorCount += 1;
        logger.warn(
          { strategy: input.strategy, seed: input.seedInstruction.slice(0, 60) },
          'Evolved output too short — skipping',
        );
        continue;
      }
      outputs.push({
        seed: input.seedInstruction,
        evolved: cleaned,
        strategy: input.strategy,
        modelId: opts.model.id,
        latencyMs: Date.now() - taskStart,
      });
    } catch (err) {
      errorCount += 1;
      logger.error(
        { err, strategy: input.strategy, seed: input.seedInstruction.slice(0, 60) },
        'Evolve generation failed',
      );
    }

    if (opts.delayMs && opts.delayMs > 0) {
      await new Promise((r) => setTimeout(r, opts.delayMs));
    }
  }

  return {
    outputs,
    errorCount,
    totalDurationMs: Date.now() - t0,
  };
}
