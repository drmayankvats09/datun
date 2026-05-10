// ═══════════════════════════════════════════════════════════════
// CONSENT RECORD FACTORY — DPDP Act 2023 mandatory tracking
// Per patient × per data category × per processing purpose
// Source: Digital Personal Data Protection Act 2023 (India)
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type DataCategory =
  | 'BASIC_PII'
  | 'MEDICAL_HISTORY'
  | 'CURRENT_MEDICATIONS'
  | 'PHOTOS'
  | 'GENETIC_DATA'
  | 'FAMILY_HISTORY'
  | 'INSURANCE'
  | 'BIOMETRIC';
type Purpose =
  | 'TRIAGE'
  | 'TREATMENT'
  | 'BILLING'
  | 'INSURANCE_CLAIM'
  | 'AI_TRAINING'
  | 'ANALYTICS'
  | 'MARKETING'
  | 'RESEARCH';
type ConsentMethod =
  | 'EXPLICIT_CHECKBOX'
  | 'OTP_VERIFIED'
  | 'DIGITAL_SIGNATURE'
  | 'WHATSAPP_REPLY'
  | 'IN_PERSON_FORM';

interface ConsentRecordOutput {
  readonly id: string;
  readonly patientId: string;
  readonly dataCategory: DataCategory;
  readonly purpose: Purpose;
  readonly granted: boolean;
  readonly grantedAt: Date | null;
  readonly revokedAt: Date | null;
  readonly consentMethod: ConsentMethod;
  readonly consentVersion: string;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly retentionPeriodDays: number;
  readonly canBeWithdrawn: boolean;
  readonly legalBasis: 'CONSENT' | 'CONTRACT' | 'LEGITIMATE_INTEREST' | 'LEGAL_OBLIGATION';
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface ConsentRecordTransient {
  readonly patientId: string;
  readonly dataCategory?: DataCategory;
  readonly purpose?: Purpose;
}

export const consentRecordFactory = defineFactory<ConsentRecordOutput, ConsentRecordTransient>({
  name: 'patient' as 'patient',
  defaultTransient: { patientId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const dataCategory =
      transient.dataCategory ??
      faker.helpers.arrayElement<DataCategory>([
        'BASIC_PII',
        'MEDICAL_HISTORY',
        'CURRENT_MEDICATIONS',
        'PHOTOS',
        'INSURANCE',
      ]);
    const purpose =
      transient.purpose ??
      faker.helpers.weightedArrayElement([
        { weight: 40, value: 'TRIAGE' as const },
        { weight: 25, value: 'TREATMENT' as const },
        { weight: 15, value: 'BILLING' as const },
        { weight: 10, value: 'AI_TRAINING' as const },
        { weight: 5, value: 'INSURANCE_CLAIM' as const },
        { weight: 3, value: 'ANALYTICS' as const },
        { weight: 2, value: 'MARKETING' as const },
      ]);

    const granted = faker.datatype.boolean({ probability: 0.92 });
    const grantedAt = granted ? faker.date.past({ years: 1 }) : null;

    return {
      id: `consent-${String(sequence).padStart(10, '0')}`,
      patientId: transient.patientId,
      dataCategory,
      purpose,
      granted,
      grantedAt,
      revokedAt:
        !granted || faker.datatype.boolean({ probability: 0.03 })
          ? faker.date.recent({ days: 90 })
          : null,
      consentMethod: faker.helpers.weightedArrayElement([
        { weight: 50, value: 'EXPLICIT_CHECKBOX' as const },
        { weight: 25, value: 'OTP_VERIFIED' as const },
        { weight: 15, value: 'WHATSAPP_REPLY' as const },
        { weight: 7, value: 'DIGITAL_SIGNATURE' as const },
        { weight: 3, value: 'IN_PERSON_FORM' as const },
      ]),
      consentVersion: 'DPDP-2024-v1.2',
      ipAddress: faker.internet.ipv4(),
      userAgent: faker.internet.userAgent(),
      retentionPeriodDays: purpose === 'TREATMENT' || purpose === 'BILLING' ? 2555 : 730,
      canBeWithdrawn: purpose !== 'BILLING' && purpose !== 'INSURANCE_CLAIM',
      legalBasis:
        purpose === 'BILLING'
          ? 'CONTRACT'
          : purpose === 'INSURANCE_CLAIM'
            ? 'LEGAL_OBLIGATION'
            : 'CONSENT',
      createdAt: grantedAt ?? new Date(),
      updatedAt: new Date(),
    };
  },

  persist: async (consent) => consent,
});
