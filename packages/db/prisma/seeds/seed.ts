// ═══════════════════════════════════════════════════════════════
// SEED ENTRY POINT — Wave 4 v2
// Usage:
//   pnpm tsx packages/db/prisma/seeds/seed.ts
//   pnpm tsx packages/db/prisma/seeds/seed.ts --scenario=demo --dry-run
//   pnpm tsx packages/db/prisma/seeds/seed.ts --manifest
//   pnpm tsx packages/db/prisma/seeds/seed.ts --resume=<run-id>
//   pnpm tsx packages/db/prisma/seeds/seed.ts --include-categories=reference,identity
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { argsToOrchestratorOptions, parseCliArgs } from './modules/orchestrator/cli-bindings';
import { runMainOrchestrator } from './modules/orchestrator/main-orchestrator';

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const prisma = new PrismaClient();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('         Datun Seed — Wave 4 v2 SagaOrchestrator');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Scenario: ${args.scenario ?? 'demo'}`);
  console.log(`Env: ${args.env ?? process.env.NODE_ENV ?? 'development'}`);
  console.log(`Master seed: ${args.masterSeed ?? 42}`);
  console.log(`Dry run: ${args.dryRun}`);
  console.log(`Parallel: ${args.parallelExec}`);
  console.log(`Stop on error: ${args.stopOnError}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    const result = await runMainOrchestrator(argsToOrchestratorOptions(args, prisma));

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('         Run Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Run ID: ${result.runId}`);
    console.log(`Status: ${result.status}`);
    console.log(`Total modules: ${result.totalModules}`);
    console.log(`Completed: ${result.completedCount}`);
    console.log(`Skipped: ${result.skippedCount}`);
    console.log(`Failed: ${result.failedCount}`);
    console.log(`Compensated: ${result.compensatedCount}`);
    console.log(`Records created: ${result.totalRecordsCreated.toLocaleString()}`);
    console.log(`Total duration: ${(result.totalDurationMs / 1000).toFixed(2)}s`);
    console.log('═══════════════════════════════════════════════════════════════');

    process.exit(result.status === 'COMPLETED' ? 0 : 1);
  } catch (e) {
    console.error('💥 Seed orchestration failed:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
