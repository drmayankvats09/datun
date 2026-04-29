// ═══════════════════════════════════════════════════════════════
// OTP PRIMITIVE — 6-digit numeric one-time password
// Used by: verifyOtpSchema, resetPasswordSchema
// Provider: MSG91 (SMS) + Resend (Email)
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

/** OTP configuration — change here, applies everywhere */
export const OTP_CONFIG = {
  length: 6,
  expirySeconds: 300, // 5 minutes
  maxAttempts: 5,
  retryAfterSeconds: 60,
} as const;

/**
 * 6-digit numeric OTP field.
 *
 * @example
 * ```ts
 * otpField.parse("123456");  // ✅
 * otpField.parse("12345");   // ❌ too short
 * otpField.parse("abcdef");  // ❌ non-numeric
 * otpField.parse("1234567"); // ❌ too long
 * ```
 */
export const otpField = z
  .string()
  .length(OTP_CONFIG.length, `OTP must be exactly ${OTP_CONFIG.length} digits`)
  .regex(/^\d+$/, 'OTP must contain only numbers');

/** OTP type */
export type OTP = z.infer<typeof otpField>;
