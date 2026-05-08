// ═══════════════════════════════════════════════════════════════
// COHORT TABLE FACTORY — Retention cohort matrix
//
// DETERMINISM CONTRACT (Day 16 fix):
// `defaultTransient.cohortMonth` MUST be a literal constant. Using
// `new Date().toISOString().slice(0, 7)` captures the load-month
// (e.g. '2026-05') and silently breaks the snapshot at month rollover.
// Production callers (retention-cohorts.module, flags-experiments
// module, time-travel composer) ALWAYS pass an explicit cohortMonth,
// so this default is only consumed by snapshot/contract tests.
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

/**
 * Canonical fixture cohort month — chosen to align with the snapshot
 * test's frozen instant (2026-01-15). Matches the ISO YYYY-MM slice.
 */
const FIXTURE_COHORT_MONTH = '2026-01';

interface CohortTableOutput {
  readonly id: string;
  readonly cohortMonth: string;
  readonly cohortType: 'PATIENT_REGISTRATION' | 'CLINIC_SIGNUP' | 'FEATURE_ACTIVATION';
  readonly initialUsers: number;
  readonly week1Retained: number;
  readonly week2Retained: number;
  readonly week4Retained: number;
  readonly week8Retained: number;
  readonly week12Retained: number;
  readonly week24Retained: number;
  readonly week52Retained: number;
  readonly week1RetentionRate: number;
  readonly week4RetentionRate: number;
  readonly week12RetentionRate: number;
  readonly week52RetentionRate: number;
  readonly avgLifetimeValueInr: number;
  readonly avgConsultationsPerUser: number;
  readonly cumulativeRevenueInr: number;
  readonly metadata: object;
  readonly computedAt: Date;
  readonly createdAt: Date;
}

interface CohortTableTransient {
  readonly cohortMonth: string;
  readonly cohortType?: 'PATIENT_REGISTRATION' | 'CLINIC_SIGNUP' | 'FEATURE_ACTIVATION';
}

export const cohortTableFactory = defineFactory<CohortTableOutput, CohortTableTransient>({
  name: 'patient' as 'patient',
  defaultTransient: { cohortMonth: FIXTURE_COHORT_MONTH },

  build: ({ sequence, faker, transient }) => {
    const initialUsers = faker.number.int({ min: 50, max: 5000 });
    const w1 = Math.floor(initialUsers * faker.number.float({ min: 0.5, max: 0.85 }));
    const w2 = Math.floor(w1 * faker.number.float({ min: 0.7, max: 0.95 }));
    const w4 = Math.floor(w2 * faker.number.float({ min: 0.65, max: 0.9 }));
    const w8 = Math.floor(w4 * faker.number.float({ min: 0.7, max: 0.95 }));
    const w12 = Math.floor(w8 * faker.number.float({ min: 0.7, max: 0.95 }));
    const w24 = Math.floor(w12 * faker.number.float({ min: 0.7, max: 0.95 }));
    const w52 = Math.floor(w24 * faker.number.float({ min: 0.6, max: 0.9 }));

    return {
      id: `cohort-${String(sequence).padStart(8, '0')}`,
      cohortMonth: transient.cohortMonth,
      cohortType: transient.cohortType ?? 'PATIENT_REGISTRATION',
      initialUsers,
      week1Retained: w1,
      week2Retained: w2,
      week4Retained: w4,
      week8Retained: w8,
      week12Retained: w12,
      week24Retained: w24,
      week52Retained: w52,
      week1RetentionRate: w1 / initialUsers,
      week4RetentionRate: w4 / initialUsers,
      week12RetentionRate: w12 / initialUsers,
      week52RetentionRate: w52 / initialUsers,
      avgLifetimeValueInr: faker.number.int({ min: 500, max: 25000 }),
      avgConsultationsPerUser: faker.number.float({ min: 1.2, max: 8.5 }),
      cumulativeRevenueInr: initialUsers * faker.number.int({ min: 200, max: 8000 }),
      metadata: {},
      computedAt: new Date(),
      createdAt: new Date(),
    };
  },

  persist: async (cohort) => cohort,
});
