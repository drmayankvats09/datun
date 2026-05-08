import type { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { runMainOrchestrator } from '../../modules/orchestrator/main-orchestrator';
import { perfBenchStrategy } from '../../strategies';
import { getModuleSummary } from '../../modules/core/telemetry';

export function registerBenchCommand(program: Command): void {
  program
    .command('bench')
    .description('Run the perf-bench scenario and report p50/p95/p99 per module')
    .option('--seed <n>', 'Master seed', '42')
    .option('--iterations <n>', 'Repeat the run N times', '1')
    .action(async (opts) => {
      const prisma = new PrismaClient();
      try {
        const iters = Math.max(1, parseInt(opts.iterations, 10));
        for (let i = 0; i < iters; i++) {
          await runMainOrchestrator({
            prisma,
            env: 'staging',
            scenario: 'load-test' as const,
            masterSeed: parseInt(opts.seed, 10) + i,
            includeCategories: perfBenchStrategy.includeCategories,
            parallelExec: perfBenchStrategy.parallelExec,
          });
        }
        const summary = getModuleSummary();
        if ((program.opts() as { json?: boolean }).json) {
          console.log(JSON.stringify(summary, null, 2));
        } else {
          console.log('Module'.padEnd(40), 'p50', 'p95', 'p99', 'rec/s');
          for (const m of summary) {
            console.log(
              m.moduleName.padEnd(40),
              m.p50DurationMs.toFixed(0),
              m.p95DurationMs.toFixed(0),
              m.p99DurationMs.toFixed(0),
              m.avgRecordsPerSec.toFixed(0),
            );
          }
        }
      } finally {
        await prisma.$disconnect();
      }
    });
}
