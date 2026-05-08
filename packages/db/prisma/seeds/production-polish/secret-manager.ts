// ═══════════════════════════════════════════════════════════════
// SECRET MANAGER — load secrets from env, .env.<NODE_ENV>, or AWS SM
// Source: oneuptime.com — fail-fast on missing required secrets
// ═══════════════════════════════════════════════════════════════

export interface SecretSpec {
  readonly key: string;
  readonly required: boolean;
  readonly description: string;
  readonly format?: RegExp;
}

export const SEED_REQUIRED_SECRETS: readonly SecretSpec[] = [
  {
    key: 'DATABASE_URL',
    required: true,
    description: 'Postgres connection string',
    format: /^postgresql:\/\//,
  },
  {
    key: 'SEED_ANONYMIZATION_SALT',
    required: false,
    description: 'Salt for deterministic SHA-3 masking',
  },
  { key: 'SENTRY_DSN', required: false, description: 'Sentry DSN', format: /^https:\/\// },
  { key: 'BETTER_STACK_LOGS_TOKEN', required: false, description: 'Better Stack token' },
  { key: 'AWS_REGION', required: false, description: 'AWS region for S3 uploads' },
  { key: 'AWS_S3_EXPORT_BUCKET', required: false, description: 'S3 bucket for exports' },
];

export interface SecretValidationReport {
  readonly valid: boolean;
  readonly missing: readonly string[];
  readonly malformed: readonly { key: string; expected: string }[];
  readonly redactedValues: Readonly<Record<string, string>>;
}

export function validateSecrets(
  specs: readonly SecretSpec[] = SEED_REQUIRED_SECRETS,
): SecretValidationReport {
  const missing: string[] = [];
  const malformed: { key: string; expected: string }[] = [];
  const redacted: Record<string, string> = {};

  for (const spec of specs) {
    const value = process.env[spec.key];
    if (!value) {
      if (spec.required) missing.push(spec.key);
      continue;
    }
    if (spec.format && !spec.format.test(value)) {
      malformed.push({ key: spec.key, expected: String(spec.format) });
      continue;
    }
    redacted[spec.key] = redact(spec.key, value);
  }

  return {
    valid: missing.length === 0 && malformed.length === 0,
    missing,
    malformed,
    redactedValues: redacted,
  };
}

function redact(key: string, value: string): string {
  const sensitive = /SECRET|PASSWORD|TOKEN|KEY|DSN|SALT/i.test(key);
  if (!sensitive) return value;
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

export function failFastIfInvalid(): void {
  const report = validateSecrets();
  if (!report.valid) {
    console.error('✗ Secret validation failed');
    for (const k of report.missing) console.error(`  Missing: ${k}`);
    for (const m of report.malformed)
      console.error(`  Malformed: ${m.key} (expected ${m.expected})`);
    process.exit(2);
  }
}
