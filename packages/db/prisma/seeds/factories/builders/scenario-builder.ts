// ═══════════════════════════════════════════════════════════════
// SCENARIO BUILDER DSL — Compound multi-entity scenarios
// Stripe-style fluent compound construction
//
// Usage:
//   const result = scenario()
//     .withClinic((c) => c.inCityTier('tier-1').ofTier('PRO'))
//     .withPatient((p) => p.withArchetype('arch-001').pregnant())
//     .withPatient((p) => p.withArchetype('arch-005').withAge(8))
//     .withConsultations(2, (c) => c.withStatus('COMPLETED'))
//     .build();
// ═══════════════════════════════════════════════════════════════

import type { Clinic, Consultation, Patient } from '@prisma/client';
import { ClinicBuilder, clinic as clinicB } from './clinic-builder';
import { PatientBuilder, patient as patientB } from './patient-builder';
import { ConsultationBuilder, consultationFor } from './consultation-builder';

export interface ScenarioResult {
  readonly clinic: Clinic | null;
  readonly patients: readonly Patient[];
  readonly consultations: readonly Consultation[];
}

export class ScenarioBuilder {
  private clinicResult: Clinic | null = null;
  private patientResults: Patient[] = [];
  private consultationResults: Consultation[] = [];

  /** Add a clinic to the scenario via builder chain */
  withClinic(builderFn: (b: ClinicBuilder) => ClinicBuilder): this {
    this.clinicResult = builderFn(clinicB()).build();
    return this;
  }

  /** Add a patient — auto-links to clinic if one exists */
  withPatient(builderFn: (b: PatientBuilder) => PatientBuilder): this {
    let pb = patientB();
    if (this.clinicResult) {
      pb = pb.withClinic(this.clinicResult.id);
    }
    this.patientResults.push(builderFn(pb).build());
    return this;
  }

  /** Add N patients quickly with same builder config */
  withPatients(
    count: number,
    builderFn: (b: PatientBuilder, index: number) => PatientBuilder,
  ): this {
    for (let i = 0; i < count; i++) {
      let pb = patientB();
      if (this.clinicResult) {
        pb = pb.withClinic(this.clinicResult.id);
      }
      this.patientResults.push(builderFn(pb, i).build());
    }
    return this;
  }

  /** Generate consultations for every patient already added */
  withConsultations(
    perPatient: number,
    builderFn?: (
      b: ConsultationBuilder,
      patientIndex: number,
      consultationIndex: number,
    ) => ConsultationBuilder,
  ): this {
    this.patientResults.forEach((patient, pIdx) => {
      for (let i = 0; i < perPatient; i++) {
        // Pass patient.userId so consultation factory's required userId field is populated.
        // Fallback to synthetic test ID for legacy/unit-test patients without userId set.
        const userId = (patient as { userId?: string }).userId ?? `test-user-${patient.id}`;
        let cb = consultationFor(patient.id, userId);
        if (this.clinicResult) cb = cb.atClinic(this.clinicResult.id);
        if (builderFn) cb = builderFn(cb, pIdx, i);
        this.consultationResults.push(cb.build());
      }
    });
    return this;
  }

  /** Reset and start fresh */
  reset(): this {
    this.clinicResult = null;
    this.patientResults = [];
    this.consultationResults = [];
    return this;
  }

  /** Materialize the scenario */
  build(): ScenarioResult {
    return {
      clinic: this.clinicResult,
      patients: [...this.patientResults],
      consultations: [...this.consultationResults],
    };
  }
}

/** Entry point — fluent API */
export const scenario = (): ScenarioBuilder => new ScenarioBuilder();
