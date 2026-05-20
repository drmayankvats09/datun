// apps/api/src/crons/flag-hygiene.cron.ts
// ═══════════════════════════════════════════════════════════════
// CRON: Flag Hygiene (daily 03:00 IST) — Task #49
// ─────────────────────────────────────────────────────────────────
// Combats "flag debt" — the entropy that creeps into a flag platform
// when nobody owns cleanup. Two responsibilities, one schedule:
//
//   A. STALE-DETECTION   (alert only)
//      Find every active flag where `staleAt <= now`. Group by
//      category. Send a single ops digest so admins can decide:
//      "remove the flag and inline the feature" vs "extend staleAt".
//
//   B. ARCHIVE PURGE     (delete after grace period)
//      Hard-delete archived flags whose `archivedAt` is older than
//      180 days. By that point the flag's removal has shipped on
//      every running version of every Datun client (mobile +
//      browser) — keeping the row only invites accidental revival.
//
// Why a single cron and not two:
//   They run on the same cadence (daily), need the same lock, and
//   share the digest email. Splitting buys nothing.
//
// Concurrency:
//   `withCronLock('flag-hygiene', handler, 600)` ensures only one
//   API replica runs it per day (memory rule #5 — no SPOF).
//
// Tested in Phase D — see `__tests__/crons/flag-hygiene.test.ts`.
//
// Reference patterns:
//   - LaunchDarkly "flag debt" cleanup playbook
//   - Uber's "experiment graveyard" tracker
//   - Stripe's `flag-reaper` internal cron
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@repo/db';
import { logger } from '../lib/logger.js';
import { alertAdmin } from '../services/alert.service.js';
import { publishFlagInvalidation, flagCacheService } from '../services/flag/index.js';

/** Grace period before an archived flag is physically removed. */
const ARCHIVE_GRACE_DAYS = 180;

interface StaleSummary {
  readonly flagKey: string;
  readonly name: string;
  readonly category: string;
  readonly status: string;
  readonly staleAt: Date;
  readonly daysOverdue: number;
}

export async function runFlagHygiene(): Promise<void> {
  const now = new Date();

  // ── A. Stale flag detection ────────────────────────────────────
  let staleFlags: StaleSummary[] = [];
  try {
    const rows = await prisma.featureFlag.findMany({
      where: {
        archivedAt: null,
        staleAt: { not: null, lte: now },
      },
      select: {
        flagKey: true,
        name: true,
        category: true,
        status: true,
        staleAt: true,
      },
      orderBy: { staleAt: 'asc' },
      take: 500,
    });

    staleFlags = rows
      .filter((r): r is typeof r & { staleAt: Date } => r.staleAt !== null)
      .map((r) => ({
        flagKey: r.flagKey,
        name: r.name,
        category: r.category,
        status: r.status,
        staleAt: r.staleAt,
        daysOverdue: Math.max(0, Math.floor((now.getTime() - r.staleAt.getTime()) / 86_400_000)),
      }));

    if (staleFlags.length > 0) {
      logger.warn(`[flag-hygiene] ${staleFlags.length} stale flags detected`);
      const lines = staleFlags
        .slice(0, 25)
        .map((f) => `  • ${f.flagKey} [${f.category}/${f.status}] — ${f.daysOverdue} days overdue`)
        .join('\n');
      const truncatedNote =
        staleFlags.length > 25 ? `\n  ... and ${staleFlags.length - 25} more` : '';

      await alertAdmin(
        'WARNING',
        `[flag-hygiene] ${staleFlags.length} flags overdue for review`,
        `These flags passed their \`staleAt\` review date. Triage each:\n\n${lines}${truncatedNote}\n\nFor each, either:\n  1) Remove the flag and inline the feature (preferred), OR\n  2) Extend \`staleAt\` via PATCH /api/admin/flags/<key>.`,
        { alertKey: 'flag-hygiene:stale', cooldownMin: 24 * 60 },
      );
    }
  } catch (err) {
    logger.error('[flag-hygiene] stale detection failed', {
      error: (err as Error).message,
    });
    // Continue to purge step — independent failure modes.
  }

  // ── B. Archive purge ───────────────────────────────────────────
  let purged = 0;
  try {
    const cutoff = new Date(now.getTime() - ARCHIVE_GRACE_DAYS * 86_400_000);
    const purgeCandidates = await prisma.featureFlag.findMany({
      where: { archivedAt: { lte: cutoff } },
      select: { id: true, flagKey: true, archivedAt: true },
      take: 200,
    });

    for (const f of purgeCandidates) {
      try {
        // FK cascade drops associated override rows in the same
        // transaction. Audit rows live forever (sampled telemetry).
        await prisma.featureFlag.delete({ where: { id: f.id } });
        await flagCacheService.invalidateFlag(f.flagKey);
        await publishFlagInvalidation(f.flagKey);
        purged++;
        logger.info('[flag-hygiene] purged', {
          flagKey: f.flagKey,
          archivedAt: f.archivedAt?.toISOString(),
        });
      } catch (err) {
        logger.warn('[flag-hygiene] purge failed for one flag', {
          flagKey: f.flagKey,
          error: (err as Error).message,
        });
      }
    }

    if (purged > 0) {
      logger.info(`[flag-hygiene] purge complete`, { purged });
    }
  } catch (err) {
    logger.error('[flag-hygiene] purge step failed', { error: (err as Error).message });
  }

  logger.info('[flag-hygiene] tick complete', {
    staleDetected: staleFlags.length,
    purged,
  });
}
