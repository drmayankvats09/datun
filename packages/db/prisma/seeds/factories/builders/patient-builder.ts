// ═══════════════════════════════════════════════════════════════
// PATIENT BUILDER DSL — Fluent chainable construction
// Pattern: Stripe Java SDK builders + Lombok @Builder
//
// Usage:
//   const patient = patient()
//     .withArchetype('arch-001')
//     .withClinic('clinic-001')
//     .withLocale('hindi')
//     .pregnant()
//     .withAllergies(['penicillin'])
//     .build();
// ═══════════════════════════════════════════════════════════════

import type { Patient } from '@prisma/client';
import { patientFactory } from '../patient/patient.factory';

export class PatientBuilder {
  private overrides: Partial<Patient> = {};
  private transient: {
    archetypeId?: string;
    userId?: string;
    homeClinicId?: string;
    preferredLocale?:
      | 'hindi'
      | 'english'
      | 'punjabi'
      | 'bengali'
      | 'tamil'
      | 'telugu'
      | 'marathi'
      | 'gujarati';
  } = {};

  withArchetype(archetypeId: string): this {
    this.transient.archetypeId = archetypeId;
    return this;
  }

  withUserId(userId: string): this {
    this.transient.userId = userId;
    return this;
  }

  withClinic(clinicId: string): this {
    this.transient.homeClinicId = clinicId;
    return this;
  }

  withLocale(
    locale:
      | 'hindi'
      | 'english'
      | 'punjabi'
      | 'bengali'
      | 'tamil'
      | 'telugu'
      | 'marathi'
      | 'gujarati',
  ): this {
    this.transient.preferredLocale = locale;
    return this;
  }

  pregnant(): this {
    this.overrides = { ...this.overrides, pregnancyStatus: 'PREGNANT' };
    return this;
  }

  withAge(years: number): this {
    this.overrides = { ...this.overrides, ageYears: years };
    return this;
  }

  withAllergies(allergies: string[]): this {
    this.overrides = {
      ...this.overrides,
      knownAllergies: JSON.stringify(allergies) as Patient['knownAllergies'],
    };
    return this;
  }

  withMedications(medications: string[]): this {
    this.overrides = {
      ...this.overrides,
      currentMedications: JSON.stringify(medications) as Patient['currentMedications'],
    };
    return this;
  }

  smoker(): this {
    this.overrides = { ...this.overrides, smokingStatus: 'CURRENT_SMOKER' };
    return this;
  }

  nonSmoker(): this {
    this.overrides = { ...this.overrides, smokingStatus: 'NEVER' };
    return this;
  }

  build(): Patient {
    return patientFactory.build(this.overrides, this.transient);
  }
}

export const patient = (): PatientBuilder => new PatientBuilder();
