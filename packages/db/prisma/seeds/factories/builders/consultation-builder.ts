// ═══════════════════════════════════════════════════════════════
// CONSULTATION BUILDER DSL
// ═══════════════════════════════════════════════════════════════

import type { Consultation, ConsultationStatus, LocaleCode, UrgencyLevel } from '@prisma/client';
import { consultationFactory } from '../clinical/consultation.factory';

export class ConsultationBuilder {
  private overrides: Partial<Consultation> = {};
  private transient: {
    patientId: string;
    userId: string;
    initiatedByUserId?: string;
    doctorId?: string | null;
    clinicId?: string | null;
    forceIcd10?: string;
    forceUrgency?: UrgencyLevel;
    forceStatus?: ConsultationStatus;
    locale?: LocaleCode;
    chiefComplaint?: string;
  };

  constructor(patientId: string, userId: string = 'test-user-' + patientId) {
    this.transient = { patientId, userId, initiatedByUserId: userId };
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

  inLocale(locale: LocaleCode): this {
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

  withUser(userId: string): this {
    this.transient.userId = userId;
    this.transient.initiatedByUserId = userId;
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

export const consultationFor = (patientId: string, userId?: string): ConsultationBuilder =>
  new ConsultationBuilder(patientId, userId);
