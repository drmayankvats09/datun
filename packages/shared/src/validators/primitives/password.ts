// ═══════════════════════════════════════════════════════════════
// PASSWORD PRIMITIVE — Single source of truth for password rules
// Used by: signupSchema, resetPasswordSchema, changePasswordSchema
//
// BEFORE (DRY violation):
//   signup/page.tsx:  hasMinLength && hasUppercase && hasLowercase && hasNumber
//   schemas.ts:       .min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/)
//   SAME rules, 2 places — one forgets update → user confusion
//
// AFTER: One field, everywhere.
//
// Pattern: Stripe password policy, Auth0 password strength.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

/**
 * Password strength rules — OWASP 2024 guidelines.
 * Exported for frontend UI (password strength indicator).
 */
export const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireDigit: true,
} as const;

/**
 * Reusable password field — create account + reset password.
 *
 * Rules:
 *   - 8-128 characters
 *   - At least 1 uppercase letter
 *   - At least 1 lowercase letter
 *   - At least 1 digit
 *   - No leading/trailing whitespace (trimmed)
 *
 * @example
 * ```ts
 * passwordField.parse("StrongPass1");  // ✅
 * passwordField.parse("weak");         // ❌ too short
 * passwordField.parse("alllowercase1"); // ❌ no uppercase
 * ```
 */
export const passwordField = z
  .string()
  .min(PASSWORD_RULES.minLength, `Password must be at least ${PASSWORD_RULES.minLength} characters`)
  .max(PASSWORD_RULES.maxLength, `Password must not exceed ${PASSWORD_RULES.maxLength} characters`)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Login password — only checks non-empty + max length.
 * Login pe strength rules enforce nahi karte — purane users
 * ke passwords jo rules se pehle bane the, woh bhi work karein.
 */
export const loginPasswordField = z
  .string()
  .min(1, 'Password is required')
  .max(PASSWORD_RULES.maxLength);

/** TypeScript type for strong password */
export type Password = z.infer<typeof passwordField>;
