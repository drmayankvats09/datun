// ═══════════════════════════════════════════════════════════════
// COMPOSER: Full Consultation Tree (CROWN JEWEL)
//
// One call → realistic complete consultation:
//   • Consultation entity
//   • 8-25 messages (PATIENT ↔ AI back-and-forth)
//   • Prescription (if condition warrants meds)
//   • Optional handoff to Doctor
//   • Optional appointment booking
//   • WhatsApp completion message
//   • Follow-up notifications scheduled
//
// This is what the seed orchestrator (Wave 9) calls for each
// of the 20+ consultations in demo data.
// ═══════════════════════════════════════════════════════════════

import type {
  Appointment,
  Consultation,
  ConsultationMessage,
  Notification,
  Patient,
  Prescription,
  PrismaClient,
  WhatsAppMessage,
} from '@prisma/client';
import { consultationFactory } from '../clinical/consultation.factory';
import { consultationMessageFactory } from '../clinical/consultation-message.factory';
import { prescriptionFactory } from '../clinical/prescription.factory';
import { appointmentFactory } from '../operational/appointment.factory';
import { whatsappMessageFactory } from '../operational/whatsapp-message.factory';
import { notificationFactory } from '../operational/notification.factory';
import { PATIENT_ARCHETYPES } from '../../data/medical/archetypes';

export interface FullConsultationTree {
  readonly consultation: Consultation;
  readonly messages: readonly ConsultationMessage[];
  readonly prescription: Prescription | null;
  readonly appointment: Appointment | null;
  readonly whatsappMessages: readonly WhatsAppMessage[];
  readonly notifications: readonly Notification[];
}

export interface FullConsultationOptions {
  readonly patient: Patient;
  readonly clinicId?: string | null;
  readonly doctorId?: string | null;
  readonly forceIcd10?: string;
  readonly forceUrgency?: 'ROUTINE' | 'MODERATE' | 'URGENT' | 'EMERGENCY';
  readonly forceStatus?:
    | 'COMPLETED'
    | 'IN_PROGRESS'
    | 'ABANDONED'
    | 'AWAITING_PATIENT'
    | 'ESCALATED';
  /** Whether to create an appointment booking */
  readonly bookAppointment?: boolean;
}

export function buildFullConsultation(opts: FullConsultationOptions): FullConsultationTree {
  // Read patient archetype for ICD-10 + locale
  const archetype = PATIENT_ARCHETYPES.find(
    (a) => a.primaryConditionIcd10 === opts.patient.primaryConditionIcd10,
  );

  const consultation = consultationFactory.build(undefined, {
    patientId: opts.patient.id,
    doctorId: opts.doctorId ?? undefined,
    clinicId: opts.clinicId ?? undefined,
    forceIcd10: opts.forceIcd10 ?? opts.patient.primaryConditionIcd10 ?? undefined,
    forceUrgency: opts.forceUrgency,
    forceStatus: opts.forceStatus ?? 'COMPLETED',
    locale: opts.patient.preferredLocale as
      | 'hindi'
      | 'english'
      | 'punjabi'
      | 'bengali'
      | 'tamil'
      | 'telugu'
      | 'marathi'
      | 'gujarati',
    patientArchetypeIcd10: archetype?.primaryConditionIcd10,
    chiefComplaint: archetype?.typicalChiefComplaint,
  });

  // Build conversation flow: PATIENT → AI → PATIENT → AI → ...
  const turnCount = 12; // typical consultation 12 turns (8-25 range)
  const messages: ConsultationMessage[] = [];
  for (let i = 0; i < turnCount; i++) {
    const role = i % 2 === 0 ? 'PATIENT' : 'AI';
    messages.push(
      consultationMessageFactory.build(undefined, {
        consultationId: consultation.id,
        turnIndex: i,
        role,
        locale: consultation.chiefComplaintLocale as
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

  // Prescription (only if completed AND condition warrants meds)
  let prescription: Prescription | null = null;
  const needsRx =
    consultation.status === 'COMPLETED' &&
    (consultation.urgency === 'URGENT' || consultation.urgency === 'EMERGENCY');
  if (needsRx) {
    prescription = prescriptionFactory.build(undefined, {
      consultationId: consultation.id,
      patientId: opts.patient.id,
      doctorId: opts.doctorId,
      icd10Code: consultation.primaryDiagnosisIcd10 ?? undefined,
      patientProfile: {
        ageYears: opts.patient.ageYears ?? 30,
        pregnancyStatus: opts.patient.pregnancyStatus ?? 'NOT_APPLICABLE',
        onBloodThinners: JSON.parse(
          (opts.patient.currentMedications as string | null) ?? '[]',
        ).some((m: string) =>
          ['warfarin', 'aspirin', 'clopidogrel', 'apixaban', 'rivaroxaban'].includes(m),
        ),
        hasRenalImpairment: false,
        hasHepaticImpairment: false,
        allergies: JSON.parse(opts.patient.knownAllergies as string),
        currentMedications: JSON.parse(opts.patient.currentMedications as string),
      },
    });
  }

  // Appointment (optional)
  let appointment: Appointment | null = null;
  if (opts.bookAppointment && opts.clinicId) {
    appointment = appointmentFactory.build(undefined, {
      patientId: opts.patient.id,
      clinicId: opts.clinicId,
      doctorId: opts.doctorId,
      consultationId: consultation.id,
      daysFromNow: 7,
    });
  }

  // WhatsApp completion message
  const whatsappMessages: WhatsAppMessage[] = [];
  if (consultation.status === 'COMPLETED') {
    whatsappMessages.push(
      whatsappMessageFactory.build(undefined, {
        recipientPhone: opts.patient.phone ?? '+919999000000',
        templateName: 'consultation_complete',
        patientId: opts.patient.id,
        consultationId: consultation.id,
      }),
    );
  }

  // Notifications (in-app)
  const notifications: Notification[] = [];
  if (consultation.status === 'COMPLETED') {
    notifications.push(
      notificationFactory.build(undefined, { userId: opts.patient.userId, channel: 'IN_APP' }),
    );
  }

  return {
    consultation,
    messages,
    prescription,
    appointment,
    whatsappMessages,
    notifications,
  };
}

/** Persist full consultation tree in single transaction */
export async function createFullConsultation(
  prisma: PrismaClient,
  opts: FullConsultationOptions,
): Promise<FullConsultationTree> {
  const built = buildFullConsultation(opts);

  return prisma.$transaction(async (tx) => {
    const consultation = await tx.consultation.create({ data: built.consultation as never });

    const messages: ConsultationMessage[] = [];
    for (const m of built.messages) {
      messages.push(await tx.consultationMessage.create({ data: m as never }));
    }

    let prescription: Prescription | null = null;
    if (built.prescription) {
      prescription = await tx.prescription.create({ data: built.prescription as never });
    }

    let appointment: Appointment | null = null;
    if (built.appointment) {
      appointment = await tx.appointment.create({ data: built.appointment as never });
    }

    const whatsappMessages: WhatsAppMessage[] = [];
    for (const w of built.whatsappMessages) {
      whatsappMessages.push(await tx.whatsAppMessage.create({ data: w as never }));
    }

    const notifications: Notification[] = [];
    for (const n of built.notifications) {
      notifications.push(await tx.notification.create({ data: n as never }));
    }

    return { consultation, messages, prescription, appointment, whatsappMessages, notifications };
  });
}
