// ═══════════════════════════════════════════════════════════════
// SEED FAILURE ERROR — Generic seed error with structured context
// Pattern: Linear's WrappedError, Stripe StripeIdempotencyError
// ═══════════════════════════════════════════════════════════════

import type { SeedErrorCode } from '../constants/error-codes';

export interface SeedFailureContext {
  /** Module name where failure occurred */
  module?: string;
  /** Run ID for log correlation */
  runId?: string;
  /** Original error (preserves stack trace) */
  cause?: unknown;
  /** Additional structured fields */
  meta?: Record<string, unknown>;
}

export class SeedFailureError extends Error {
  public readonly code: SeedErrorCode;
  public readonly context: SeedFailureContext;
  public readonly severity: 'error' | 'warn' = 'error';

  constructor(code: SeedErrorCode, message: string, context: SeedFailureContext = {}) {
    super(message);
    this.name = 'SeedFailureError';
    this.code = code;
    this.context = context;

    // Preserve cause chain for debugging
    if (context.cause instanceof Error) {
      this.stack = `${this.stack ?? ''}\nCaused by: ${context.cause.stack ?? context.cause.message}`;
    }

    Object.setPrototypeOf(this, SeedFailureError.prototype);
  }

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
