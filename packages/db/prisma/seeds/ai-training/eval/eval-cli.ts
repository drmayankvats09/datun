// ═══════════════════════════════════════════════════════════════
// EVAL CLI — datun-eval run / baseline
// ═══════════════════════════════════════════════════════════════
import { Command } from 'commander';
import { runEvalSuite, AnthropicAdapter } from './eval-runner';
import { compareToBaseline, promoteBaseline } from './regression-suite';
import { GOLDEN_CASES } from './golden-cases/golden-cases';
import { EXTENDED_GOLDEN_CASES } from './golden-cases/golden-cases-extended';
import { writeFileSync } from 'node:fs';

export function registerEvalCommand(program: Command): void {
  const evalCmd = program.command('eval').description('AI training evaluation pipeline');

  evalCmd
    .command('run')
    .description('Run eval suite against a model')
    .option('--model <name>', 'model name', 'claude-sonnet-4-6')
    .option('--model-id <id>', 'identifier for results', 'datun-current')
    .option('--output <path>', 'output JSON path', './eval-results.json')
    .option('--include-extended', 'include extended golden cases (50 total)', false)
    .action(async (opts) => {
      const cases = opts.includeExtended
        ? [...GOLDEN_CASES, ...EXTENDED_GOLDEN_CASES]
        : GOLDEN_CASES;
      const adapter = new AnthropicAdapter(opts.modelId, opts.model);
      const result = await runEvalSuite(cases, adapter);
      writeFileSync(opts.output, JSON.stringify(result, null, 2));
      console.log(
        `✓ Eval suite complete: ${result.aggregate.meanComposite.toFixed(3)} mean composite`,
      );
      console.log(
        `  Safety violations: ${(result.aggregate.safetyViolationRate * 100).toFixed(1)}%`,
      );
      console.log(`  Emergency missed: ${result.aggregate.emergencyMissedCount}`);
      const cmp = compareToBaseline(result);
      cmp.recommendations.forEach((r) => console.log(`  → ${r}`));
      process.exit(cmp.regressed ? 1 : 0);
    });

  evalCmd
    .command('baseline:promote')
    .description('Promote current eval result as new baseline')
    .option('--input <path>', 'input JSON path', './eval-results.json')
    .action((opts) => {
      const result = JSON.parse(require('node:fs').readFileSync(opts.input, 'utf8'));
      promoteBaseline(result);
      console.log(`✓ Baseline promoted for ${result.modelId}`);
    });
}
