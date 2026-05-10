// ═══════════════════════════════════════════════════════════════
// SALT SAFETY INVARIANT — fast-check 10K iterations
// PROPERTY: For any patient profile, getSafeSaltsForIcd10 must
//   NEVER return a salt that violates that profile's safety.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getSafeSaltsForIcd10 } from '../../../../../prisma/seeds/data/medical/salts';

describe('Salt Safety Invariants (10K property checks)', () => {
  it('NEVER returns penicillin-containing salt to penicillin-allergic patient', () => {
    fc.assert(
      fc.property(
        fc.record({
          ageYears: fc.integer({ min: 1, max: 95 }),
          pregnancyStatus: fc.constantFrom('PREGNANT', 'NOT_APPLICABLE'),
          onBloodThinners: fc.boolean(),
          hasRenalImpairment: fc.boolean(),
          hasHepaticImpairment: fc.boolean(),
          allergies: fc.constant(['penicillin']),
          currentMedications: fc.constant([]),
        }),
        fc.constantFrom('K04.0', 'K04.7', 'K05.21', 'K00.7', 'K12.0'),
        (profile, icd) => {
          const salts = getSafeSaltsForIcd10(profile, icd);
          for (const salt of salts) {
            expect(salt.contraindicatedAllergies.map((a) => a.toLowerCase())).not.toContain(
              'penicillin',
            );
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('NEVER returns NSAID to pregnant patient', () => {
    fc.assert(
      fc.property(
        fc.record({
          ageYears: fc.integer({ min: 18, max: 45 }),
          pregnancyStatus: fc.constant('PREGNANT' as const),
          onBloodThinners: fc.boolean(),
          hasRenalImpairment: fc.boolean(),
          hasHepaticImpairment: fc.boolean(),
          allergies: fc.constant([] as string[]),
          currentMedications: fc.constant([] as string[]),
        }),
        fc.constantFrom('K04.0', 'K05.21'),
        (profile, icd) => {
          const salts = getSafeSaltsForIcd10(profile, icd);
          for (const salt of salts) {
            expect(salt.safeInPregnancy).toBe(true);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('NEVER returns NSAID/metronidazole to warfarin patient', () => {
    fc.assert(
      fc.property(
        fc.record({
          ageYears: fc.integer({ min: 30, max: 90 }),
          pregnancyStatus: fc.constant('NOT_APPLICABLE' as const),
          onBloodThinners: fc.constant(true),
          hasRenalImpairment: fc.boolean(),
          hasHepaticImpairment: fc.boolean(),
          allergies: fc.constant([] as string[]),
          currentMedications: fc.constant(['warfarin']),
        }),
        fc.constantFrom('K04.0', 'K05.21'),
        (profile, icd) => {
          const salts = getSafeSaltsForIcd10(profile, icd);
          for (const salt of salts) {
            expect(salt.safeWithBloodThinners).toBe(true);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  it('NEVER returns under-age salt to pediatric patient', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        fc.constantFrom('K00.7', 'K04.0', 'K05.21'),
        (ageYears, icd) => {
          const profile = {
            ageYears,
            pregnancyStatus: 'NOT_APPLICABLE' as const,
            onBloodThinners: false,
            hasRenalImpairment: false,
            hasHepaticImpairment: false,
            allergies: [],
            currentMedications: [],
          };
          const salts = getSafeSaltsForIcd10(profile, icd);
          for (const salt of salts) {
            expect(salt.minAgeYears).toBeLessThanOrEqual(ageYears);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });
});
