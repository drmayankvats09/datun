// ═══════════════════════════════════════════════════════════════
// OUTBOX OPS CLI
//
// 3am-friendly debug + recovery surface for the outbox pattern.
// Subcommands:
//   status              — Aggregate counts (pending/published/failed/dead) by event type
//   list                — Recent events filtered by status/type/age
//   show <id>           — Full event payload + attempt history
//   replay-dlq          — Move dead-letter events back to outbox for retry
//   cleanup             — Delete old published events / archive old dead letters
//   stuck               — Find events with attemptCount >= maxAttempts but status != dead
//
// Wired into: pnpm outbox:* scripts in packages/db/package.json
//
// FAANG philosophy: ops must be possible without writing code at 3am.
// Reference: Stripe Wallaby + Linear ops scripts + Amazon SQS DLQ tools.
// ═══════════════════════════════════════════════════════════════

import { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { replayDeadLetters } from './dlq-replay';
import { cleanupPublishedOutbox, archiveDeadLetters } from './outbox-cleanup';
import { logger } from '../utils/logger';
import type { OutboxStatus, DatunEventType } from './outbox.types';

const program = new Command();

function makePrisma(): PrismaClient {
  return new PrismaClient();
}

program
  .name('datun-outbox')
  .description('Datun outbox operations CLI — status, replay, cleanup')
  .version('1.0.0');

// ─── status ───────────────────────────────────────────────────
program
  .command('status')
  .description('Aggregate counts by status × event type')
  .option('--json', 'Output JSON', false)
  .action(async (opts: { json: boolean }) => {
    const prisma = makePrisma();
    try {
      const counts = await prisma.outboxEvent.groupBy({
        by: ['status', 'eventType'],
        _count: true,
        orderBy: [{ status: 'asc' }, { eventType: 'asc' }],
      });
      const dlqCount = await prisma.outboxDeadLetter.count();
      const totalPending = await prisma.outboxEvent.count({ where: { status: 'pending' } });
      const oldestPending = await prisma.outboxEvent.findFirst({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true },
      });
      const oldestPendingAgeMs = oldestPending
        ? Date.now() - oldestPending.createdAt.getTime()
        : null;

      const summary = {
        pending: totalPending,
        oldestPendingAgeMinutes:
          oldestPendingAgeMs !== null ? Math.round(oldestPendingAgeMs / 60_000) : null,
        deadLetters: dlqCount,
        breakdown: counts,
      };

      if (opts.json) {
        console.log(JSON.stringify(summary, null, 2));
      } else {
        console.log(`📊 OUTBOX STATUS`);
        console.log(`   Pending:    ${summary.pending}`);
        console.log(
          `   Oldest pending age: ${summary.oldestPendingAgeMinutes !== null ? `${summary.oldestPendingAgeMinutes} min` : 'n/a'}`,
        );
        console.log(`   Dead letters: ${summary.deadLetters}`);
        console.log('');
        console.log(`   By status × type:`);
        for (const c of counts) {
          console.log(`     ${c.status.padEnd(10)} | ${c.eventType.padEnd(45)} | ${c._count}`);
        }
      }

      // Health gate: alert if oldest pending > 5 minutes (likely relay stuck)
      if (oldestPendingAgeMs !== null && oldestPendingAgeMs > 5 * 60_000) {
        logger.warn(
          { oldestPendingAgeMinutes: Math.round(oldestPendingAgeMs / 60_000) },
          'Oldest pending event > 5 min — relay may be stuck',
        );
      }
    } finally {
      await prisma.$disconnect();
    }
  });

