// ═══════════════════════════════════════════════════════════════
// DPDP ACT 2023 RULES — India digital personal data protection
// Source: India DPDP Act + healthcare-specific data fiduciary obligations.
//
// CONVENTION (FAANG-grade): Model names use PascalCase singular —
// matches Prisma's canonical client convention. Test files MUST pass
// model name as PascalCase (e.g., 'Patient', not 'patient').
// AnonymizationEngine.anonymizeRecord(modelName) does strict equality match.
// ═══════════════════════════════════════════════════════════════

import type { MaskingStrategy } from './deterministic-masker';

export interface FieldRule {
  readonly model: string;
  readonly field: string;
  readonly strategy: MaskingStrategy;
  readonly justification: string;
}

// ─── Patient PII (DPDP §2(t) personal data + sensitive personal data) ───
export const DPDP_PATIENT_RULES: readonly FieldRule[] = [
  // Direct identifiers
  {
    model: 'Patient',
    field: 'name',
    strategy: { kind: 'fake', faker: 'name' },
    justification: 'DPDP §2(t) personal data — fallback for unstructured name',
  },
  {
    model: 'Patient',
    field: 'firstName',
    strategy: { kind: 'fake', faker: 'name' },
    justification: 'DPDP §2(t) personal data',
  },
  {
    model: 'Patient',
    field: 'lastName',
    strategy: { kind: 'fake', faker: 'name' },
    justification: 'DPDP §2(t) personal data',
  },
  {
    model: 'Patient',
    field: 'fullName',
    strategy: { kind: 'fake', faker: 'name' },
    justification: 'DPDP §2(t) personal data',
  },
  {
    model: 'Patient',
    field: 'phone',
    strategy: { kind: 'pseudonym', prefix: 'phone-anon' },
    justification: 'DPDP §2(t) personal data — pseudonymized to obviously-synthetic value',
  },
  {
    model: 'Patient',
    field: 'email',
    strategy: { kind: 'fake', faker: 'email' },
    justification: 'DPDP §2(t) personal data',
  },

  // Address
  {
    model: 'Patient',
    field: 'addressLine1',
    strategy: { kind: 'fake', faker: 'address' },
    justification: 'DPDP §2(t) personal data',
  },
  {
    model: 'Patient',
    field: 'addressLine2',
    strategy: { kind: 'redact', placeholder: '[redacted]' },
    justification: 'DPDP §2(t) personal data',
  },
  {
    model: 'Patient',
    field: 'pincode',
    strategy: { kind: 'truncate', keepChars: 3 },
    justification: 'k-anonymity quasi-identifier',
  },

  // Demographics (preserved for medical research utility — DPDP §17 healthcare exception)
  {
    model: 'Patient',
    field: 'dateOfBirth',
    strategy: { kind: 'keep' },
    justification: 'medical relevance — age preserved',
  },

  // Sensitive identifiers (DPDP §2(t) — pseudonymized via fake)
  {
    model: 'Patient',
    field: 'aadhaar',
    strategy: { kind: 'fake', faker: 'phone' },
    justification: 'DPDP §2(t) sensitive — synthetic replacement',
  },
  {
    model: 'Patient',
    field: 'pan',
    strategy: { kind: 'fake', faker: 'phone' },
    justification: 'DPDP §2(t) sensitive — synthetic replacement',
  },

  // Medical (preserved per DPDP §17 healthcare research exception)
  {
    model: 'Patient',
    field: 'medicalConditions',
    strategy: { kind: 'keep' },
    justification: 'medical research utility (DPDP §17)',
  },
  {
    model: 'Patient',
    field: 'currentMedications',
    strategy: { kind: 'keep' },
    justification: 'medical research utility (DPDP §17)',
  },
  {
    model: 'Patient',
    field: 'knownAllergies',
    strategy: { kind: 'keep' },
    justification: 'medical research utility (DPDP §17)',
  },
];

// ─── User auth + identity ───
export const DPDP_USER_RULES: readonly FieldRule[] = [
  {
    model: 'User',
    field: 'email',
    strategy: { kind: 'fake', faker: 'email' },
    justification: 'DPDP §2(t)',
  },
  {
    model: 'User',
    field: 'phone',
    strategy: { kind: 'pseudonym', prefix: 'phone-anon' },
    justification: 'DPDP §2(t) — pseudonymized to obviously-synthetic value',
  },
  {
    model: 'User',
    field: 'passwordHash',
    strategy: { kind: 'redact', placeholder: '$2b$10$ANONYMIZED' },
    justification: 'DPDP §2(t) auth secret',
  },
  {
    model: 'User',
    field: 'lastIp',
    strategy: { kind: 'null' },
    justification: 'DPDP §2(t) network identifier',
  },
];

// ─── Consultation transcripts ───
export const DPDP_CONSULTATION_RULES: readonly FieldRule[] = [
  {
    model: 'Consultation',
    field: 'chiefComplaint',
    strategy: { kind: 'keep' },
    justification: 'medical research utility (DPDP §17)',
  },
  {
    model: 'Consultation',
    field: 'fullConversation',
    strategy: { kind: 'redact', placeholder: '[transcript-redacted]' },
    justification: 'free-text PII leak risk',
  },
];

// ─── Payment data (PCI-DSS overlay) ───
export const DPDP_PAYMENT_RULES: readonly FieldRule[] = [
  {
    model: 'Payment',
    field: 'cardLast4',
    strategy: { kind: 'redact', placeholder: '****' },
    justification: 'PCI-DSS',
  },
  {
    model: 'Payment',
    field: 'razorpayPaymentId',
    strategy: { kind: 'pseudonym', prefix: 'rzp' },
    justification: 'reversible link broken',
  },
];

export const DPDP_FULL_RULESET: readonly FieldRule[] = [
  ...DPDP_PATIENT_RULES,
  ...DPDP_USER_RULES,
  ...DPDP_CONSULTATION_RULES,
  ...DPDP_PAYMENT_RULES,
];
