// ═══════════════════════════════════════════════════════════════
// FAMILY THREAD FACTORY — Common Indian pattern
// One phone number serves whole family. Mother books for child,
// father, in-laws. Critical for accurate consent + privacy.
// ═══════════════════════════════════════════════════════════════

import { defineFactory } from '../core';

type Relationship = 'SELF' | 'SPOUSE' | 'CHILD' | 'PARENT' | 'GRANDPARENT' | 'IN_LAW' | 'SIBLING';

interface FamilyMemberOutput {
  readonly id: string;
  readonly threadId: string;
  readonly primaryPatientId: string;
  readonly relatedPatientId: string;
  readonly relationship: Relationship;
  readonly isMinor: boolean;
  readonly canBookOnBehalf: boolean;
  readonly consentVersion: string;
  readonly createdAt: Date;
}

interface FamilyMemberTransient {
  readonly threadId: string;
  readonly primaryPatientId: string;
  readonly relatedPatientId: string;
  readonly relationship: Relationship;
  readonly isMinor?: boolean;
}

export const familyMemberFactory = defineFactory<FamilyMemberOutput, FamilyMemberTransient>({
  name: 'patient' as 'patient',
  defaultTransient: {
    threadId: 'unknown',
    primaryPatientId: 'unknown',
    relatedPatientId: 'unknown',
    relationship: 'SELF',
  },

  build: ({ sequence, transient }) => {
    return {
      id: `fam-${String(sequence).padStart(8, '0')}`,
      threadId: transient.threadId,
      primaryPatientId: transient.primaryPatientId,
      relatedPatientId: transient.relatedPatientId,
      relationship: transient.relationship,
      isMinor: transient.isMinor ?? transient.relationship === 'CHILD',
      canBookOnBehalf:
        transient.relationship === 'SELF' ||
        transient.relationship === 'SPOUSE' ||
        transient.relationship === 'CHILD' ||
        transient.relationship === 'PARENT' ||
        transient.relationship === 'GRANDPARENT',
      consentVersion: 'DPDP-2024-v1',
      createdAt: new Date(),
    };
  },

  persist: async (member) => member,
});
