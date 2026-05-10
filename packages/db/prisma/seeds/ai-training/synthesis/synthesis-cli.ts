// ═══════════════════════════════════════════════════════════════
// SYNTHESIS CLI — generate variants from seed examples
// ═══════════════════════════════════════════════════════════════
import { Command } from 'commander';
import { runSynthesisPipeline } from './synthesis-orchestrator';
import { GOLDEN_CASES } from '../eval/golden-cases/golden-cases';
import { writeFileSync } from 'node:fs';

export function registerSynthesisCommand(program: Command): void {
  program
    .command('synthesize')
    .description('Generate synthetic training examples from seed cases')
    .option('--strategy <name>', 'persona-vary | evol-instruct | back-translate', 'persona-vary')
    .option('--per-seed <n>', 'variants per seed example', '5')
    .option('--target-final <n>', 'final filtered count', '500')
    .option('--output <path>', 'JSONL output', './tmp/synthetic-training.jsonl')
    .action(async (opts) => {
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
      });
      const jsonl = result.finalExamples.map((e) => JSON.stringify(e)).join('\n');
      writeFileSync(opts.output, jsonl);
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
