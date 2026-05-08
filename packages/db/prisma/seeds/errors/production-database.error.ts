// ═══════════════════════════════════════════════════════════════
// PRODUCTION DATABASE ERROR — Thrown when seed attempted on prod
// CRITICAL severity — pages on-call via Sentry alert rule
//
// Pattern: AWS SDK error class hierarchy, Stripe StripeError
// ═══════════════════════════════════════════════════════════════

import { SEED_ERROR_CODES, type SeedErrorCode } from '../constants/error-codes';

export class ProductionDatabaseError extends Error {
  /** Structured code for telemetry grouping */
  public readonly code: SeedErrorCode;
  /** Which guard layer caught it (1, 2, or 3) */
  public readonly layer: 1 | 2 | 3;
  /** Sanitized DATABASE_URL host (no credentials) */
  public readonly sanitizedHost: string;
  /** Severity for log levels + Sentry */
  public readonly severity = 'critical' as const;

  constructor(args: {
    code: SeedErrorCode;
    layer: 1 | 2 | 3;
    sanitizedHost: string;
    message: string;
  }) {
    super(args.message);
    this.name = 'ProductionDatabaseError';
    this.code = args.code;
    this.layer = args.layer;
    this.sanitizedHost = args.sanitizedHost;

    // Restore prototype chain (TypeScript transpilation quirk)
    Object.setPrototypeOf(this, ProductionDatabaseError.prototype);
  }

  /** Structured serialization for Winston / Better Stack */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      layer: this.layer,
      sanitizedHost: this.sanitizedHost,
      severity: this.severity,
      message: this.message,
    };
  }
}
