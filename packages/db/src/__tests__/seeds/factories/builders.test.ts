// ═══════════════════════════════════════════════════════════════
// BUILDERS DSL TESTS — Verify chainable API behaves correctly
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { resetSequences } from '../../../../prisma/seeds/factories/core/sequence';
import {
  patient,
  clinic,
  consultationFor,
  scenario,
} from '../../../../prisma/seeds/factories/builders';

describe('Builders DSL', () => {
  beforeEach(() => resetSequences(42));

  it('PatientBuilder — chains overrides correctly', () => {
    const p = patient()
      .withArchetype('arch-001')
      .withLocale('hindi')
      .pregnant()
      .withAge(28)
      .withAllergies(['penicillin'])
      .build();

    expect(p.preferredLocale).toBe('hi');
    expect(p.pregnancyStatus).toBe('PREGNANT');
    expect(p.ageYears).toBe(28);
    expect(JSON.parse(p.knownAllergies as string)).toContain('penicillin');
  });

  it('ClinicBuilder — chains correctly', () => {
    const c = clinic()
      .inCityTier('tier-1')
      .ofTier('PRO')
      .acceptsEmergencies()
      .acceptsInsurance()
      .build();

    expect(c.subscriptionTier).toBe('PRO');
    expect(c.acceptsEmergencies).toBe(true);
    expect(c.acceptsInsurance).toBe(true);
  });

  it('ConsultationBuilder — chains correctly', () => {
    const c = consultationFor('patient-test-001')
      .forCondition('K04.0')
      .withUrgency('URGENT')
      .withStatus('COMPLETED')
      .inLocale('hindi')
      .build();

    expect(c.patientId).toBe('patient-test-001');
    expect(c.primaryDiagnosisIcd10).toBe('K04.0');
    expect(c.urgency).toBe('URGENT');
    expect(c.status).toBe('COMPLETED');
  });

  it('ScenarioBuilder — composes full scenario', () => {
    const result = scenario()
      .withClinic((c) => c.inCityTier('tier-2').ofTier('STARTER'))
      .withPatients(3, (p) => p.withArchetype('arch-001'))
      .withConsultations(2, (c) => c.withStatus('COMPLETED'))
      .build();

    expect(result.clinic).not.toBeNull();
    expect(result.patients).toHaveLength(3);
    expect(result.consultations).toHaveLength(6); // 3 patients × 2 consultations

    // Verify all consultations link to right patient + clinic
    result.consultations.forEach((c) => {
      expect(result.patients.some((p) => p.id === c.patientId)).toBe(true);
      expect(c.clinicId).toBe(result.clinic!.id);
    });
  });
});
