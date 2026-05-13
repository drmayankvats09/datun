// ═══════════════════════════════════════════════════════════════
// VALIDATION MIDDLEWARE — Zod schema → Express middleware
// Phase 1: validate(schema) — req.body
// Task #38: validateQuery(schema) — req.query
//           validateParams(schema) — req.params
//
// EXPRESS 5 COMPAT:
//   In Express 5, `req.query` is a read-only getter (cannot be reassigned).
//   We store parsed data on req.validatedQuery and req.validatedParams,
//   AND try the legacy assignment for backwards-compat (Express 4 paths).
// ═══════════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/index.js';

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

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      throw new ValidationError('Query parameter validation failed', details);
    }
    // Express 5: req.query is a read-only getter. Try assignment for Express 4
    // fallback, swallow TypeError silently.
    try {
      (req as unknown as Record<string, unknown>).query = result.data;
    } catch {
      // Express 5 — getter-only, assignment silently rejected.
    }
    // Canonical storage — handlers should read from here.
    (req as unknown as Record<string, unknown>).validatedQuery = result.data;
    next();
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const details = formatZodErrors(result.error);
      throw new ValidationError('URL parameter validation failed', details);
    }
    try {
      (req as unknown as Record<string, unknown>).params = result.data;
    } catch {
      // Express 5 fallback.
    }
    (req as unknown as Record<string, unknown>).validatedParams = result.data;
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