// ─── list ─────────────────────────────────────────────────────
program
  .command('list')
  .description('List recent outbox events')
  .option('-s, --status <status>', 'Filter by status (pending|published|failed|dead)')
  .option('-t, --type <type>', 'Filter by event type')
  .option('-l, --limit <n>', 'Max rows', '50')
  .option('--json', 'Output JSON', false)
  .action(async (opts: { status?: string; type?: string; limit: string; json?: boolean }) => {
    const prisma = makePrisma();
    try {
      const where: { status?: OutboxStatus; eventType?: DatunEventType } = {};
      if (opts.status) where.status = opts.status as OutboxStatus;
      if (opts.type) where.eventType = opts.type as DatunEventType;

      const events = await prisma.outboxEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(opts.limit),
        select: {
          id: true,
          eventType: true,
          status: true,
          attemptCount: true,
          lastError: true,
          createdAt: true,
          publishedAt: true,
          aggregateId: true,
        },
      });

      if (opts.json) {
        console.log(JSON.stringify(events, null, 2));
      } else if (events.length === 0) {
        console.log('No matching events.');
      } else {
        for (const e of events) {
          const age = Math.round((Date.now() - e.createdAt.getTime()) / 60_000);
          console.log(
            `  ${e.id} | ${e.status.padEnd(10)} | ${e.eventType.padEnd(45)} | attempts=${e.attemptCount} | age=${age}m | ${e.lastError ? `err: ${e.lastError.slice(0, 50)}` : ''}`,
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
  .description('Full event details + payload')
  .action(async (id: string) => {
    const prisma = makePrisma();
    try {
      const event = await prisma.outboxEvent.findUnique({ where: { id } });
      if (!event) {
        const dlq = await prisma.outboxDeadLetter.findUnique({ where: { id } });
        if (!dlq) {
          console.error(`❌ Not found in outbox or DLQ: ${id}`);
          process.exit(1);
        }
        console.log('Found in DEAD-LETTER:');
        console.log(JSON.stringify(dlq, null, 2));
        return;
      }
      console.log(JSON.stringify(event, null, 2));
    } finally {
      await prisma.$disconnect();
    }
  });

// ─── replay-dlq ───────────────────────────────────────────────
program
  .command('replay-dlq')
  .description('Move dead-letter events back to outbox for retry')
  .option('-t, --aggregate-type <type>', 'Filter by aggregate type (e.g., Consultation)')
  .option('-l, --limit <n>', 'Max rows to replay', '100')
  .option('--reset-attempts', 'Reset attemptCount to 0 (gives full retry budget)', false)
  .option('--dry-run', 'Show what would be replayed without executing', false)
  .action(
    async (opts: {
      aggregateType?: string;
      limit: string;
      resetAttempts?: boolean;
      dryRun?: boolean;
    }) => {
      const prisma = makePrisma();
      try {
        if (opts.dryRun) {
          const candidates = await prisma.outboxDeadLetter.findMany({
            where: opts.aggregateType ? { aggregateType: opts.aggregateType } : {},
            take: Number(opts.limit),
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              eventType: true,
              aggregateType: true,
              aggregateId: true,
              attemptCount: true,
            },
          });
          console.log(`🔍 DRY RUN — would replay ${candidates.length} events:`);
          for (const c of candidates) {
            console.log(
              `  ${c.id} | ${c.eventType.padEnd(45)} | ${c.aggregateType}/${c.aggregateId}`,
            );
          }
          return;
        }

        const result = await replayDeadLetters(prisma, {
          aggregateType: opts.aggregateType,
          limit: Number(opts.limit),
          resetAttemptCount: opts.resetAttempts,
        });
        logger.info(result, 'DLQ replay complete');
        console.log(`✅ Replayed ${result.replayed} events.`);
      } catch (err) {
        logger.error({ err }, 'DLQ replay failed');
        process.exit(2);
      } finally {
        await prisma.$disconnect();
      }
    },
  );

// ─── cleanup ──────────────────────────────────────────────────
program
  .command('cleanup')
  .description('Delete old published events / archive old DLQ rows')
  .option('--published-older-than-days <n>', 'Published events older than N days', '14')
  .option('--archive-dlq-older-than-days <n>', 'DLQ rows older than N days', '90')
  .option('--dry-run', 'Show what would be deleted without executing', false)
  .action(
    async (opts: {
      publishedOlderThanDays: string;
      archiveDlqOlderThanDays: string;
      dryRun?: boolean;
    }) => {
      const prisma = makePrisma();
      try {
        const publishedDays = Number(opts.publishedOlderThanDays);
        const dlqDays = Number(opts.archiveDlqOlderThanDays);
        if (opts.dryRun) {
          const oldPublishedCount = await prisma.outboxEvent.count({
            where: {
              status: 'published',
              publishedAt: { lt: new Date(Date.now() - publishedDays * 86_400_000) },
            },
          });
          const oldDlqCount = await prisma.outboxDeadLetter.count({
            where: { createdAt: { lt: new Date(Date.now() - dlqDays * 86_400_000) } },
          });
          console.log(`🔍 DRY RUN:`);
          console.log(
            `  Would delete ${oldPublishedCount} published events older than ${publishedDays} days`,
          );
          console.log(`  Would archive ${oldDlqCount} DLQ rows older than ${dlqDays} days`);
          return;
        }
        const cleanResult = await cleanupPublishedOutbox(prisma, publishedDays);
        const archiveResult = await archiveDeadLetters(prisma, dlqDays);
        console.log(
          `✅ Cleanup: ${cleanResult.deleted} published events deleted, ${archiveResult.deleted} DLQ rows deleted.`,
        );
      } catch (err) {
        logger.error({ err }, 'Cleanup failed');
        process.exit(2);
      } finally {
        await prisma.$disconnect();
      }
    },
  );

// ─── stuck ────────────────────────────────────────────────────
program
  .command('stuck')
  .description('Find events with attemptCount >= max but status != dead (relay misconfig?)')
  .option('--max <n>', 'Max attempt threshold', '10')
  .action(async (opts: { max: string }) => {
    const prisma = makePrisma();
    try {
      const max = Number(opts.max);
      const stuck = await prisma.outboxEvent.findMany({
        where: {
          attemptCount: { gte: max },
          status: { in: ['pending', 'failed'] },
        },
        orderBy: { createdAt: 'asc' },
        take: 100,
        select: {
          id: true,
          eventType: true,
          status: true,
          attemptCount: true,
          lastError: true,
          createdAt: true,
        },
      });
      if (stuck.length === 0) {
        console.log('✅ No stuck events.');
        return;
      }
      console.log(`⚠️  ${stuck.length} stuck event(s):`);
      for (const e of stuck) {
        console.log(
          `  ${e.id} | ${e.eventType} | attempts=${e.attemptCount} | status=${e.status} | err: ${e.lastError ?? 'unknown'}`,
        );
      }
      console.log('');
      console.log(`Investigate: stuck events past max-attempts should normally be moved to DLQ.`);
      console.log(
        `Likely cause: relay process crashed mid-write or maxAttempts mismatched between code and DB.`,
      );
    } finally {
      await prisma.$disconnect();
    }
  });

// ─────────────────────────────────────────────────────────────────────
// Bundle-safe entry guard.
//
// Why not `require.main === module`:
// In tsup/esbuild CJS bundles (apps/worker/dist/index.js), every inlined
// module sees itself as require.main because the bundle is one physical
// CJS file. Result: program.parseAsync(process.argv) fires at worker
// boot, prints CLI help, exits 1. Production crash loop.
//
// This guard checks the actual entry script via process.argv[1]:
//   - tsx prisma/seeds/outbox/outbox-cli.ts ...  → matches ✓
//   - node dist/outbox-cli.js ...                → matches ✓
//   - node dist/index.js (worker bundle)         → does NOT match ✗
// ─────────────────────────────────────────────────────────────────────
const entryPath = process.argv[1] ?? '';
const isOutboxCliEntry = /(?:^|[\\/])outbox-cli\.(?:ts|mts|cts|js|mjs|cjs)$/i.test(entryPath);

if (isOutboxCliEntry) {
  program.parseAsync(process.argv).catch((err) => {
    logger.error({ err }, 'CLI fatal');
    process.exit(99);
  });
}

export { program };
