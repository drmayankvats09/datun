// ═══════════════════════════════════════════════════════════════
// QUARANTINE MANUAL REVIEW CLI
//
// Admin tool for reviewing rows quarantined by data-quality layer.
// Subcommands:
//   list          — List pending quarantine rows (filtered by table)
//   show <id>     — Show full row + violation details
//   promote <id>  — Manually approve (unquarantine + restore source row)
//   reject <id>   — Mark as permanent garbage (sets status='rejected')
//   remediate    — Run auto-remediator across all pending rows
//   stats         — Aggregate counts by table + severity + age
//
// Wired into: pnpm dq:quarantine:* scripts in packages/db/package.json
// ═══════════════════════════════════════════════════════════════

import { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { listPendingQuarantine, attemptAutoRemediation } from './index';
import { logger } from '../../utils/logger';

const program = new Command();

function makePrisma(): PrismaClient {
  return new PrismaClient();
}

program
  .name('datun-dq-quarantine')
  .description('Manage rows quarantined by Datun data-quality layer')
  .version('1.0.0');

program
  .command('list')
  .description('List pending quarantine rows')
  .option('-t, --table <name>', 'Filter to a specific source table')
  .option('-l, --limit <n>', 'Max rows to return', '50')
  .option('--json', 'Output JSON instead of table format')
  .action(async (opts: { table?: string; limit: string; json?: boolean }) => {
    const prisma = makePrisma();
    try {
      const rows = await listPendingQuarantine(prisma, opts.table, Number(opts.limit));
      if (opts.json) {
        console.log(JSON.stringify(rows, null, 2));
      } else {
        if (rows.length === 0) {
          console.log('✅ No pending quarantine rows.');
        } else {
          console.log(`📋 ${rows.length} pending row(s):`);
          for (const r of rows) {
            const ageHrs = ((Date.now() - r.createdAt.getTime()) / 3_600_000).toFixed(1);
            console.log(
              `  ${r.id} | ${r.sourceTable} | ${r.severity.toUpperCase()} | age ${ageHrs}h | ${r.reason.slice(0, 60)}`,
            );
          }
        }
      }
    } finally {
      await prisma.$disconnect();
    }
  });

program
  .command('show <id>')
  .description('Show full row payload + violation context')
  .action(async (id: string) => {
    const prisma = makePrisma();
    try {
      const row = await prisma.quarantinedRow.findUnique({ where: { id } });
      if (!row) {
        console.error(`❌ Quarantined row not found: ${id}`);
        process.exit(1);
      }
      console.log(JSON.stringify(row, null, 2));
    } finally {
      await prisma.$disconnect();
    }
  });

program
  .command('promote <id>')
  .description('Manually approve and restore the row to its source table')
  .requiredOption('-r, --reviewer <id>', 'Reviewer user ID for audit trail')
  .option('-n, --note <text>', 'Reviewer note')
  .action(async (id: string, opts: { reviewer: string; note?: string }) => {
    const prisma = makePrisma();
    try {
      const row = await prisma.quarantinedRow.findUnique({ where: { id } });
      if (!row) {
        console.error(`❌ Quarantined row not found: ${id}`);
        process.exit(1);
      }
      if (row.status !== 'pending') {
        console.error(`❌ Row already in status: ${row.status}`);
        process.exit(1);
      }
      // Restore: write back to source table + mark quarantine remediated
      await prisma.$transaction(async (tx) => {
        const delegate = (
          tx as unknown as Record<
            string,
            { create: (args: { data: Record<string, unknown> }) => Promise<unknown> }
          >
        )[lcFirst(row.sourceTable)];
        if (!delegate) throw new Error(`Unknown source table: ${row.sourceTable}`);
        await delegate.create({ data: row.payload as Record<string, unknown> });
        await tx.quarantinedRow.update({
          where: { id },
          data: {
            status: 'promoted',
            remediatedAt: new Date(),
            remediatedBy: opts.reviewer,
          },
        });
      });
      logger.info({ id, reviewer: opts.reviewer, note: opts.note }, 'Quarantine row promoted');
      console.log(`✅ Row ${id} promoted to ${row.sourceTable}`);
    } catch (err) {
      logger.error({ err, id }, 'Promotion failed');
      process.exit(2);
    } finally {
      await prisma.$disconnect();
    }
  });

program
  .command('reject <id>')
  .description('Mark row as permanent garbage (will not be retried)')
  .requiredOption('-r, --reviewer <id>', 'Reviewer user ID')
  .requiredOption('-w, --reason <text>', 'Why this row is rejected')
  .action(async (id: string, opts: { reviewer: string; reason: string }) => {
    const prisma = makePrisma();
    try {
      const row = await prisma.quarantinedRow.findUnique({ where: { id } });
      if (!row) {
        console.error(`❌ Not found: ${id}`);
        process.exit(1);
      }
      await prisma.quarantinedRow.update({
        where: { id },
        data: {
          status: 'rejected',
          remediatedAt: new Date(),
          remediatedBy: opts.reviewer,
          reason: `${row.reason}\n\nREJECTED by ${opts.reviewer}: ${opts.reason}`,
        },
      });
      logger.info({ id, reviewer: opts.reviewer, reason: opts.reason }, 'Quarantine row rejected');
      console.log(`✅ Row ${id} rejected.`);
    } finally {
      await prisma.$disconnect();
    }
  });

program
  .command('remediate')
  .description('Run auto-remediator on all pending rows')
  .option('-l, --limit <n>', 'Max rows to process', '100')
  .action(async (opts: { limit: string }) => {
    const prisma = makePrisma();
    try {
      const results = await attemptAutoRemediation(prisma, Number(opts.limit));
      const promoted = results.filter((r) => r.applied).length;
      const skipped = results.filter((r) => !r.applied).length;
      console.log(
        `✅ Auto-remediation complete: ${promoted} promoted, ${skipped} skipped, ${results.length} total.`,
      );
      if (skipped > 0) {
        console.log('');
        console.log('Skipped rows:');
        for (const r of results.filter((x) => !x.applied).slice(0, 10)) {
          console.log(`  ${r.quarantineId}: ${r.reason ?? 'unknown'}`);
        }
      }
    } finally {
      await prisma.$disconnect();
    }
  });

program
  .command('stats')
  .description('Aggregate quarantine statistics')
  .action(async () => {
    const prisma = makePrisma();
    try {
      const byTable = await prisma.quarantinedRow.groupBy({
        by: ['sourceTable', 'severity', 'status'],
        _count: true,
      });
      console.log(JSON.stringify(byTable, null, 2));
    } finally {
      await prisma.$disconnect();
    }
  });

function lcFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

if (require.main === module) {
  program.parseAsync(process.argv).catch((err) => {
    logger.error({ err }, 'CLI fatal');
    process.exit(99);
  });
}

export { program };
