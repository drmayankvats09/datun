// ═══════════════════════════════════════════════════════════════
// VALIDATION MIDDLEWARE — Zod schema → Express middleware
// Usage: router.post("/chat", validate(chatSchema), handler)
// Strips unknown fields, returns structured 400 on failure.
// Pattern: tRPC validation, Stripe request validation.
// ═══════════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/index.js';

/**
 * Creates middleware that validates req.body against a Zod schema.
 * On success: req.body is replaced with the parsed (stripped) data.
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

function formatZodErrors(error: ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_root';
    if (!details[path]) details[path] = [];
    details[path].push(issue.message);
  }
  return details;
}
