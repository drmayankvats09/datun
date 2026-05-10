// ═══════════════════════════════════════════════════════════════
// ANONYMIZATION WRAPPER — PII protection for prod-like seeds
// Used when pulling production data into staging/demo environments.
// ═══════════════════════════════════════════════════════════════

import { createHash } from 'node:crypto';

export type AnonymizationStrategy =
  | 'HASH'
  | 'REDACT'
  | 'PSEUDONYMIZE'
  | 'TRUNCATE'
  | 'NULL_OUT'
  | 'KEEP';

export interface FieldAnonymizationRule {
  readonly field: string;
  readonly strategy: AnonymizationStrategy;
  readonly preservePrefix?: number;
  readonly preserveSuffix?: number;
}

const SALT = process.env.SEED_ANONYMIZATION_SALT ?? 'datun-default-salt-CHANGE-ME-IN-PROD';

export function anonymizeField(
  value: unknown,
  strategy: AnonymizationStrategy,
  opts: { preservePrefix?: number; preserveSuffix?: number } = {},
): unknown {
  if (value === null || value === undefined) return value;
  const str = String(value);

  switch (strategy) {
    case 'KEEP':
      return value;
    case 'NULL_OUT':
      return null;
    case 'REDACT':
      return '[REDACTED]';
    case 'TRUNCATE':
      return str.slice(0, 4);
    case 'HASH': {
      const h = createHash('sha256')
        .update(SALT + str)
        .digest('hex')
        .slice(0, 16);
      const prefix = opts.preservePrefix ? str.slice(0, opts.preservePrefix) : '';
      const suffix = opts.preserveSuffix ? str.slice(-opts.preserveSuffix) : '';
      return `${prefix}${h}${suffix}`;
    }
    case 'PSEUDONYMIZE': {
      // Deterministic but reversible-resistant
      const hash = createHash('sha256')
        .update(SALT + str)
        .digest('hex');
      const num = parseInt(hash.slice(0, 8), 16);
      return `pseudo-${num.toString(36)}`;
    }
  }
}

export function anonymizeRecord<T extends Record<string, unknown>>(
  record: T,
  rules: readonly FieldAnonymizationRule[],
): T {
  const result: Record<string, unknown> = { ...record };
  for (const rule of rules) {
    if (rule.field in result) {
      result[rule.field] = anonymizeField(result[rule.field], rule.strategy, {
        preservePrefix: rule.preservePrefix,
        preserveSuffix: rule.preserveSuffix,
      });
    }
  }
  return result as T;
}

/** Standard PII rules for Datun patient records */
export const PATIENT_PII_RULES: readonly FieldAnonymizationRule[] = [
  { field: 'firstName', strategy: 'PSEUDONYMIZE' },
  { field: 'lastName', strategy: 'PSEUDONYMIZE' },
  { field: 'fullName', strategy: 'PSEUDONYMIZE' },
  { field: 'phone', strategy: 'HASH', preservePrefix: 4 },
  { field: 'email', strategy: 'HASH', preserveSuffix: 4 },
  { field: 'dateOfBirth', strategy: 'KEEP' }, // age is medically relevant
  { field: 'medicalConditions', strategy: 'KEEP' }, // medical context preserved
  { field: 'currentMedications', strategy: 'KEEP' },
  { field: 'knownAllergies', strategy: 'KEEP' },
];
