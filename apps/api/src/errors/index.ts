// ═══════════════════════════════════════════════════════════════
// CUSTOM ERROR HIERARCHY
// Every error type → specific HTTP status + machine-readable code.
// Frontend reads `code` field to decide what to show.
// Pattern: Stripe (error codes), Google Cloud (gRPC status), AWS (error types)
// ═══════════════════════════════════════════════════════════════

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 — Request body/params invalid */
export class ValidationError extends AppError {
  public readonly details: Record<string, string[]>;

  constructor(message = 'Validation failed', details: Record<string, string[]> = {}) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

/** 401 — Token missing, expired, or invalid */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/** 403 — Authenticated but not authorized for this resource */
export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

/** 404 — Resource does not exist */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource', identifier?: string) {
    const msg = identifier ? `${resource} '${identifier}' not found` : `${resource} not found`;
    super(msg, 404, 'NOT_FOUND');
  }
}

/** 409 — Duplicate or conflicting state */
export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

/** 429 — Rate limit exceeded */
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/** 502/503 — External dependency failed (Claude API, WhatsApp, etc.) */
export class ExternalServiceError extends AppError {
  public readonly service: string;

  constructor(service: string, message?: string) {
    super(message ?? `${service} is temporarily unavailable`, 503, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}
