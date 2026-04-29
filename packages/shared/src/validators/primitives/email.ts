// ═══════════════════════════════════════════════════════════════
// EMAIL PRIMITIVE — Reusable email validation field
// Used by: signupSchema, loginSchema, forgotPasswordSchema,
//          clinicSignupSchema, contactFormSchema, teamInviteSchema
//
// Features:
//   - RFC 5322 email format (Zod built-in)
//   - Max 254 chars (RFC 5321 SMTP limit)
//   - Auto-lowercase (prevents duplicate accounts)
//   - Auto-trim (prevents " test@x.com" vs "test@x.com")
//   - Disposable email blocking (10minutemail, guerrillamail etc.)
//
// Pattern: Stripe signup, Linear auth, Cal.com registration.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

/**
 * Common disposable email domains.
 * Patients using these = zero retention value.
 * Clinics using these = fake signups.
 * Updated list — top 30 most used disposable services.
 */
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'guerrillamail.com',
  'guerrillamail.de',
  'mailinator.com',
  'tempmail.com',
  'throwaway.email',
  'yopmail.com',
  'sharklasers.com',
  'guerrillamailblock.com',
  'grr.la',
  'dispostable.com',
  'mailnesia.com',
  'maildrop.cc',
  'tempail.com',
  'fakeinbox.com',
  'trashmail.com',
  'trashmail.me',
  'trashmail.net',
  'getnada.com',
  'temp-mail.org',
  'mohmal.com',
  'burnermail.io',
  'emailondeck.com',
  'mintemail.com',
  'tempr.email',
  'discard.email',
  'tmpmail.net',
  'tmpmail.org',
  'harakirimail.com',
  'mailcatch.com',
]);

/**
 * Reusable email field — every form that collects email uses this.
 *
 * Pipeline: input → trim → lowercase → format check → length check → disposable check
 *
 * @example
 * ```ts
 * const signupSchema = z.object({ email: emailField, ... });
 * emailField.parse("Test@Datunai.COM"); // → "test@datunai.com"
 * emailField.parse("spam@mailinator.com"); // → throws ZodError
 * ```
 */
export const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .email('Valid email required')
  .max(254, 'Email must not exceed 254 characters')
  .refine(
    (val) => {
      const domain = val.split('@')[1];
      return !domain || !DISPOSABLE_DOMAINS.has(domain);
    },
    { message: 'Disposable email addresses are not allowed' },
  );

/** TypeScript type inferred from emailField */
export type Email = z.infer<typeof emailField>;

/** Exported for testing — verify disposable list */
export { DISPOSABLE_DOMAINS };
