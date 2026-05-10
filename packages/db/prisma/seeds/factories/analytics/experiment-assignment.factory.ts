// ═══════════════════════════════════════════════════════════════
// EXPERIMENT ASSIGNMENT FACTORY — Per-user A/B test variant
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

interface ExperimentAssignmentOutput {
  readonly id: string;
  readonly experimentKey: string;
  readonly userId: string;
  readonly anonymousId: string | null;
  readonly variantKey: string;
  readonly bucketHash: number;
  readonly assignmentReason: 'STICKY' | 'NEW_RANDOM' | 'OVERRIDE' | 'HOLDOUT';
  readonly metricExposed: boolean;
  readonly conversionEvents: readonly string[];
  readonly conversionValue: number;
  readonly assignedAt: Date;
  readonly firstExposureAt: Date | null;
  readonly lastExposureAt: Date | null;
  readonly exposureCount: number;
  readonly createdAt: Date;
}

interface ExperimentAssignmentTransient {
  readonly experimentKey: string;
  readonly userId: string;
  readonly variantKey?: string;
}

export const experimentAssignmentFactory = defineFactory<
  ExperimentAssignmentOutput,
  ExperimentAssignmentTransient
>({
  name: 'user' as 'user',
  defaultTransient: { experimentKey: 'unknown', userId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const variantKey =
      transient.variantKey ?? faker.helpers.arrayElement(['control', 'treatment_a', 'treatment_b']);
    const exposureCount = faker.number.int({ min: 0, max: 50 });

    return {
      id: `expass-${String(sequence).padStart(12, '0')}`,
      experimentKey: transient.experimentKey,
      userId: transient.userId,
      anonymousId: null,
      variantKey,
      bucketHash: faker.number.int({ min: 0, max: 99 }),
      assignmentReason: faker.helpers.weightedArrayElement([
        { weight: 70, value: 'NEW_RANDOM' as const },
        { weight: 20, value: 'STICKY' as const },
        { weight: 7, value: 'HOLDOUT' as const },
        { weight: 3, value: 'OVERRIDE' as const },
      ]),
      metricExposed: exposureCount > 0,
      conversionEvents: faker.helpers.arrayElements(
        ['signup', 'consultation_started', 'consultation_completed', 'appointment_booked'],
        { min: 0, max: 3 },
      ),
      conversionValue: faker.number.int({ min: 0, max: 5000 }),
      assignedAt: faker.date.recent({ days: 60 }),
      firstExposureAt: exposureCount > 0 ? faker.date.recent({ days: 50 }) : null,
      lastExposureAt: exposureCount > 0 ? faker.date.recent({ days: 1 }) : null,
      exposureCount,
      createdAt: new Date(),
    };
  },

  persist: async (assignment) => assignment,
});
