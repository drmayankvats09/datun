// ═══════════════════════════════════════════════════════════════
// DPDP DATA REQUEST FACTORY — Patient export/delete/correct requests
// Source: Digital Personal Data Protection Act 2023 (India)
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type DpdpRequestType =
  | 'DATA_EXPORT'
  | 'DATA_DELETION'
  | 'DATA_CORRECTION'
  | 'CONSENT_WITHDRAWAL'
  | 'DATA_PORTABILITY'
  | 'PROCESSING_RESTRICTION'
  | 'OBJECTION_TO_PROCESSING';
type DpdpRequestStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'IDENTITY_VERIFICATION'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'PARTIALLY_COMPLETED'
  | 'EXPIRED';

interface DpdpRequestOutput {
  readonly id: string;
  readonly patientId: string;
  readonly requestType: DpdpRequestType;
  readonly status: DpdpRequestStatus;
  readonly submittedAt: Date;
  readonly identityVerifiedAt: Date | null;
  readonly identityVerificationMethod: 'OTP' | 'AADHAAR' | 'GOVT_ID_UPLOAD' | 'IN_PERSON' | null;
  readonly processingStartedAt: Date | null;
  readonly completedAt: Date | null;
  readonly slaTargetDate: Date;
  readonly slaBreached: boolean;
  readonly dataCategoriesRequested: readonly string[];
  readonly assignedDpoUserId: string | null;
  readonly rejectionReason: string | null;
  readonly downloadUrl: string | null;
  readonly downloadExpiresAt: Date | null;
  readonly downloadFormat: 'JSON' | 'CSV' | 'PDF' | 'ZIP_ALL' | null;
  readonly recordsAffected: number;
  readonly auditTrailLink: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface DpdpRequestTransient {
  readonly patientId: string;
  readonly requestType?: DpdpRequestType;
}

export const dpdpDataRequestFactory = defineFactory<DpdpRequestOutput, DpdpRequestTransient>({
  name: 'patient' as 'patient',
  defaultTransient: { patientId: 'unknown' },

  build: ({ sequence, faker, transient }) => {
    const requestType =
      transient.requestType ??
      faker.helpers.weightedArrayElement([
        { weight: 40, value: 'DATA_EXPORT' as const },
        { weight: 25, value: 'DATA_DELETION' as const },
        { weight: 15, value: 'CONSENT_WITHDRAWAL' as const },
        { weight: 10, value: 'DATA_CORRECTION' as const },
        { weight: 5, value: 'DATA_PORTABILITY' as const },
        { weight: 3, value: 'PROCESSING_RESTRICTION' as const },
        { weight: 2, value: 'OBJECTION_TO_PROCESSING' as const },
      ]);

    const status = faker.helpers.weightedArrayElement([
      { weight: 60, value: 'COMPLETED' as const },
      { weight: 12, value: 'PROCESSING' as const },
      { weight: 10, value: 'IDENTITY_VERIFICATION' as const },
      { weight: 8, value: 'UNDER_REVIEW' as const },
      { weight: 5, value: 'SUBMITTED' as const },
      { weight: 3, value: 'REJECTED' as const },
      { weight: 1, value: 'PARTIALLY_COMPLETED' as const },
      { weight: 1, value: 'EXPIRED' as const },
    ]);

    const submittedAt = faker.date.recent({ days: 90 });
    const slaTargetDate = new Date(submittedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    return {
      id: `dpdp-${String(sequence).padStart(10, '0')}`,
      patientId: transient.patientId,
      requestType,
      status,
      submittedAt,
      identityVerifiedAt: ['IDENTITY_VERIFICATION', 'PROCESSING', 'COMPLETED'].includes(status)
        ? faker.date.between({ from: submittedAt, to: new Date() })
        : null,
      identityVerificationMethod: ['IDENTITY_VERIFICATION', 'PROCESSING', 'COMPLETED'].includes(
        status,
      )
        ? faker.helpers.weightedArrayElement([
            { weight: 60, value: 'OTP' as const },
            { weight: 25, value: 'AADHAAR' as const },
            { weight: 10, value: 'GOVT_ID_UPLOAD' as const },
            { weight: 5, value: 'IN_PERSON' as const },
          ])
        : null,
      processingStartedAt: ['PROCESSING', 'COMPLETED', 'PARTIALLY_COMPLETED'].includes(status)
        ? faker.date.between({ from: submittedAt, to: new Date() })
        : null,
      completedAt:
        status === 'COMPLETED' || status === 'PARTIALLY_COMPLETED'
          ? faker.date.between({ from: submittedAt, to: new Date() })
          : null,
      slaTargetDate,
      slaBreached: status === 'EXPIRED' || (status === 'COMPLETED' && faker.number.float() < 0.05),
      dataCategoriesRequested: faker.helpers.arrayElements(
        [
          'BASIC_PII',
          'MEDICAL_HISTORY',
          'CURRENT_MEDICATIONS',
          'PHOTOS',
          'INSURANCE',
          'PAYMENT_HISTORY',
        ],
        { min: 1, max: 4 },
      ),
      assignedDpoUserId:
        status !== 'SUBMITTED' ? `admin-${faker.number.int({ min: 1, max: 3 })}` : null,
      rejectionReason:
        status === 'REJECTED'
          ? faker.helpers.arrayElement([
              'Identity verification failed',
              'Legal retention requirement supersedes deletion',
              'Insurance claim active — cannot delete during pendency',
            ])
          : null,
      downloadUrl:
        status === 'COMPLETED' && requestType === 'DATA_EXPORT'
          ? `https://r2.datunai.com/dpdp-exports/dpdp-${sequence}.zip`
          : null,
      downloadExpiresAt:
        status === 'COMPLETED' && requestType === 'DATA_EXPORT'
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : null,
      downloadFormat: status === 'COMPLETED' && requestType === 'DATA_EXPORT' ? 'ZIP_ALL' : null,
      recordsAffected: status === 'COMPLETED' ? faker.number.int({ min: 1, max: 500 }) : 0,
      auditTrailLink: `audit/dpdp/${sequence}`,
      createdAt: submittedAt,
      updatedAt: new Date(),
    };
  },

  persist: async (req) => req,
});
