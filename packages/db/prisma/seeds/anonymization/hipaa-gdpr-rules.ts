// ═══════════════════════════════════════════════════════════════
// HIPAA SAFE HARBOR + GDPR PSEUDONYMIZATION RULES
// HIPAA: 18 identifiers per Safe Harbor §164.514(b)(2)
// GDPR: pseudonymization per Art.4(5)
//
// CONVENTION: PascalCase model names — matches Prisma client convention.
// ═══════════════════════════════════════════════════════════════

import type { FieldRule } from './dpdp-rules';

/** HIPAA Safe Harbor — 18 identifiers must be removed/masked */
export const HIPAA_RULES: readonly FieldRule[] = [
  {
    model: 'Patient',
    field: 'fullName',
    strategy: { kind: 'fake', faker: 'name' },
    justification: 'HIPAA SH §1',
  },
  {
    model: 'Patient',
    field: 'addressLine1',
    strategy: { kind: 'fake', faker: 'address' },
    justification: 'HIPAA SH §2 geographic',
  },
  {
    model: 'Patient',
    field: 'pincode',
    strategy: { kind: 'truncate', keepChars: 3 },
    justification: 'HIPAA SH §2 — first 3 digits OK if pop>20K',
  },
  {
    model: 'Patient',
    field: 'dateOfBirth',
    strategy: { kind: 'truncate', keepChars: 4 },
    justification: 'HIPAA SH §3 — year only for ≤89',
  },
  { model: 'Patient', field: 'phone', strategy: { kind: 'null' }, justification: 'HIPAA SH §4' },
  { model: 'Patient', field: 'email', strategy: { kind: 'null' }, justification: 'HIPAA SH §6' },
  {
    model: 'Patient',
    field: 'aadhaar',
    strategy: { kind: 'null' },
    justification: 'HIPAA SH §7 SSN equivalent',
  },
  {
    model: 'Patient',
    field: 'mrn',
    strategy: { kind: 'pseudonym', prefix: 'mrn' },
    justification: 'HIPAA SH §8 medical record number',
  },
  {
    model: 'Consultation',
    field: 'photoUrls',
    strategy: { kind: 'redact', placeholder: '[]' },
    justification: 'HIPAA SH §17 photographic',
  },
  { model: 'User', field: 'lastIp', strategy: { kind: 'null' }, justification: 'HIPAA SH §15 IP' },
];

/** GDPR pseudonymization per Art.4(5) + minimization per Art.32 */
export const GDPR_RULES: readonly FieldRule[] = [
  {
    model: 'Patient',
    field: 'fullName',
    strategy: { kind: 'pseudonym', prefix: 'gdpr-subject' },
    justification: 'GDPR Art.4(5) pseudonymization',
  },
  {
    model: 'Patient',
    field: 'email',
    strategy: { kind: 'hash', preservePrefix: 0, preserveSuffix: 4 },
    justification: 'GDPR Art.4(5)',
  },
  {
    model: 'Patient',
    field: 'phone',
    strategy: { kind: 'hash', preservePrefix: 4, outputLength: 8 },
    justification: 'GDPR Art.4(5)',
  },
  {
    model: 'Patient',
    field: 'addressLine1',
    strategy: { kind: 'redact' },
    justification: 'GDPR Art.32 minimization',
  },
  {
    model: 'User',
    field: 'lastIp',
    strategy: { kind: 'truncate', keepChars: 7 },
    justification: 'GDPR Art.32 — keep /24 only',
  },
];
