import type { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { resolveStrategy, type StrategyName } from '../../strategies';
import { runMainOrchestrator } from '../../modules/orchestrator/main-orchestrator';

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
          scenario: (strategy.name === 'staging' ? 'demo' : strategy.name) as
            | 'minimal'
            | 'demo'
            | 'load-test'
            | 'full',
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
        process.exit(result.status === 'COMPLETED' ? 0 : 1);
      } finally {
        await prisma.$disconnect();
      }
    });
}
