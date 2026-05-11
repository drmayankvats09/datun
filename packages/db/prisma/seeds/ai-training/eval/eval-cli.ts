// packages/db/prisma/seeds/ai-training/eval/eval-cli.ts
// ═══════════════════════════════════════════════════════════════
// EVAL CLI — datun-eval run / baseline
// FAANG-grade: every flag in workflow YAMLs MUST exist here.
// ═══════════════════════════════════════════════════════════════
import { Command } from 'commander';
import { runEvalSuite, AnthropicAdapter } from './eval-runner';
import { compareToBaseline, promoteBaseline } from './regression-suite';
import { GOLDEN_CASES } from './golden-cases/golden-cases';
import { EXTENDED_GOLDEN_CASES } from './golden-cases/golden-cases-extended';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';

type SuiteName = 'golden' | 'extended' | 'all';

function selectCases(suite: SuiteName): typeof GOLDEN_CASES {
  switch (suite) {
    case 'golden':
      return GOLDEN_CASES;
    case 'extended':
      return EXTENDED_GOLDEN_CASES;
    case 'all':
      return [...GOLDEN_CASES, ...EXTENDED_GOLDEN_CASES];
    default: {
      const _exhaustive: never = suite;
      throw new Error(`Unknown suite: ${String(_exhaustive)}`);
    }
  }
}

export function registerEvalCommand(program: Command): void {
  const evalCmd = program.command('eval').description('AI training evaluation pipeline');

  evalCmd
    .command('run')
    .description('Run eval suite against a model')
    .option('--model <name>', 'model name', 'claude-sonnet-4-6')
    .option('--model-id <id>', 'identifier for results', 'datun-current')
    .option('--suite <name>', 'golden | extended | all', 'golden')
    .option(
      '--include-extended',
      '[deprecated: use --suite all] include extended golden cases',
      false,
    )
    .option('--compare-baseline', 'fail (exit 1) if regression detected vs baseline', false)
    .option('--output <path>', 'output JSON path', './tmp/eval-results.json')
    .action(async (opts) => {
      // FAANG: validate suite arg up front (commander does not enforce enum natively)
      const suite = (opts.suite as string).toLowerCase() as SuiteName;
      if (!['golden', 'extended', 'all'].includes(suite)) {
        throw new Error(`--suite must be one of: golden | extended | all (got: ${opts.suite})`);
      }
      // Back-compat: legacy --include-extended → suite=all
      const effectiveSuite: SuiteName = opts.includeExtended ? 'all' : suite;
      const cases = selectCases(effectiveSuite);

      if (cases.length === 0) {
        throw new Error(`Suite "${effectiveSuite}" returned 0 cases — check golden-cases data`);
      }

      console.log(
        `▶ Running eval: model=${opts.model} suite=${effectiveSuite} cases=${cases.length}`,
      );

      const adapter = new AnthropicAdapter(opts.modelId, opts.model);
      const result = await runEvalSuite(cases, adapter);

      // FAANG: ensure parent dir exists (CI tmp/ doesn't pre-exist)
      mkdirSync(dirname(opts.output), { recursive: true });
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

      // FAANG: only exit 1 if --compare-baseline AND regression. Otherwise informational.
      const shouldFailOnRegression = opts.compareBaseline === true;
      if (shouldFailOnRegression && cmp.regressed) {
        console.error('✗ Regression detected — failing per --compare-baseline');
        process.exit(1);
      }
      process.exit(0);
    });

  evalCmd
    .command('baseline:promote')
    .description('Promote current eval result as new baseline')
    .option('--input <path>', 'input JSON path', './tmp/eval-results.json')
    .action((opts) => {
      const result = JSON.parse(readFileSync(opts.input, 'utf8'));
      promoteBaseline(result);
      console.log(`✓ Baseline promoted for ${result.modelId}`);
    });
}
