// packages/db/prisma/seeds/ai-training/synthesis/synthesis-cli.ts
// ═══════════════════════════════════════════════════════════════
// SYNTHESIS CLI — generate variants from seed examples
// FAANG-grade: every flag in workflow YAMLs MUST exist here.
// Source of truth: this file. Workflows consume.
// ═══════════════════════════════════════════════════════════════
import { Command } from 'commander';
import { runSynthesisPipeline } from './synthesis-orchestrator';
import { GOLDEN_CASES } from '../eval/golden-cases/golden-cases';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function registerSynthesisCommand(program: Command): void {
  program
    .command('synthesize')
    .description('Generate synthetic training examples from seed cases')
    .option('--strategy <name>', 'persona-vary | evol-instruct | back-translate', 'persona-vary')
    .option('--per-seed <n>', 'variants per seed example', '5')
    .option('--target-final <n>', 'final filtered count', '500')
    .option('--output <path>', 'JSONL output path (omit to skip file write)')
    .option(
      '--quality-min <score>',
      'minimum IFD quality score (0-1). Also applied as judge floor unless --judge-min set.',
      '0.3',
    )
    .option('--judge-min <score>', 'minimum LLM-judge score (1-5)', '3.5')
    .action(async (opts) => {
      const qualityMin = Number(opts.qualityMin);
      const judgeMin = Number(opts.judgeMin);
      if (Number.isNaN(qualityMin) || qualityMin < 0 || qualityMin > 1) {
        throw new Error(`--quality-min must be a number in [0, 1], got: ${opts.qualityMin}`);
      }
      if (Number.isNaN(judgeMin) || judgeMin < 1 || judgeMin > 5) {
        throw new Error(`--judge-min must be a number in [1, 5], got: ${opts.judgeMin}`);
      }

      const requests = GOLDEN_CASES.map((c) => ({
        strategy: opts.strategy,
        seedExample: {
          chiefComplaint: c.chiefComplaint,
          locale: c.locale,
          expectedUrgency: c.expectedResponse.urgency,
        },
        targetCount: Number(opts.perSeed),
        variationDimensions: ['age', 'gender', 'locale', 'phrasing'] as const,
      }));

      const result = await runSynthesisPipeline(requests, {
        targetFinalCount: Number(opts.targetFinal),
        minIfdScore: qualityMin,
        minJudgeScore: judgeMin,
      });

      if (opts.output) {
        // FAANG: ensure parent dir exists before write (CI tmp/ doesn't pre-exist)
        mkdirSync(dirname(opts.output), { recursive: true });
        const jsonl = result.finalExamples.map((e) => JSON.stringify(e)).join('\n');
        writeFileSync(opts.output, jsonl);
        console.log(`✓ Wrote ${result.finalExamples.length} examples → ${opts.output}`);
      }

      console.log(
        `✓ Synthesis complete: ${result.generated} generated → ${result.finalExamples.length} final`,
      );
      console.table({
        generated: result.generated,
        afterExactDedup: result.afterExactDedup,
        afterSemanticDedup: result.afterSemanticDedup,
        afterIfdFilter: result.afterIfdFilter,
        afterJudgeFilter: result.afterJudgeFilter,
      });
    });
}
