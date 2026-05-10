// ═══════════════════════════════════════════════════════════════
// PRESCRIPTION FACTORY SAFETY TESTS
// Verifies SDCEP + ADA safety rules: pregnancy, allergies,
//                                     blood thinners, pediatric
// ═══════════════════════════════════════════════════════════════

import { describe, expect, it, beforeEach } from 'vitest';
import { prescriptionFactory } from '../../../../prisma/seeds/factories/clinical/prescription.factory';
import { resetSequences } from '../../../../prisma/seeds/factories/core/sequence';
import { ALL_DENTAL_SALTS } from '../../../../prisma/seeds/data/medical/salts';

/** Helper — returns medications array from prescription regardless of storage shape */
function getMedications(rx: unknown): Array<{ saltId: string; saltName: string }> {
  const obj = rx as Record<string, unknown>;
  const meds = obj.medications;
  if (Array.isArray(meds)) return meds as Array<{ saltId: string; saltName: string }>;
  if (typeof meds === 'string') return JSON.parse(meds);
  return [];
}

describe('prescriptionFactory — clinical safety', () => {
  beforeEach(() => {
    resetSequences(42);
  });

  it('does NOT prescribe NSAIDs to pregnant patient', () => {
    const rx = prescriptionFactory.build(undefined, {
      consultationId: 'c-1',
      patientId: 'p-1',
      userId: 'u-1',
      icd10Code: 'K04.0',
      patientProfile: {
        ageYears: 28,
        pregnancyStatus: 'PREGNANT',
        onBloodThinners: false,
        hasRenalImpairment: false,
        hasHepaticImpairment: false,
        allergies: [],
        currentMedications: ['folic-acid', 'iron'],
      },
    });

    const meds = getMedications(rx);
    const salts = meds
      .map((li) => ALL_DENTAL_SALTS.find((s) => s.id === li.saltId))
      .filter(Boolean);
    salts.forEach((salt) => {
      expect(salt!.safeInPregnancy).toBe(true);
    });
  });

  it('does NOT prescribe penicillin to penicillin-allergic patient', () => {
    const rx = prescriptionFactory.build(undefined, {
      consultationId: 'c-2',
      patientId: 'p-2',
      userId: 'u-2',
      icd10Code: 'K04.7', // abscess (would normally get amoxicillin)
      patientProfile: {
        ageYears: 35,
        pregnancyStatus: 'NOT_APPLICABLE',
        onBloodThinners: false,
        hasRenalImpairment: false,
        hasHepaticImpairment: false,
        allergies: ['penicillin'],
        currentMedications: [],
      },
    });

    const meds = getMedications(rx);
    const salts = meds
      .map((li) => ALL_DENTAL_SALTS.find((s) => s.id === li.saltId))
      .filter(Boolean);
    salts.forEach((salt) => {
      expect(salt!.contraindicatedAllergies.map((a) => a.toLowerCase())).not.toContain(
        'penicillin',
      );
    });
  });

  it('does NOT prescribe NSAIDs or metronidazole to warfarin patient', () => {
    const rx = prescriptionFactory.build(undefined, {
      consultationId: 'c-3',
      patientId: 'p-3',
      userId: 'u-3',
      icd10Code: 'K05.21',
      patientProfile: {
        ageYears: 65,
        pregnancyStatus: 'NOT_APPLICABLE',
        onBloodThinners: true,
        hasRenalImpairment: false,
        hasHepaticImpairment: false,
        allergies: [],
        currentMedications: ['warfarin'],
      },
    });

    const meds = getMedications(rx);
    const salts = meds
      .map((li) => ALL_DENTAL_SALTS.find((s) => s.id === li.saltId))
      .filter(Boolean);
    salts.forEach((salt) => {
      expect(salt!.safeWithBloodThinners).toBe(true);
    });
  });

  it('uses pediatric dosing for child patient', () => {
    const rx = prescriptionFactory.build(undefined, {
      consultationId: 'c-4',
      patientId: 'p-4',
      userId: 'u-4',
      icd10Code: 'K00.7',
      patientProfile: {
        ageYears: 6,
        pregnancyStatus: 'NOT_APPLICABLE',
        onBloodThinners: false,
        hasRenalImpairment: false,
        hasHepaticImpairment: false,
        allergies: [],
        currentMedications: [],
      },
    });

    expect(rx.pediatricDosingApplied).toBe(true);
  });

  it('records safety attestations in audit fields', () => {
    const rx = prescriptionFactory.build(undefined, {
      consultationId: 'c-5',
      patientId: 'p-5',
      userId: 'u-5',
      icd10Code: 'K04.0',
      patientProfile: {
        ageYears: 28,
        pregnancyStatus: 'PREGNANT',
        onBloodThinners: true,
        hasRenalImpairment: false,
        hasHepaticImpairment: false,
        allergies: ['NSAID'],
        currentMedications: ['warfarin'],
      },
    });

    expect(rx.pregnancyChecked).toBe(true);
    expect(rx.allergiesChecked).toBe(true);
    expect(rx.bloodThinnerChecked).toBe(true);
  });
});
