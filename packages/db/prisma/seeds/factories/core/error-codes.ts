// ═══════════════════════════════════════════════════════════════
// ERROR CODES — Structured codes + helper for seed errors (B-2 v2)
//
// THE PROBLEM:
//   Modules throw template-literal strings like `Need 50 owner users`.
//   The function signature expects SeedErrorCode enum (16 fixed values).
//   Result: ~10 errors across module-helpers + module files.
//
// THE SOLUTION:
//   - SEED_ERROR_CODES                : registry of fixed codes
//   - SeedErrorCode                   : type derived from registry
//   - seedError(code, message?, meta?): structured error builder
//   - SeedError                       : Error subclass with structured fields
//
// Pattern: Stripe API error codes + AWS SDK error class hierarchy.
// ═══════════════════════════════════════════════════════════════

// ───────────────────────────────────────────────────────────────
// ERROR CODE REGISTRY — Fixed enum-like values
// ───────────────────────────────────────────────────────────────

/**
 * Structured error codes for telemetry + Sentry grouping.
 *
 * Format: SEED_<CATEGORY>_<SPECIFIC>
 * Categories: PROD, FK, SCHEMA, IDEMPOTENCY, IO, CLI, ANON, MODULE, DEPENDENCY,
 *             INVARIANT, QUOTA, DRIFT, DETERMINISM
 *
 * Adding new codes: append here, never reuse existing keys.
 */
export const SEED_ERROR_CODES = {
  // Production safety violations (CRITICAL — page on call)
  PROD_NODE_ENV: 'SEED_PROD_NODE_ENV',
  PROD_DATABASE_URL: 'SEED_PROD_DATABASE_URL',
  PROD_NO_FORCE_FLAG: 'SEED_PROD_NO_FORCE_FLAG',

  // Foreign key / referential integrity
  FK_ORPHAN_DETECTED: 'SEED_FK_ORPHAN_DETECTED',
  FK_PARENT_MISSING: 'SEED_FK_PARENT_MISSING',
  FK_CYCLE_DETECTED: 'SEED_FK_CYCLE_DETECTED',

  // Schema mismatch
  SCHEMA_MISMATCH: 'SEED_SCHEMA_MISMATCH',
  SCHEMA_FIELD_MISSING: 'SEED_SCHEMA_FIELD_MISSING',
  SCHEMA_ENUM_VALUE_INVALID: 'SEED_SCHEMA_ENUM_VALUE_INVALID',

  // Idempotency / determinism
  IDEMPOTENCY_DUPLICATE_INSERT: 'SEED_IDEMPOTENCY_DUPLICATE_INSERT',
  IDEMPOTENCY_NON_DETERMINISTIC: 'SEED_IDEMPOTENCY_NON_DETERMINISTIC',
  DETERMINISM_FAILED: 'SEED_DETERMINISM_FAILED',

  // I/O failures
  IO_DB_UNREACHABLE: 'SEED_IO_DB_UNREACHABLE',
  IO_BACKUP_FAILED: 'SEED_IO_BACKUP_FAILED',
  IO_BACKUP_RESTORE_FAILED: 'SEED_IO_BACKUP_RESTORE_FAILED',

  // CLI argument parsing
  CLI_UNKNOWN_COMMAND: 'SEED_CLI_UNKNOWN_COMMAND',
  CLI_INVALID_FLAG: 'SEED_CLI_INVALID_FLAG',
  CLI_MISSING_REQUIRED: 'SEED_CLI_MISSING_REQUIRED',

  // Anonymization
  ANON_PII_LEAK: 'SEED_ANON_PII_LEAK',
  ANON_REGEX_FAILED: 'SEED_ANON_REGEX_FAILED',
  ANONYMIZATION_FAILED: 'SEED_ANONYMIZATION_FAILED',

  // Module execution
  MODULE_TIMEOUT: 'SEED_MODULE_TIMEOUT',
  MODULE_TRANSACTION_ROLLBACK: 'SEED_MODULE_TRANSACTION_ROLLBACK',
  MODULE_DEPENDENCY_FAILED: 'SEED_MODULE_DEPENDENCY_FAILED',
  MODULE_NOT_ALLOWED: 'SEED_MODULE_NOT_ALLOWED',
  MODULE_INSUFFICIENT_DEPENDENCIES: 'SEED_MODULE_INSUFFICIENT_DEPENDENCIES',

  // Quota / scale
  QUOTA_EXCEEDED: 'SEED_QUOTA_EXCEEDED',

  // Data quality
  INVARIANT_VIOLATED: 'SEED_INVARIANT_VIOLATED',
  DATA_DRIFT: 'SEED_DATA_DRIFT',
} as const;

/** Type derived from registry — only valid codes are assignable. */
export type SeedErrorCode = (typeof SEED_ERROR_CODES)[keyof typeof SEED_ERROR_CODES];

// ───────────────────────────────────────────────────────────────
// STRUCTURED ERROR CLASS
// ───────────────────────────────────────────────────────────────

/**
 * Context attached to a SeedError for structured logging + Sentry.
 */
export interface SeedErrorContext {
  /** Module name where failure occurred. */
  readonly module?: string;
  /** Run ID for log correlation. */
  readonly runId?: string;
  /** Original error (preserves stack trace). */
  readonly cause?: unknown;
  /** Additional structured fields. */
  readonly meta?: Readonly<Record<string, unknown>>;
}

/**
 * Structured seed error.
 *
 * Pattern: Error subclass with structured `code` + `context` fields.
 * Sentry/Better Stack group by `name + code` for clean dedupe.
 */
export class SeedError extends Error {
  public readonly code: SeedErrorCode;
  public readonly context: SeedErrorContext;
  public readonly severity: 'critical' | 'error' | 'warning' = 'error';

  constructor(code: SeedErrorCode, message?: string, context: SeedErrorContext = {}) {
    super(message ?? code);
    this.name = 'SeedError';
    this.code = code;
    this.context = context;

    // Restore prototype chain (TypeScript transpilation quirk).
    Object.setPrototypeOf(this, SeedError.prototype);
  }

  /** Structured serialization for Winston / Better Stack. */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      severity: this.severity,
      message: this.message,
      module: this.context.module,
      runId: this.context.runId,
      meta: this.context.meta,
    };
  }
}

// ───────────────────────────────────────────────────────────────
// HELPER — `seedError(code, message?, context?)` builder
// ───────────────────────────────────────────────────────────────

/**
 * Build a structured SeedError with code + dynamic message.
 *
 * Replaces patterns like:
 *   throw new Error(`Need 50 owner users, got ${actual}`);  // ← string only
 * With:
 *   throw seedError(
 *     SEED_ERROR_CODES.MODULE_INSUFFICIENT_DEPENDENCIES,
 *     `Need 50 owner users, got ${actual}`,
 *     { module: 'organization/clinics' },
 *   );
 *
 * @example
 *   throw seedError(SEED_ERROR_CODES.SCHEMA_MISMATCH, 'allergies field shape changed');
 */
export function seedError(
  code: SeedErrorCode,
  message?: string,
  context?: SeedErrorContext,
): SeedError {
  return new SeedError(code, message, context);
}

/** Re-export old name for back-compat with existing module-helpers code. */
export type { SeedErrorCode as SeedErrorCodeType };
