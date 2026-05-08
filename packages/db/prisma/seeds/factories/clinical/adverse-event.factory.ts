// ═══════════════════════════════════════════════════════════════
// ADVERSE EVENT FACTORY — Side-effect reports from patients
// Critical for pharmacovigilance + DCI India reporting (CDSCO)
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type Severity = 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';
type Outcome =
  | 'RESOLVED'
  | 'RESOLVED_WITH_SEQUELAE'
  | 'ONGOING'
  | 'WORSENING'
  | 'HOSPITALIZED'
  | 'UNKNOWN';

interface AdverseEventOutput {
  readonly id: string;
  readonly prescriptionId: string;
  readonly patientId: string;
  readonly reportedBy: string;
  readonly suspectedSaltId: string;
  readonly reactionDescription: string;
  readonly reactionStartedAfterDays: number;
  readonly severity: Severity;
  readonly outcome: Outcome;
  readonly hospitalRequired: boolean;
  readonly hospitalName: string | null;
  readonly reportedToCdsco: boolean;
  readonly cdscoReportId: string | null;
  readonly aiCausalityScore: number;
  readonly clinicianAssessment: string | null;
  readonly preventiveAction: string | null;
  readonly reportedAt: Date;
  readonly resolvedAt: Date | null;
  readonly createdAt: Date;
}

interface AdverseEventTransient {
  readonly prescriptionId: string;
  readonly patientId: string;
  readonly suspectedSaltId: string;
}

export const adverseEventFactory = defineFactory<AdverseEventOutput, AdverseEventTransient>({
  name: 'prescription' as 'prescription',
  defaultTransient: { prescriptionId: 'unknown', patientId: 'unknown', suspectedSaltId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const severity = faker.helpers.weightedArrayElement([
      { weight: 65, value: 'MILD' as const },
      { weight: 25, value: 'MODERATE' as const },
      { weight: 8, value: 'SEVERE' as const },
      { weight: 2, value: 'LIFE_THREATENING' as const },
    ]);

    const outcome =
      severity === 'LIFE_THREATENING'
        ? faker.helpers.arrayElement(['HOSPITALIZED', 'RESOLVED_WITH_SEQUELAE'] as const)
        : severity === 'SEVERE'
          ? faker.helpers.arrayElement([
              'RESOLVED',
              'HOSPITALIZED',
              'RESOLVED_WITH_SEQUELAE',
            ] as const)
          : faker.helpers.weightedArrayElement([
              { weight: 70, value: 'RESOLVED' as const },
              { weight: 20, value: 'ONGOING' as const },
              { weight: 7, value: 'RESOLVED_WITH_SEQUELAE' as const },
              { weight: 3, value: 'WORSENING' as const },
            ]);

    return {
      id: `ae-${String(sequence).padStart(10, '0')}`,
      prescriptionId: transient.prescriptionId,
      patientId: transient.patientId,
      reportedBy: transient.patientId,
      suspectedSaltId: transient.suspectedSaltId,
      reactionDescription: faker.helpers.arrayElement([
        'Skin rash on hands and face',
        'Severe nausea and vomiting',
        'Diarrhea after starting medication',
        'Mouth ulcers worsened',
        'Difficulty breathing — went to ER',
        'Drowsiness affecting work',
        'Headache started 2 hours after dose',
        'Itching all over body',
      ]),
      reactionStartedAfterDays: faker.number.int({ min: 0, max: 14 }),
      severity,
      outcome,
      hospitalRequired:
        severity === 'LIFE_THREATENING' ||
        (severity === 'SEVERE' && faker.datatype.boolean({ probability: 0.5 })),
      hospitalName:
        severity === 'LIFE_THREATENING' || severity === 'SEVERE'
          ? faker.company.name() + ' Hospital'
          : null,
      reportedToCdsco: severity === 'SEVERE' || severity === 'LIFE_THREATENING',
      cdscoReportId:
        severity === 'SEVERE' || severity === 'LIFE_THREATENING'
          ? `CDSCO-${faker.string.alphanumeric(10).toUpperCase()}`
          : null,
      aiCausalityScore: faker.number.float({ min: 0.4, max: 0.99 }),
      clinicianAssessment:
        faker.helpers.maybe(() => 'Likely related to medication', { probability: 0.7 }) ?? null,
      preventiveAction: 'Drug discontinued, alternative prescribed',
      reportedAt: faker.date.recent({ days: 30 }),
      resolvedAt:
        outcome === 'RESOLVED' || outcome === 'RESOLVED_WITH_SEQUELAE'
          ? faker.date.recent({ days: 25 })
          : null,
      createdAt: new Date(),
    };
  },

  persist: async (event) => event,
});
