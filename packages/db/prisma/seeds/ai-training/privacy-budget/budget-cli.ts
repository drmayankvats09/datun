// ═══════════════════════════════════════════════════════════════
// PRIVACY BUDGET CLI
//
// Subcommands:
//   epsilon:validate  — Asserts remaining ε > minimumThreshold (CI gate)
//   epsilon:report    — Prints composition report for a scope
//   epsilon:reset     — Admin-only; logs to audit trail
//
// Wired into: pnpm epsilon:* scripts in packages/db/package.json
// ═══════════════════════════════════════════════════════════════

import { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { trackComposition } from './composition-tracker';
import { logger } from '../../utils/logger';

const program = new Command();
const prisma = new PrismaClient();

program.name('datun-epsilon').description('Datun privacy budget management CLI').version('1.0.0');

program
  .command('validate')
  .description('Validate remaining ε for a scope (exits 1 if EXCEEDED)')
  .requiredOption('-s, --scope <scope>', 'Privacy budget scope key')
  .option('-d, --delta <delta>', 'Privacy parameter δ', '1e-5')
  .option('-m, --method <method>', 'Composition method', 'ADVANCED')
  .option('--threshold <epsilon>', 'Minimum remaining ε required', '0')
  .action(async (opts: { scope: string; delta: string; method: string; threshold: string }) => {
    try {
      const report = await trackComposition(prisma, {
        scope: opts.scope,
        delta: Number(opts.delta),
        method: opts.method as 'BASIC' | 'ADVANCED' | 'RENYI',
      });
      const threshold = Number(opts.threshold);
      if (report.remainingEpsilon < threshold) {
        logger.error(
          { scope: opts.scope, remaining: report.remainingEpsilon, threshold },
          'Privacy budget below threshold',
        );
        process.exit(1);
      }
      logger.info(report, 'Privacy budget OK');
    } catch (err: unknown) {
      logger.error({ err }, 'Validation failed');
      process.exit(2);
    } finally {
      await prisma.$disconnect();
    }
  });

program
  .command('report')
  .description('Print composition report for a scope')
  .requiredOption('-s, --scope <scope>', 'Privacy budget scope key')
  .option('-d, --delta <delta>', 'Privacy parameter δ', '1e-5')
  .option('-m, --method <method>', 'Composition method', 'ADVANCED')
  .action(async (opts: { scope: string; delta: string; method: string }) => {
    try {
      const report = await trackComposition(prisma, {
        scope: opts.scope,
        delta: Number(opts.delta),
        method: opts.method as 'BASIC' | 'ADVANCED' | 'RENYI',
      });
      console.log(JSON.stringify(report, null, 2));
    } finally {
      await prisma.$disconnect();
    }
  });

if (require.main === module) {
  program.parseAsync(process.argv).catch((err) => {
    logger.error({ err }, 'CLI fatal');
    process.exit(99);
  });
}

export { program };
