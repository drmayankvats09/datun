// ═══════════════════════════════════════════════════════════════
// DAILY AGGREGATE FACTORY — Pre-computed metrics for dashboard speed
//
// DETERMINISM CONTRACT (Day 16 fix):
// `defaultTransient.date` MUST be a literal constant, NOT `new Date()`.
// JavaScript evaluates `defaultTransient` at module-load time, so a
// `new Date()` expression captures the load date as a frozen string.
// That frozen string mismatches snapshots taken on different calendar
// days. Production callers (daily-aggregates.module, time-travel
// composer) ALWAYS pass an explicit `transient.date`, so this default
// is only consumed by snapshot/contract tests where determinism wins.
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

/**
 * Canonical fixture date — chosen mid-month to avoid month/year-boundary
 * edge cases. Used ONLY when no `transient.date` is supplied (snapshot
 * tests, contract tests). All production code passes a real date.
 */
const FIXTURE_DATE = '2026-01-15';

interface DailyAggregateOutput {
  readonly id: string;
  readonly date: string;
  readonly clinicId: string | null;
  readonly newPatients: number;
  readonly returningPatients: number;
  readonly totalConsultations: number;
  readonly completedConsultations: number;
  readonly abandonedConsultations: number;
  readonly escalatedConsultations: number;
  readonly avgConsultationDurationMin: number;
  readonly totalAppointments: number;
  readonly noShowAppointments: number;
  readonly cancelledAppointments: number;
  readonly completedAppointments: number;
  readonly revenueInr: number;
  readonly newSubscriptions: number;
  readonly churnedSubscriptions: number;
  readonly totalAiCostUsd: number;
  readonly avgAiLatencyMs: number;
  readonly aiErrorCount: number;
  readonly whatsappSent: number;
  readonly whatsappDelivered: number;
  readonly whatsappRead: number;
  readonly supportTicketsOpened: number;
  readonly supportTicketsResolved: number;
  readonly avgPatientSatisfaction: number;
  readonly netPromoterScore: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface DailyAggregateTransient {
  readonly date: string;
  readonly clinicId?: string | null;
}

export const dailyAggregateFactory = defineFactory<DailyAggregateOutput, DailyAggregateTransient>({
  name: 'consultation' as 'consultation',
  defaultTransient: { date: FIXTURE_DATE },

  build: ({ sequence, faker, transient }) => {
    const totalConsultations = faker.number.int({ min: 5, max: 500 });
    const completed = Math.floor(totalConsultations * faker.number.float({ min: 0.7, max: 0.92 }));
    const abandoned = Math.floor(totalConsultations * faker.number.float({ min: 0.03, max: 0.12 }));
    const escalated = Math.floor(totalConsultations * faker.number.float({ min: 0.02, max: 0.08 }));

    return {
      id: `agg-${String(sequence).padStart(8, '0')}`,
      date: transient.date,
      clinicId: transient.clinicId ?? null,
      newPatients: faker.number.int({ min: 1, max: 100 }),
      returningPatients: faker.number.int({ min: 1, max: 200 }),
      totalConsultations,
      completedConsultations: completed,
      abandonedConsultations: abandoned,
      escalatedConsultations: escalated,
      avgConsultationDurationMin: faker.number.float({ min: 5, max: 25 }),
      totalAppointments: faker.number.int({ min: 0, max: 100 }),
      noShowAppointments: faker.number.int({ min: 0, max: 15 }),
      cancelledAppointments: faker.number.int({ min: 0, max: 10 }),
      completedAppointments: faker.number.int({ min: 0, max: 80 }),
      revenueInr: faker.number.int({ min: 0, max: 500000 }),
      newSubscriptions: faker.number.int({ min: 0, max: 5 }),
      churnedSubscriptions: faker.number.int({ min: 0, max: 3 }),
      totalAiCostUsd: faker.number.float({ min: 1, max: 200 }),
      avgAiLatencyMs: faker.number.int({ min: 800, max: 4000 }),
      aiErrorCount: faker.number.int({ min: 0, max: 20 }),
      whatsappSent: faker.number.int({ min: 0, max: 1000 }),
      whatsappDelivered: faker.number.int({ min: 0, max: 950 }),
      whatsappRead: faker.number.int({ min: 0, max: 800 }),
      supportTicketsOpened: faker.number.int({ min: 0, max: 20 }),
      supportTicketsResolved: faker.number.int({ min: 0, max: 18 }),
      avgPatientSatisfaction: faker.number.float({ min: 3.5, max: 4.9 }),
      netPromoterScore: faker.number.int({ min: 30, max: 80 }),
      createdAt: new Date(transient.date),
      updatedAt: new Date(),
    };
  },

  persist: async (agg) => agg,
});
