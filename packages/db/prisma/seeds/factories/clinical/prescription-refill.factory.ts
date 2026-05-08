// ═══════════════════════════════════════════════════════════════
// PRESCRIPTION REFILL FACTORY — "Mujhe vahi dawa fir chahiye" pattern
// Common in chronic care + post-extraction recovery scenarios
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

interface PrescriptionRefillOutput {
  readonly id: string;
  readonly originalPrescriptionId: string;
  readonly patientId: string;
  readonly requestedBy: string; // patient userId
  readonly requestedAt: Date;
  readonly status: 'PENDING' | 'APPROVED' | 'DENIED' | 'NEEDS_CONSULTATION' | 'EXPIRED';
  readonly aiAutoApproved: boolean;
  readonly aiConfidenceScore: number | null;
  readonly safetyChecksPassed: boolean;
  readonly safetyFlags: readonly string[];
  readonly reviewedBy: string | null;
  readonly reviewedAt: Date | null;
  readonly approvalNotes: string | null;
  readonly denialReason: string | null;
  readonly newPrescriptionId: string | null;
  readonly createdAt: Date;
}

interface PrescriptionRefillTransient {
  readonly originalPrescriptionId: string;
  readonly patientId: string;
  readonly requestedBy: string;
}

export const prescriptionRefillFactory = defineFactory<
  PrescriptionRefillOutput,
  PrescriptionRefillTransient
>({
  name: 'prescription' as 'prescription',
  defaultTransient: {
    originalPrescriptionId: 'unknown',
    patientId: 'unknown',
    requestedBy: 'unknown',
  },

  build: ({ sequence, faker, transient }) => {
    const status = faker.helpers.weightedArrayElement([
      { weight: 50, value: 'APPROVED' as const },
      { weight: 25, value: 'NEEDS_CONSULTATION' as const },
      { weight: 12, value: 'PENDING' as const },
      { weight: 8, value: 'DENIED' as const },
      { weight: 5, value: 'EXPIRED' as const },
    ]);

    const requestedAt = faker.date.recent({ days: 90 });
    const aiAutoApproved = status === 'APPROVED' && faker.datatype.boolean({ probability: 0.6 });

    return {
      id: `refill-${String(sequence).padStart(10, '0')}`,
      originalPrescriptionId: transient.originalPrescriptionId,
      patientId: transient.patientId,
      requestedBy: transient.requestedBy,
      requestedAt,
      status,
      aiAutoApproved,
      aiConfidenceScore: aiAutoApproved ? faker.number.float({ min: 0.85, max: 0.99 }) : null,
      safetyChecksPassed: status !== 'DENIED',
      safetyFlags:
        status === 'DENIED'
          ? faker.helpers.arrayElements(
              [
                'controlled-substance',
                'frequent-refill-suspicious',
                'allergy-not-rechecked',
                'pregnancy-status-changed',
              ],
              { min: 1, max: 2 },
            )
          : [],
      reviewedBy:
        !aiAutoApproved && status !== 'PENDING'
          ? `doctor-${String(faker.number.int({ min: 1, max: 200 })).padStart(6, '0')}`
          : null,
      reviewedAt: !aiAutoApproved && status !== 'PENDING' ? faker.date.recent({ days: 7 }) : null,
      approvalNotes: status === 'APPROVED' ? 'Refill approved as per protocol' : null,
      denialReason: status === 'DENIED' ? 'Requires fresh consultation' : null,
      newPrescriptionId:
        status === 'APPROVED'
          ? `rx-${String(faker.number.int({ min: 1, max: 1000 })).padStart(8, '0')}`
          : null,
      createdAt: requestedAt,
    };
  },

  persist: async (refill) => refill,
});
