// ═══════════════════════════════════════════════════════════════
// DRIFT OPS CLI
//
// Subcommands:
//   detect           — Run full drift orchestration
//   detect <kind>    — Single drift kind (input | concept)
//   list             — Recent drift alerts
//   show <id>        — Full alert details
//   ack <id>         — Acknowledge
//   stats            — Aggregate counts
// ═══════════════════════════════════════════════════════════════

import { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { runDriftOrchestration, runSingleDriftKind } from './drift-orchestrator';
import { logger } from '../../utils/logger';
import type { DriftKind } from './drift.types';

const program = new Command();

function makePrisma(): PrismaClient {
  return new PrismaClient();
}

program
  .name('datun-drift')
  .description('Datun continuous-training drift detection ops CLI')
  .version('1.0.0');

// ─── detect ────────────────────────────────────────────────────
program
  .command('detect [kind]')
  .description('Run drift detection. Pass kind=input|concept for a single detector.')
  .option('--baseline-days <n>', 'Baseline window (days)', '30')
  .option('--comparison-days <n>', 'Comparison window (days)', '7')
  .option('--strict', 'Exit 1 if CRITICAL drift detected', false)
  .option('--no-persist', 'Skip persistence to DriftAlert table')
  .option('--json', 'Output JSON', false)
  .action(
    async (
      kind: string | undefined,
      opts: {
        baselineDays: string;
        comparisonDays: string;
        strict?: boolean;
        persist?: boolean;
        json?: boolean;
      },
    ) => {
      const prisma = makePrisma();
      try {
        const baselineDays = Number(opts.baselineDays);
        const comparisonDays = Number(opts.comparisonDays);

        if (kind) {
          const alert = await runSingleDriftKind(
            prisma,
            kind as DriftKind,
            baselineDays,
            comparisonDays,
          );
          if (opts.json) {
            console.log(JSON.stringify(alert, null, 2));
          } else if (alert) {
            console.log(`⚠️  Drift detected: ${alert.kind} | severity=${alert.severity}`);
            console.log(`   metric: ${alert.metric}`);
            console.log(`   action: ${alert.actionRequired}`);
          } else {
            console.log(`✅ No ${kind} drift detected.`);
          }
          if (opts.strict && alert?.severity === 'critical') {
            process.exit(1);
          }
          return;
        }

        const report = await runDriftOrchestration({
          prisma,
          baselineDays,
          comparisonDays,
          persistAlerts: opts.persist !== false,
          strict: opts.strict,
        });
        if (opts.json) {
          console.log(JSON.stringify(report, null, 2));
        } else {
          console.log(`📊 DRIFT REPORT — ${report.overallVerdict}`);
          console.log(`   runId: ${report.runId}`);
          console.log(`   duration: ${report.totalDurationMs}ms`);
          console.log(`   input drift:   ${report.layerSummaries.inputDrift.verdict}`);
          console.log(`   concept drift: ${report.layerSummaries.conceptDrift.verdict}`);
          if (report.alerts.length > 0) {
            console.log('');
            console.log(`   Alerts (${report.alerts.length}):`);
            for (const a of report.alerts) {
              console.log(`     [${a.severity}] ${a.kind}/${a.metric} — ${a.actionRequired}`);
            }
          }
        }
      } catch (err) {
        logger.error({ err }, 'Drift detection failed');
        process.exit(2);
      } finally {
        await prisma.$disconnect();
      }
    },
  );

// ─── list ─────────────────────────────────────────────────────
program
  .command('list')
  .description('List recent drift alerts')
  .option('-l, --limit <n>', 'Max rows', '20')
  .option('-s, --severity <s>', 'Filter by severity (info|warning|critical)')
  .option('-k, --kind <k>', 'Filter by kind (input|concept|embedding|output-distribution)')
  .option('--json', 'Output JSON', false)
  .action(async (opts: { limit: string; severity?: string; kind?: string; json?: boolean }) => {
    const prisma = makePrisma();
    try {
      const where: { severity?: string; kind?: string } = {};
      if (opts.severity) where.severity = opts.severity;
      if (opts.kind) where.kind = opts.kind;
      const alerts = await prisma.driftAlert.findMany({
        where,
        orderBy: { detectedAt: 'desc' },
        take: Number(opts.limit),
      });
      if (opts.json) {
        console.log(JSON.stringify(alerts, null, 2));
      } else if (alerts.length === 0) {
        console.log('No alerts found.');
      } else {
        for (const a of alerts) {
          const ageHrs = ((Date.now() - a.detectedAt.getTime()) / 3_600_000).toFixed(1);
          console.log(
            `  ${a.id} | ${a.severity.toUpperCase().padEnd(8)} | ${a.kind.padEnd(8)} | ${a.metric.padEnd(20)} | age ${ageHrs}h | ${a.actionRequired.slice(0, 60)}`,
          );
        }
      }
    } finally {
      await prisma.$disconnect();
    }
  });

// ─── show <id> ────────────────────────────────────────────────
program
  .command('show <id>')
  .description('Full alert details')
  .action(async (id: string) => {
    const prisma = makePrisma();
    try {
      const alert = await prisma.driftAlert.findUnique({ where: { id } });
      if (!alert) {
        console.error(`❌ Not found: ${id}`);
        process.exit(1);
      }
      console.log(JSON.stringify(alert, null, 2));
    } finally {
      await prisma.$disconnect();
    }
  });

// ─── ack <id> ─────────────────────────────────────────────────
program
  .command('ack <id>')
  .description('Acknowledge an alert (mark reviewed)')
  .requiredOption('-r, --reviewer <id>', 'Reviewer user ID')
  .option('-n, --note <text>', 'Reviewer note (logged, not stored — schema has no metadata field)')
  .action(async (id: string, opts: { reviewer: string; note?: string }) => {
    const prisma = makePrisma();
    try {
      const alert = await prisma.driftAlert.update({
        where: { id },
        data: {
          acknowledgedAt: new Date(),
          acknowledgedBy: opts.reviewer,
        },
      });
      logger.info(
        { id, reviewer: opts.reviewer, note: opts.note ?? null },
        'Drift alert acknowledged',
      );
      console.log(`✅ Acknowledged ${id}`);
      if (opts.note) {
        console.log(`   Note (logged only): ${opts.note}`);
      }
    } catch (err) {
      logger.error({ err, id }, 'Acknowledgment failed');
      process.exit(2);
    } finally {
      await prisma.$disconnect();
    }
  });

// ─── stats ─────────────────────────────────────────────────────
program
  .command('stats')
  .description('Aggregate alert counts by kind × severity (last 30 days)')
  .action(async () => {
    const prisma = makePrisma();
    try {
      const since = new Date(Date.now() - 30 * 86_400_000);
      const stats = await prisma.driftAlert.groupBy({
        by: ['kind', 'severity'],
        _count: true,
        where: { detectedAt: { gte: since } },
        orderBy: [{ kind: 'asc' }, { severity: 'asc' }],
      });
      const acked = await prisma.driftAlert.count({
        where: { acknowledgedAt: { not: null }, detectedAt: { gte: since } },
      });
      const unacked = await prisma.driftAlert.count({
        where: { acknowledgedAt: null, detectedAt: { gte: since } },
      });
      console.log(`📈 DRIFT STATS — last 30 days`);
      console.log(`   acknowledged:   ${acked}`);
      console.log(`   unacknowledged: ${unacked}`);
      console.log('');
      for (const s of stats) {
        console.log(`   ${s.kind.padEnd(10)} | ${s.severity.padEnd(10)} | ${s._count}`);
      }
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
