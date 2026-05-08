// ═══════════════════════════════════════════════════════════════
// PATIENT JOURNEY COMPOSER — Multi-year lifecycle simulation
// Generates one patient + Pareto-distributed consultation history
// over 5 years matching real retention curves.
// ═══════════════════════════════════════════════════════════════

import type {
  Appointment,
  Consultation,
  ConsultationMessage,
  Patient,
  Prescription,
  PrismaClient,
  User,
} from '@prisma/client';
import { userFactory } from '../primitives/user.factory';
import { patientFactory } from '../patient/patient.factory';
import { consultationFactory } from '../clinical/consultation.factory';
import { consultationMessageFactory } from '../clinical/consultation-message.factory';
import { prescriptionFactory } from '../clinical/prescription.factory';
import { appointmentFactory } from '../operational/appointment.factory';
import { realisticTimestamp, paretoSample } from '../distributions/distributions';
import { PATIENT_ARCHETYPES } from '../../data/medical/archetypes';

export interface JourneyResult {
  readonly user: User;
  readonly patient: Patient;
  readonly consultations: readonly Consultation[];
  readonly messages: readonly ConsultationMessage[];
  readonly prescriptions: readonly Prescription[];
  readonly appointments: readonly Appointment[];
}

export interface JourneyOptions {
  readonly archetypeId?: string;
  readonly homeClinicId?: string;
  readonly stageOverride?:
    | 'FIRST_VISIT'
    | 'EXPLORATORY'
    | 'TREATMENT_ACTIVE'
    | 'MAINTENANCE'
    | 'CHRONIC_CARE';
  readonly seed?: number;
}

const STAGE_CONSULTATION_COUNT = {
  FIRST_VISIT: 1,
  EXPLORATORY: 3,
  TREATMENT_ACTIVE: 8,
  MAINTENANCE: 18,
  CHRONIC_CARE: 40,
};

export function buildPatientJourney(opts: JourneyOptions = {}): JourneyResult {
  const seed = opts.seed ?? Math.floor(Math.random() * 1_000_000);

  const user = userFactory.build(undefined, { primaryRole: 'PATIENT' });
  const patient = patientFactory.build(undefined, {
    userId: user.id,
    archetypeId: opts.archetypeId,
    homeClinicId: opts.homeClinicId,
  });

  const archetype = PATIENT_ARCHETYPES.find((a) => a.id === opts.archetypeId);
  const stage = opts.stageOverride ?? 'TREATMENT_ACTIVE';
  const targetCount = STAGE_CONSULTATION_COUNT[stage];

  const consultations: Consultation[] = [];
  const messages: ConsultationMessage[] = [];
  const prescriptions: Prescription[] = [];
  const appointments: Appointment[] = [];

  for (let i = 0; i < targetCount; i++) {
    // Pareto distribution — most recent consultations more frequent
    const daysAgo = Math.floor(paretoSample(seed + i, 1.16, 1));
    const startedAt = realisticTimestamp(seed + i * 7, Math.min(daysAgo, 1825));

    const consultation = consultationFactory.build(
      { createdAt: startedAt } as never,
      {
        patientId: patient.id,
        clinicId: opts.homeClinicId,
        locale: patient.preferredLocale as
          | 'hindi'
          | 'english'
          | 'punjabi'
          | 'bengali'
          | 'tamil'
          | 'telugu'
          | 'marathi'
          | 'gujarati',
      } as never,
    );

    consultations.push(consultation);

    // 8-15 messages per consultation
    const msgCount = 8 + ((seed + i) % 8);
    for (let m = 0; m < msgCount; m++) {
      const role = m % 2 === 0 ? 'PATIENT' : 'AI';
      messages.push(
        consultationMessageFactory.build(undefined, {
          consultationId: consultation.id,
          turnIndex: m,
          role,
          locale: patient.preferredLocale as
            | 'hindi'
            | 'english'
            | 'punjabi'
            | 'bengali'
            | 'tamil'
            | 'telugu'
            | 'marathi'
            | 'gujarati',
        }),
      );
    }

    // ~60% get prescription
    if (consultation.status === 'COMPLETED' && (seed + i) % 5 < 3) {
      const allergies = JSON.parse((patient.knownAllergies as string) ?? '[]');
      const meds = JSON.parse((patient.currentMedications as string) ?? '[]');
      prescriptions.push(
        prescriptionFactory.build(undefined, {
          consultationId: consultation.id,
          patientId: patient.id,
          icd10Code: consultation.primaryDiagnosisIcd10 ?? undefined,
          patientProfile: {
            ageYears: patient.ageYears ?? 30,
            pregnancyStatus: patient.pregnancyStatus ?? 'NOT_APPLICABLE',
            onBloodThinners: meds.some((m: string) => ['warfarin', 'aspirin'].includes(m)),
            hasRenalImpairment: false,
            hasHepaticImpairment: false,
            allergies,
            currentMedications: meds,
          },
        }),
      );
    }

    // ~30% lead to appointment
    if (consultation.status === 'COMPLETED' && (seed + i) % 10 < 3 && opts.homeClinicId) {
      appointments.push(
        appointmentFactory.build(undefined, {
          patientId: patient.id,
          clinicId: opts.homeClinicId,
          consultationId: consultation.id,
          daysFromNow: -daysAgo + 7,
        }),
      );
    }
  }

  return { user, patient, consultations, messages, prescriptions, appointments };
}

export async function createPatientJourney(
  prisma: PrismaClient,
  opts: JourneyOptions = {},
): Promise<JourneyResult> {
  const built = buildPatientJourney(opts);

  return prisma.$transaction(
    async (tx) => {
      const user = await tx.user.create({ data: built.user as never });
      const patient = await tx.patient.create({
        data: { ...built.patient, userId: user.id } as never,
      });

      const consultations: Consultation[] = [];
      for (const c of built.consultations) {
        consultations.push(await tx.consultation.create({ data: c as never }));
      }
      const messages: ConsultationMessage[] = [];
      for (const m of built.messages) {
        messages.push(await tx.consultationMessage.create({ data: m as never }));
      }
      const prescriptions: Prescription[] = [];
      for (const p of built.prescriptions) {
        prescriptions.push(await tx.prescription.create({ data: p as never }));
      }
      const appointments: Appointment[] = [];
      for (const a of built.appointments) {
        appointments.push(await tx.appointment.create({ data: a as never }));
      }

      return { user, patient, consultations, messages, prescriptions, appointments };
    },
    { timeout: 120_000, maxWait: 30_000 },
  );
}
