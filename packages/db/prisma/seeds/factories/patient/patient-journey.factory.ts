// ═══════════════════════════════════════════════════════════════
// PATIENT JOURNEY FACTORY — Multi-year lifecycle simulation
//
// One patient → realistic 5-year journey with consultations
// distributed via Pareto, mapped to age progression + chronic
// conditions + acute incidents.
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';
import { realisticTimestamp } from '../distributions/distributions';

type JourneyStage =
  | 'FIRST_VISIT'
  | 'EXPLORATORY'
  | 'TREATMENT_ACTIVE'
  | 'MAINTENANCE'
  | 'CHRONIC_CARE'
  | 'GRADUATED'
  | 'CHURNED';

interface PatientJourneyOutput {
  readonly id: string;
  readonly patientId: string;
  readonly currentStage: JourneyStage;
  readonly firstConsultationAt: Date;
  readonly lastConsultationAt: Date;
  readonly totalConsultations: number;
  readonly totalAppointments: number;
  readonly totalSpendInr: number;
  readonly avgConsultationGapDays: number;
  readonly preferredDoctor: string | null;
  readonly preferredClinic: string | null;
  readonly retentionScore: number; // 0-100
  readonly churnRiskScore: number; // 0-100
  readonly lifetimeValueInr: number;
  readonly nextRecommendedActionDate: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface PatientJourneyTransient {
  readonly patientId: string;
  readonly forceStage?: JourneyStage;
}

export const patientJourneyFactory = defineFactory<PatientJourneyOutput, PatientJourneyTransient>({
  name: 'patient' as 'patient',
  defaultTransient: { patientId: 'unknown' },

  build: ({ sequence, seed, faker, transient }) => {
    const stage =
      transient.forceStage ??
      faker.helpers.weightedArrayElement([
        { weight: 25, value: 'FIRST_VISIT' as const },
        { weight: 20, value: 'EXPLORATORY' as const },
        { weight: 18, value: 'TREATMENT_ACTIVE' as const },
        { weight: 15, value: 'MAINTENANCE' as const },
        { weight: 10, value: 'CHRONIC_CARE' as const },
        { weight: 7, value: 'GRADUATED' as const },
        { weight: 5, value: 'CHURNED' as const },
      ]);

    const churnCutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    const firstAt =
      stage === 'CHURNED'
        ? faker.date.past({ years: 5, refDate: churnCutoff })
        : faker.date.past({ years: 5 });
    const lastAt =
      stage === 'CHURNED'
        ? faker.date.between({ from: firstAt, to: churnCutoff })
        : realisticTimestamp(seed, 90);

    const totalConsultations =
      stage === 'FIRST_VISIT'
        ? 1
        : stage === 'EXPLORATORY'
          ? faker.number.int({ min: 2, max: 4 })
          : stage === 'TREATMENT_ACTIVE'
            ? faker.number.int({ min: 4, max: 12 })
            : stage === 'MAINTENANCE'
              ? faker.number.int({ min: 10, max: 25 })
              : stage === 'CHRONIC_CARE'
                ? faker.number.int({ min: 20, max: 60 })
                : stage === 'GRADUATED'
                  ? faker.number.int({ min: 5, max: 20 })
                  : faker.number.int({ min: 1, max: 8 }); // CHURNED

    const avgGap =
      (lastAt.getTime() - firstAt.getTime()) / (totalConsultations * 24 * 60 * 60 * 1000);

    return {
      id: `journey-${String(sequence).padStart(10, '0')}`,
      patientId: transient.patientId,
      currentStage: stage,
      firstConsultationAt: firstAt,
      lastConsultationAt: lastAt,
      totalConsultations,
      totalAppointments: Math.floor(
        totalConsultations * faker.number.float({ min: 0.3, max: 0.7 }),
      ),
      totalSpendInr: totalConsultations * faker.number.int({ min: 500, max: 5000 }),
      avgConsultationGapDays: Math.round(avgGap),
      preferredDoctor:
        stage !== 'FIRST_VISIT'
          ? `doctor-${String(faker.number.int({ min: 1, max: 200 })).padStart(6, '0')}`
          : null,
      preferredClinic:
        stage !== 'FIRST_VISIT'
          ? `clinic-${String(faker.number.int({ min: 1, max: 50 })).padStart(6, '0')}`
          : null,
      retentionScore:
        stage === 'CHURNED'
          ? 0
          : stage === 'CHRONIC_CARE'
            ? 95
            : faker.number.int({ min: 40, max: 90 }),
      churnRiskScore:
        stage === 'CHURNED'
          ? 100
          : stage === 'CHRONIC_CARE'
            ? 5
            : faker.number.int({ min: 10, max: 60 }),
      lifetimeValueInr: totalConsultations * faker.number.int({ min: 500, max: 8000 }),
      nextRecommendedActionDate: stage === 'CHURNED' ? null : faker.date.soon({ days: 60 }),
      createdAt: firstAt,
      updatedAt: new Date(),
    };
  },

  persist: async (journey) => journey,
});
