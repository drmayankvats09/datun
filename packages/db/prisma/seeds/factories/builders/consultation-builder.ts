// ═══════════════════════════════════════════════════════════════
// CONSULTATION BUILDER DSL
// ═══════════════════════════════════════════════════════════════

import type { Consultation, ConsultationStatus, UrgencyLevel } from '@prisma/client';
import { consultationFactory } from '../clinical/consultation.factory';

export class ConsultationBuilder {
  private overrides: Partial<Consultation> = {};
  private transient: {
    patientId: string;
    doctorId?: string | null;
    clinicId?: string | null;
    forceIcd10?: string;
    forceUrgency?: UrgencyLevel;
    forceStatus?: ConsultationStatus;
    locale?:
      | 'hindi'
      | 'english'
      | 'punjabi'
      | 'bengali'
      | 'tamil'
      | 'telugu'
      | 'marathi'
      | 'gujarati';
    chiefComplaint?: string;
  };

  constructor(patientId: string) {
    this.transient = { patientId };
  }

  forCondition(icd10: string): this {
    this.transient.forceIcd10 = icd10;
    return this;
  }

  withUrgency(urgency: UrgencyLevel): this {
    this.transient.forceUrgency = urgency;
    return this;
  }

  withStatus(status: ConsultationStatus): this {
    this.transient.forceStatus = status;
    return this;
  }

  inLocale(
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
    this.transient.locale = locale;
    return this;
  }

  withChiefComplaint(complaint: string): this {
    this.transient.chiefComplaint = complaint;
    return this;
  }

  withDoctor(doctorId: string): this {
    this.transient.doctorId = doctorId;
    return this;
  }

  atClinic(clinicId: string): this {
    this.transient.clinicId = clinicId;
    return this;
  }

  emergency(): this {
    this.transient.forceUrgency = 'EMERGENCY';
    return this;
  }

  build(): Consultation {
    return consultationFactory.build(this.overrides, this.transient);
  }
}

export const consultationFor = (patientId: string): ConsultationBuilder =>
  new ConsultationBuilder(patientId);
