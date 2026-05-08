// ═══════════════════════════════════════════════════════════════
// COMORBIDITY REALISM INVARIANT
// PROPERTY: Patient factory output medical context is internally consistent
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { patientFactory } from '../../../../../prisma/seeds/factories/patient/patient.factory';
import { resetSequences } from '../../../../../prisma/seeds/factories/core/sequence';
import { PATIENT_ARCHETYPES } from '../../../../../prisma/seeds/data/medical/archetypes';

describe('Comorbidity Realism Invariants', () => {
  beforeEach(() => resetSequences(42));

  it('every archetype produces consistent patient with no schema violations', () => {
    fc.assert(
      fc.property(fc.constantFrom(...PATIENT_ARCHETYPES.map((a) => a.id)), (archetypeId) => {
        const patient = patientFactory.build(undefined, { archetypeId });
        const archetype = PATIENT_ARCHETYPES.find((a) => a.id === archetypeId)!;

        // Age within archetype range
        expect(patient.ageYears).toBeGreaterThanOrEqual(archetype.age.min);
        expect(patient.ageYears).toBeLessThanOrEqual(archetype.age.max);

        // Gender in allowed list
        expect(archetype.gender).toContain(patient.gender);

        // Pregnancy status sanity
        if (
          patient.gender === 'MALE' ||
          (patient.ageYears != null && (patient.ageYears < 18 || patient.ageYears > 45))
        ) {
          expect(patient.pregnancyStatus).toBe('NOT_APPLICABLE');
        }

        // Primary condition matches archetype
        expect(patient.primaryConditionIcd10).toBe(archetype.primaryConditionIcd10);

        // Json? fields are JSON-stringified strings (Prisma accepts both)
        expect(() => JSON.parse(patient.knownAllergies as string)).not.toThrow();
        expect(() => JSON.parse(patient.medicalConditions as string)).not.toThrow();
        expect(() => JSON.parse(patient.currentMedications as string)).not.toThrow();
        // String[] schema field — real array (NOT JSON-stringified)
        expect(Array.isArray(patient.comorbidConditionsIcd10)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });
});
