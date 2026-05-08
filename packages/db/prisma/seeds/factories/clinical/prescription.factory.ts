// ═══════════════════════════════════════════════════════════════
// PRESCRIPTION FACTORY — Safety-filtered medication selection
//
// CRITICAL: This factory enforces SDCEP + ADA drug safety rules:
//   • Pregnancy → only Category A/B salts
//   • Allergies → exclude flagged salts
//   • Blood thinners (warfarin) → NO NSAIDs, NO metronidazole, NO macrolides
//   • Pediatric → exclude salts with minAge > patient age
//   • Hepatic/renal → exclude flagged salts
//
// Source: SDCEP Drug Interaction Tables (Scotland NHS) + ADA pain guidelines
// ═══════════════════════════════════════════════════════════════

import type { Prescription, PrismaClient, PregnancyStatus } from '@prisma/client';
import { defineFactory } from '../core';
import { getSafeSaltsForIcd10, type DentalSalt } from '../../data/medical/salts';

interface PrescriptionTransient {
  readonly consultationId: string;
  readonly patientId: string;
  readonly doctorId?: string | null;
  readonly icd10Code: string;
  readonly patientProfile: {
    readonly ageYears: number;
    readonly pregnancyStatus: PregnancyStatus;
    readonly onBloodThinners: boolean;
    readonly hasRenalImpairment: boolean;
    readonly hasHepaticImpairment: boolean;
    readonly allergies: readonly string[];
    readonly currentMedications: readonly string[];
  };
  /** Force specific salt count (default: AI picks 1-3 based on condition severity) */
  readonly saltCount?: number;
  /** Force specific salt IDs (override auto-pick) */
  readonly forceSaltIds?: readonly string[];
}

export const prescriptionFactory = defineFactory<Prescription, PrescriptionTransient>({
  name: 'prescription',
  defaultTransient: {
    consultationId: '',
    patientId: '',
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

  build: ({ sequence, faker, transient }) => {
    if (!transient.consultationId) {
      throw new Error('[prescription.factory] consultationId required');
    }

    // ── Step 1: Get safety-filtered salts for this patient + condition ──
    let candidateSalts: readonly DentalSalt[];
    if (transient.forceSaltIds && transient.forceSaltIds.length > 0) {
      // Forced override (test scenarios)
      const allSalts = getSafeSaltsForIcd10(transient.patientProfile, transient.icd10Code);
      candidateSalts = allSalts.filter((s) => transient.forceSaltIds!.includes(s.id));
    } else {
      candidateSalts = getSafeSaltsForIcd10(transient.patientProfile, transient.icd10Code);
    }

    // ── Step 2: Pick 1-3 salts (analgesic + antibiotic + adjunct typically) ──
    const targetCount = transient.saltCount ?? faker.number.int({ min: 1, max: 3 });
    const selectedSalts = faker.helpers.arrayElements(
      candidateSalts,
      Math.min(targetCount, candidateSalts.length),
    );

    // ── Step 3: Build line-items for each selected salt ──
    const lineItems = selectedSalts.map((salt) => ({
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

    // ── Step 4: Build header info ──
    return {
      id: `rx-${String(sequence).padStart(8, '0')}`,
      consultationId: transient.consultationId,
      patientId: transient.patientId,
      doctorId: transient.doctorId ?? null,

      // Header
      icd10Code: transient.icd10Code,
      prescribedAt: faker.date.recent({ days: 30 }),

      // Line items (denormalized JSON)
      lineItems: JSON.stringify(lineItems),
      lineItemCount: lineItems.length,

      // Safety attestations (audit trail)
      pregnancyChecked: transient.patientProfile.pregnancyStatus !== 'NOT_APPLICABLE',
      allergiesChecked: transient.patientProfile.allergies.length > 0,
      bloodThinnerChecked: transient.patientProfile.onBloodThinners,
      pediatricDosingApplied: transient.patientProfile.ageYears < 18,

      // PDF
      pdfUrl: `https://r2.datunai.com/prescriptions/rx-${sequence}.pdf`,
      pdfSignedBy: 'Dr. Mayank Vats',
      pdfSignedAt: new Date(),

      // Patient instructions block
      patientInstructionsEnglish:
        'Take medications as prescribed. Avoid alcohol with antibiotics. Return if pain persists beyond 48 hours.',
      patientInstructionsHindi:
        'सभी दवाएं डॉक्टर के बताए अनुसार लें। एंटीबायोटिक के साथ शराब न लें। 48 घंटे में आराम न आए तो वापस आएं।',

      // Legal disclaimer
      disclaimerShown: true,

      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as unknown as Prescription;
  },

  persist: async (rx, prisma) => {
    return prisma.prescription.upsert({
      where: { id: rx.id },
      create: rx as never,
      update: { updatedAt: new Date() },
    });
  },
});
