// ═══════════════════════════════════════════════════════════════
// PATIENT FACTORY TESTS
// Verifies: archetype selection, deterministic seeding,
//           comorbidity injection, locale resolution
// ═══════════════════════════════════════════════════════════════

import { describe, expect, it, beforeEach } from 'vitest';
import { patientFactory } from '../../../../prisma/seeds/factories/patient/patient.factory';
import { resetSequences } from '../../../../prisma/seeds/factories/core/sequence';

describe('patientFactory', () => {
  beforeEach(() => {
    resetSequences(42); // deterministic master seed
  });

  it('builds a patient with required fields', () => {
    const patient = patientFactory.build();

    expect(patient.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(patient.firstName).toBeTruthy();
    expect(patient.lastName).toBeTruthy();
    expect(patient.ageYears).toBeGreaterThanOrEqual(0);
    expect(patient.ageYears).toBeLessThanOrEqual(95);
    expect(['MALE', 'FEMALE', 'OTHER']).toContain(patient.gender);
  });

  it('produces deterministic output for same seed', () => {
    resetSequences(100);
    const p1 = patientFactory.build();
    resetSequences(100);
    const p2 = patientFactory.build();

    expect(p1.firstName).toBe(p2.firstName);
    expect(p1.ageYears).toBe(p2.ageYears);
    expect(p1.primaryConditionIcd10).toBe(p2.primaryConditionIcd10);
  });

  it('applies overrides correctly', () => {
    const patient = patientFactory.build({ firstName: 'CustomName' });
    expect(patient.firstName).toBe('CustomName');
  });

  it('respects forced archetype', () => {
    const patient = patientFactory.build(undefined, { archetypeId: 'arch-001' });
    // Pregnancy 1st trimester gingivitis archetype
    expect(patient.gender).toBe('FEMALE');
    expect(patient.pregnancyStatus).toBe('PREGNANT');
    expect(patient.primaryConditionIcd10).toBe('K05.10');
  });

  it('respects forced locale', () => {
    const patient = patientFactory.build(undefined, { preferredLocale: 'tamil' });
    expect(patient.preferredLocale).toBe('ta');
  });

  it('builds list of N patients with unique IDs', () => {
    const patients = patientFactory.buildList(10);
    const ids = new Set(patients.map((p) => p.id));
    expect(ids.size).toBe(10);
  });

  it('injects comorbidities for primary condition', () => {
    const patient = patientFactory.build(undefined, { archetypeId: 'arch-004' }); // diabetic perio
    expect(Array.isArray(patient.comorbidConditionsIcd10)).toBe(true);
  });

  it('handles all 50 archetypes without throwing', () => {
    const archetypeIds = Array.from(
      { length: 50 },
      (_, i) => `arch-${String(i + 1).padStart(3, '0')}`,
    );
    for (const archetypeId of archetypeIds) {
      expect(() => patientFactory.build(undefined, { archetypeId })).not.toThrow();
    }
  });
});
