// ═══════════════════════════════════════════════════════════════
// VALIDATION MIDDLEWARE — Zod schema → Express middleware
// Phase 1: validate(schema) — req.body
// Task #38: validateQuery(schema) — req.query
//           validateParams(schema) — req.params
// ═══════════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/index.js';

/**
 * Validates req.body against a Zod schema.
 * On success: req.body replaced with parsed (stripped) data.
 * On failure: throws ValidationError with field-level details.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      throw new ValidationError('Request validation failed', details);
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validates req.query against a Zod schema.
 * Prevents array injection (e.g., ?key[]=evil&key[]=legit).
 * Coerces string values to correct types (z.coerce.number()).
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      throw new ValidationError('Query parameter validation failed', details);
    }
    // Replace req.query with parsed data (coerced + stripped)
    (req as unknown as Record<string, unknown>).query = result.data;
    next();
  };
}

/**
 * Validates req.params against a Zod schema.
 * Prevents path traversal and SQL injection in URL params.
 */
export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      throw new ValidationError('URL parameter validation failed', details);
    }
    (req as unknown as Record<string, unknown>).params = result.data;
    next();
  };
}

function formatZodErrors(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!details[path]) details[path] = [];
    details[path].push(issue.message);
  }
  return details;
}
