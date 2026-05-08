// ═══════════════════════════════════════════════════════════════
// PRESCRIPTION FACTORY SAFETY TESTS
// Verifies SDCEP + ADA safety rules: pregnancy, allergies,
//                                     blood thinners, pediatric
// ═══════════════════════════════════════════════════════════════

import { describe, expect, it, beforeEach } from 'vitest';
import { prescriptionFactory } from '../../../../prisma/seeds/factories/clinical/prescription.factory';
import { resetSequences } from '../../../../prisma/seeds/factories/core/sequence';
import { ALL_DENTAL_SALTS } from '../../../../prisma/seeds/data/medical/salts';

describe('prescriptionFactory — clinical safety', () => {
  beforeEach(() => {
    resetSequences(42);
  });

  it('does NOT prescribe NSAIDs to pregnant patient', () => {
    const rx = prescriptionFactory.build(undefined, {
      consultationId: 'c-1',
      patientId: 'p-1',
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

    const lineItems = JSON.parse((rx as Record<string, unknown>).lineItems as string) as Array<{
      saltId: string;
      saltName: string;
    }>;
    const salts = lineItems
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

    const lineItems = JSON.parse((rx as Record<string, unknown>).lineItems as string) as Array<{
      saltId: string;
      saltName: string;
    }>;
    const salts = lineItems
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

    const lineItems = JSON.parse((rx as Record<string, unknown>).lineItems as string) as Array<{
      saltId: string;
      saltName: string;
    }>;
    const salts = lineItems
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
