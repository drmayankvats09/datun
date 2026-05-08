// ═══════════════════════════════════════════════════════════════
// DRIFT CLI HOOK — registers `validate drift` subcommand
// ═══════════════════════════════════════════════════════════════
import { Command } from 'commander';
import { detectDrift } from './prisma-drift';

export function registerDriftCommand(program: Command): void {
  program
    .command('drift')
    .description('Detect Prisma↔DB schema drift')
    .option('--database-url <url>', 'database URL', process.env.DATABASE_URL)
    .action((opts) => {
      const r = detectDrift(opts.databaseUrl);
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.driftDetected ? 1 : 0);
    });
}
