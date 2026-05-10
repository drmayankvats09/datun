// ═══════════════════════════════════════════════════════════════
// WAVE 6 CLI COMMANDS — register all into Commander root
// Called from cli/index.ts
// ═══════════════════════════════════════════════════════════════
import type { Command } from 'commander';
import { registerTenantCommand } from '../multi-tenant/tenant-cli';
import { registerDriftCommand } from '../drift-detector/cli-hook';
import { verifyAll } from '../probes';
import { runDrDrill } from '../dr-replica';
import { verifyAuditChain } from '../audit-db/audit-verifier';
import { applyRetentionPolicy } from '../audit-db/retention-policy';
import { PrismaClient } from '@prisma/client';

export function registerWave6Commands(program: Command): void {
  registerTenantCommand(program);
  registerDriftCommand(program);

  program
    .command('probes')
    .description('Run live verification probes for all dependencies')
    .option('--names <names...>', 'subset of probes to run')
    .action(async (opts) => {
      const { verifyByName } = await import('../probes/index.js');
      const r = opts.names ? await verifyByName(opts.names) : await verifyAll();
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.overallStatus === 'red' ? 1 : 0);
    });

  program
    .command('audit')
    .description('Audit log operations')
    .addCommand(
      new (program.constructor as typeof Command)('verify')
        .argument('<runId>', 'run ID to verify')
        .action(async (runId: string) => {
          const prisma = new PrismaClient();
          try {
            const r = await verifyAuditChain(prisma, runId);
            console.log(JSON.stringify(r, null, 2));
            process.exit(r.passed ? 0 : 1);
          } finally {
            await prisma.$disconnect();
          }
        }),
    )
    .addCommand(
      new (program.constructor as typeof Command)('retain')
        .description('Apply retention policy (HOT→WARM→ARCHIVED)')
        .action(async () => {
          const prisma = new PrismaClient();
          try {
            const r = await applyRetentionPolicy(prisma);
            console.log(JSON.stringify(r, null, 2));
          } finally {
            await prisma.$disconnect();
          }
        }),
    );

  program
    .command('dr-drill')
    .description('Run DR drill (defaults to dry-run)')
    .option('--no-dry-run', 'execute real restore')
    .option('--bucket <name>', 'S3 bucket for snapshots')
    .option('--target-url <url>', 'target database URL', process.env.DATABASE_URL)
    .option('--rto <seconds>', 'RTO target seconds', '1800')
    .action(async (opts) => {
      const r = await runDrDrill({
        dryRun: opts.dryRun !== false,
        bucket: opts.bucket ?? process.env.AWS_S3_EXPORT_BUCKET!,
        targetUrl: opts.targetUrl,
        rtoTarget: Number(opts.rto),
      });
      console.log(JSON.stringify(r, null, 2));
      process.exit(r.passed ? 0 : 1);
    });
}
