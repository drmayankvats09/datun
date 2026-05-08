// ═══════════════════════════════════════════════════════════════
// PRESCRIPTION RULES INVARIANT
// PROPERTY: prescriptionFactory must record safety attestations
//   correctly for every patient profile.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { prescriptionFactory } from '../../../../../prisma/seeds/factories/clinical/prescription.factory';
import { resetSequences } from '../../../../../prisma/seeds/factories/core/sequence';

describe('Prescription Rules Invariants', () => {
  beforeEach(() => resetSequences(42));

  it('audit fields always reflect input profile flags', () => {
    fc.assert(
      fc.property(
        fc.record({
          ageYears: fc.integer({ min: 5, max: 90 }),
          pregnancyStatus: fc.constantFrom('PREGNANT', 'NOT_APPLICABLE'),
          onBloodThinners: fc.boolean(),
          hasRenalImpairment: fc.boolean(),
          hasHepaticImpairment: fc.boolean(),
          allergies: fc.array(fc.constantFrom('penicillin', 'aspirin', 'sulfa', 'NSAID'), {
            minLength: 0,
            maxLength: 3,
          }),
          currentMedications: fc.array(fc.constantFrom('warfarin', 'metformin', 'aspirin'), {
            minLength: 0,
            maxLength: 3,
          }),
        }),
        fc.constantFrom('K04.0', 'K05.21', 'K04.7'),
        (profile, icd10) => {
          const rx = prescriptionFactory.build(undefined, {
            consultationId: 'c-test',
            patientId: 'p-test',
            icd10Code: icd10,
            patientProfile: profile,
          });

          expect(rx.pregnancyChecked).toBe(profile.pregnancyStatus !== 'NOT_APPLICABLE');
          expect(rx.allergiesChecked).toBe(profile.allergies.length > 0);
          expect(rx.bloodThinnerChecked).toBe(profile.onBloodThinners);
          expect(rx.pediatricDosingApplied).toBe(profile.ageYears < 18);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('lineItemCount equals lineItems array length', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 3 }), (saltCount) => {
        const rx = prescriptionFactory.build(undefined, {
          consultationId: 'c-test',
          patientId: 'p-test',
          icd10Code: 'K04.0',
          saltCount,
          patientProfile: {
            ageYears: 30,
            pregnancyStatus: 'NOT_APPLICABLE',
            onBloodThinners: false,
            hasRenalImpairment: false,
            hasHepaticImpairment: false,
            allergies: [],
            currentMedications: [],
          },
        });
        const items = JSON.parse((rx as Record<string, unknown>).lineItems as string) as unknown[];
        expect(rx.lineItemCount).toBe(items.length);
      }),
      { numRuns: 200 },
    );
  });
});
