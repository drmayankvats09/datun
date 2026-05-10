import type { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { resolveStrategy, type StrategyName } from '../../strategies';
import { runMainOrchestrator } from '../../modules/orchestrator/main-orchestrator';

/**
 * Strategy name -> orchestrator scenario key.
 * SCENARIO_FILTERS in main-orchestrator only defines 4 keys: minimal/demo/load-test/full.
 * All 8 strategies must map to one of these. TypeScript exhaustiveness enforces correctness:
 * adding a new StrategyName without updating this mapper = compile error.
 */
function mapStrategyToScenario(name: StrategyName): 'minimal' | 'demo' | 'load-test' | 'full' {
  switch (name) {
    case 'minimal':
      return 'minimal';
    case 'demo':
      return 'demo';
    case 'staging':
      return 'demo';
    case 'load-test':
      return 'load-test';
    case 'e2e-test':
      return 'minimal';
    case 'perf-bench':
      return 'full';
    case 'regression':
      return 'demo';
    case 'recovery':
      return 'minimal';
    default: {
      const _exhaustive: never = name;
      throw new Error(`Unmapped strategy: ${String(_exhaustive)}`);
    }
  }
}

export function registerSeedCommand(program: Command): void {
  program
    .command('seed')
    .description('Run the orchestrator with a strategy preset')
    .option(
      '-s, --strategy <name>',
      'Strategy: minimal|demo|staging|load-test|e2e-test|perf-bench|regression',
      'demo',
    )
    .option('--seed <number>', 'Master RNG seed', '42')
    .option('--dry-run', 'Estimate without writing', false)
    .option('--manifest', 'Print module manifest first', false)
    .option('--parallel', 'Enable level-parallel execution', false)
    .option('--continue-on-error', 'Do not stop on module failure', false)
    .option('--no-compensate', 'Disable compensation rollback on failure')
    .option('--include-categories <csv>', 'Override included categories')
    .option('--exclude-categories <csv>', 'Override excluded categories')
    .option('--include-modules <csv>', 'Whitelist module names')
    .option('--exclude-modules <csv>', 'Blacklist module names')
    .option('--resume <runId>', 'Resume from a previous run checkpoint')
    .action(async (opts) => {
      const strategy = resolveStrategy(opts.strategy as StrategyName);
      const prisma = new PrismaClient();

      try {
        const result = await runMainOrchestrator({
          prisma,
          env: strategy.env,
          scenario: mapStrategyToScenario(strategy.name),
          masterSeed: opts.seed ? parseInt(opts.seed, 10) : (strategy.masterSeedOverride ?? 42),
          dryRun: opts.dryRun,
          parallelExec: opts.parallel || strategy.parallelExec,
          stopOnError: !opts.continueOnError && strategy.stopOnError,
          compensateOnFailure: opts.compensate !== false && strategy.compensateOnFailure,
          printManifestFirst: opts.manifest,
          includeCategories: opts.includeCategories?.split(',') ?? strategy.includeCategories,
          excludeCategories: opts.excludeCategories?.split(',') ?? strategy.excludeCategories,
          includeModuleNames: opts.includeModules?.split(','),
          excludeModuleNames: opts.excludeModules?.split(','),
          resumeFromRunId: opts.resume,
        });

        if ((program.opts() as { json?: boolean }).json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(
            `✓ Seed complete: ${result.status} (${result.totalRecordsCreated} records, ${(result.totalDurationMs / 1000).toFixed(1)}s)`,
          );
        }

        // Set exitCode (NOT process.exit) — let event loop drain so logs flush.
        // index.ts has flushAndExit() that does the actual termination.
        process.exitCode = result.status === 'COMPLETED' ? 0 : 1;
      } catch (err) {
        // Surface ANY error before process exits — CI was hiding these
        console.error(
          'Seed command FAILED:',
          err instanceof Error ? (err.stack ?? err.message) : String(err),
        );
        process.exitCode = 1;
        throw err;
      } finally {
        await prisma.$disconnect();
      }
    });
}
