// ═══════════════════════════════════════════════════════════════
// TIME-TRAVEL COMPOSER — Generate historical data for analytics demo
// Creates realistic 6/12/24-month history with Pareto + festival surges
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';
import { dailyAggregateFactory } from '../analytics/daily-aggregate.factory';
import { cohortTableFactory } from '../analytics/cohort-table.factory';
import { festivalSurgeFactor } from '../distributions/distributions';
import { bulkInsert } from '../core/bulk-insert';

export interface TimeTravelOptions {
  readonly daysBack: number;
  readonly clinicIds?: readonly string[];
  readonly generateCohorts?: boolean;
}

export async function generateHistoricalAnalytics(
  prisma: PrismaClient,
  opts: TimeTravelOptions,
): Promise<{ aggregatesCreated: number; cohortsCreated: number }> {
  const { daysBack, clinicIds = [], generateCohorts = true } = opts;

  // Generate daily aggregates per day per clinic
  const aggregates: ReturnType<typeof dailyAggregateFactory.build>[] = [];
  const today = new Date();

  for (let dayOffset = daysBack; dayOffset >= 0; dayOffset--) {
    const day = new Date(today.getTime() - dayOffset * 86400000);
    const dateStr = day.toISOString().slice(0, 10);
    const surgeFactor = festivalSurgeFactor(day);

    if (clinicIds.length === 0) {
      const agg = dailyAggregateFactory.build(undefined, { date: dateStr });
      // Apply surge
      const adjusted = {
        ...agg,
        totalConsultations: Math.floor(agg.totalConsultations * surgeFactor),
        revenueInr: Math.floor(agg.revenueInr * surgeFactor),
      };
      aggregates.push(adjusted);
    } else {
      for (const clinicId of clinicIds) {
        const agg = dailyAggregateFactory.build(undefined, { date: dateStr, clinicId });
        aggregates.push({
          ...agg,
          totalConsultations: Math.floor(agg.totalConsultations * surgeFactor),
          revenueInr: Math.floor(agg.revenueInr * surgeFactor),
        });
      }
    }
  }

  // Bulk insert aggregates (fastest path — Prisma createMany batched)
  let aggregatesCreated = 0;
  const aggregateModel = (prisma as unknown as Record<string, unknown>).dailyAggregate;
  if (aggregateModel) {
    const result = await bulkInsert(prisma, 'dailyAggregate' as keyof PrismaClient, aggregates, {
      batchSize: 1000,
    });
    aggregatesCreated = result.totalInserted;
  }

  // Generate retention cohorts (one per month back)
  let cohortsCreated = 0;
  if (generateCohorts) {
    const cohorts: ReturnType<typeof cohortTableFactory.build>[] = [];
    const monthsBack = Math.ceil(daysBack / 30);
    for (let m = 0; m < monthsBack; m++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
      cohorts.push(
        cohortTableFactory.build(undefined, { cohortMonth: monthDate.toISOString().slice(0, 7) }),
      );
    }
    const cohortModel = (prisma as unknown as Record<string, unknown>).cohortTable;
    if (cohortModel) {
      const result = await bulkInsert(prisma, 'cohortTable' as keyof PrismaClient, cohorts, {
        batchSize: 100,
      });
      cohortsCreated = result.totalInserted;
    }
  }

  return { aggregatesCreated, cohortsCreated };
}
