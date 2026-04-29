// ═══════════════════════════════════════════════════════════════
// NAME PRIMITIVE — Human name with XSS sanitization
// Used by: signupSchema, profileUpdateSchema, clinicSignupSchema,
//          bookingSchema, reviewSchema
//
// Supports: Latin, Devanagari (Hindi), Tamil, Telugu, Bengali,
//           Gujarati, Kannada, Malayalam, Punjabi (Gurmukhi)
//
// Security: HTML entities escaped via .transform() — XSS at
//           schema level = impossible to store malicious markup.
//
// Pattern: OWASP input validation, Stripe customer name handling.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

/**
 * Sanitize HTML entities — prevent stored XSS.
 * Runs as Zod transform — BEFORE data reaches database.
 *
 * @example
 * ```ts
 * sanitizeHtml('<script>alert("xss")</script>');
 * // → '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * ```
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Human name field — required, trimmed, XSS-safe.
 *
 * @example
 * ```ts
 * nameField.parse("Dr. Mayank Vats");     // ✅ "Dr. Mayank Vats"
 * nameField.parse("  Rahul  ");            // ✅ "Rahul" (trimmed)
 * nameField.parse("<script>x</script>");   // ✅ "&lt;script&gt;x&lt;/script&gt;" (sanitized)
 * nameField.parse("");                     // ❌ too short
 * ```
 */
export const nameField = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(200, 'Name must not exceed 200 characters')
  .transform(sanitizeHtml);

/**
 * Optional name — for forms where name is not required.
 * Same sanitization + trim, but allows undefined/empty.
 */
export const optionalNameField = z
  .string()
  .trim()
  .max(200, 'Name must not exceed 200 characters')
  .transform(sanitizeHtml)
  .optional();

/** Name type (after transform — sanitized string) */
export type Name = z.infer<typeof nameField>;
