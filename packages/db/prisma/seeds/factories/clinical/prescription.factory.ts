// ═══════════════════════════════════════════════════════════════
// PRESCRIPTION FACTORY — Safety-filtered medication selection
//
// SCHEMA-ALIGNED v2.0 — only fields that exist in `model Prescription`.
// Earlier version generated phantom fields (lineItems, pdfSignedBy,
// patientInstructionsEnglish/Hindi, disclaimerShown, etc.) that crashed
// bulkInsert. Schema's REQUIRED fields (userId, diagnosis, medications,
// prescriberRegistrationNumber) are now populated correctly.
//
// REQUIRED inputs (transient):
//   • consultationId (UUID)
//   • patientId      (UUID)
//   • userId         (UUID — patient's User FK)
//
// CRITICAL: This factory enforces SDCEP + ADA drug safety rules:
//   • Pregnancy → only Category A/B salts
//   • Allergies → exclude flagged salts
//   • Blood thinners → NO NSAIDs, NO metronidazole, NO macrolides
//   • Pediatric → exclude salts with minAge > patient age
// ═══════════════════════════════════════════════════════════════

import { randomUUID } from 'node:crypto';
import type { Prescription, PregnancyStatus } from '@prisma/client';
import { defineFactory } from '../core';
import { getSafeSaltsForIcd10, type DentalSalt } from '../../data/medical/salts';

interface PrescriptionTransient {
  readonly consultationId: string;
  readonly patientId: string;
  /** REQUIRED — User FK (the patient's user account) */
  readonly userId: string;
  readonly doctorId?: string | null;
  readonly icd10Code?: string;
  readonly diagnosisLabel?: string;
  readonly patientProfile: {
    readonly ageYears: number;
    readonly pregnancyStatus: PregnancyStatus;
    readonly onBloodThinners: boolean;
    readonly hasRenalImpairment: boolean;
    readonly hasHepaticImpairment: boolean;
    readonly allergies: readonly string[];
    readonly currentMedications: readonly string[];
  };
  readonly saltCount?: number;
  readonly forceSaltIds?: readonly string[];
}

export const prescriptionFactory = defineFactory<Prescription, PrescriptionTransient>({
  name: 'prescription',
  defaultTransient: {
    consultationId: '',
    patientId: '',
    userId: '',
    icd10Code: 'Z01.20',
    patientProfile: {
      ageYears: 30,
      pregnancyStatus: 'NOT_APPLICABLE',
      onBloodThinners: false,
      hasRenalImpairment: false,
      hasHepaticImpairment: false,
      allergies: [],
      currentMedications: [],
    },
  },

  build: ({ faker, transient }) => {
    if (!transient.consultationId) {
      throw new Error('[prescription.factory] consultationId required');
    }
    if (!transient.patientId) {
      throw new Error('[prescription.factory] patientId required');
    }
    if (!transient.userId) {
      throw new Error('[prescription.factory] userId required');
    }

    // ── Step 1: Get safety-filtered salts ──
    // FIX: Real signature is (profile, icd10Code) — profile FIRST.
    // Returns readonly DentalSalt[] — must keep readonly OR spread to mutable.
    const icd10 = transient.icd10Code ?? 'Z01.20';
    const safeSalts: readonly DentalSalt[] = getSafeSaltsForIcd10(transient.patientProfile, icd10);

    // ── Step 2: Pick salts (1-3 based on severity) ──
    const saltCount = transient.saltCount ?? faker.number.int({ min: 1, max: 3 });
    const selectedSalts: DentalSalt[] =
      transient.forceSaltIds && transient.forceSaltIds.length > 0
        ? safeSalts.filter((s) => transient.forceSaltIds!.includes(s.id)).slice(0, saltCount)
        : faker.helpers.arrayElements(
            [...safeSalts], // spread to mutable copy — faker requires non-readonly
            Math.min(saltCount, safeSalts.length),
          );

    // ── Step 3: Build medications JSON ──
    const medications = selectedSalts.map((salt) => ({
      saltId: salt.id,
      saltName: salt.saltName,
      route: salt.route,
      dose:
        transient.patientProfile.ageYears < 18 && salt.pediatricDose
          ? salt.pediatricDose
          : salt.adultDose,
      durationDays: salt.category === 'antibiotic' ? 5 : salt.category === 'analgesic' ? 3 : 14,
      instructions: `Take ${salt.adultDose}${salt.route === 'PO' ? ' after food' : ''}`,
      contraindicatedAllergiesShown: salt.contraindicatedAllergies.length > 0,
    }));

    // Construct an object matching Prisma's PrescriptionUncheckedCreateInput shape exactly.
    return {
      id: randomUUID(),
      consultationId: transient.consultationId,
      patientId: transient.patientId,
      userId: transient.userId,
      prescribedByName: 'Dr. Mayank Vats',
      signedByDoctorId: transient.doctorId ?? null,

      // REQUIRED fields
      diagnosis: transient.diagnosisLabel ?? `Diagnosis for ICD-10 ${icd10}`,
      medications,
      prescriberRegistrationNumber: 'DCI-DL-12345', // NMC compliance — Mayank's registration

      // Optional Json fields
      investigations: null,
      procedures: null,
      homeRemedies: null,
      followUpDate: null,
      specialInstructions:
        'Take medications as prescribed. Avoid alcohol with antibiotics. Return if pain persists beyond 48 hours.',

      // PDF
      pdfUrl: `https://r2.datunai.com/prescriptions/${randomUUID()}.pdf`,
      pdfVersion: 1,
      shareableSlug: null,
      expiresAt: null,
      viewCount: 0,
      isActive: true,

      // Review (defaults but explicit)
      reviewStatus: null,
      reviewedByDoctorId: null,
      reviewedAt: null,
      signatureUrl: null,

      // NMC compliance
      prescriberRegistrationCouncil: 'Dental Council of India',
      prescriberSpecialization: 'BDS, General Dental Practice',

      // Safety check audit trail
      pregnancyChecked: transient.patientProfile.pregnancyStatus !== 'NOT_APPLICABLE',
      allergiesChecked: transient.patientProfile.allergies.length > 0,
      bloodThinnerChecked: transient.patientProfile.onBloodThinners,
      pediatricDosingApplied: transient.patientProfile.ageYears < 18,
      interactionsChecked: true,

      // Denormalized
      lineItemCount: medications.length,

      // Telemedicine eligibility
      isTelemedicinePrescription: !transient.doctorId,
      physicalConsultationRecommended: false,

      // Timestamps (Prisma defaults but explicit for type)
      createdAt: faker.date.recent({ days: 30 }),
      updatedAt: new Date(),
    } as unknown as Prescription;
  },

  persist: async (rx, prisma) => {
    return prisma.prescription.upsert({
      where: { id: (rx as { id: string }).id },
      create: rx as never,
      update: { updatedAt: new Date() },
    });
  },
});
