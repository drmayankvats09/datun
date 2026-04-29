// ═══════════════════════════════════════════════════════════════
// PHONE PRIMITIVE — E.164 phone validation + India-specific
// Used by: signupSchema, otpSchema, clinicSignupSchema,
//          bookingSchema, intakeFormSchema
//
// E.164 format: +[country code][subscriber number]
// India: +91 followed by exactly 10 digits (starting with 6-9)
// International: + followed by 7-15 digits
//
// Pattern: Twilio phone validation, MSG91 requirements.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

/**
 * Supported country codes with metadata.
 * Used by PhoneInput component dropdown.
 */
export const COUNTRY_CODES = [
  { code: '91', country: 'IN', name: 'India', flag: '🇮🇳', digits: 10 },
  { code: '1', country: 'US', name: 'United States', flag: '🇺🇸', digits: 10 },
  { code: '44', country: 'GB', name: 'United Kingdom', flag: '🇬🇧', digits: 10 },
  { code: '971', country: 'AE', name: 'UAE', flag: '🇦🇪', digits: 9 },
  { code: '966', country: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', digits: 9 },
  { code: '65', country: 'SG', name: 'Singapore', flag: '🇸🇬', digits: 8 },
  { code: '61', country: 'AU', name: 'Australia', flag: '🇦🇺', digits: 9 },
  { code: '977', country: 'NP', name: 'Nepal', flag: '🇳🇵', digits: 10 },
  { code: '880', country: 'BD', name: 'Bangladesh', flag: '🇧🇩', digits: 10 },
  { code: '94', country: 'LK', name: 'Sri Lanka', flag: '🇱🇰', digits: 9 },
] as const;

/**
 * Indian phone number — +91 + 10 digits starting with 6-9.
 * 95% of Datun users are Indian — this is the PRIMARY validator.
 *
 * @example
 * ```ts
 * indianPhoneField.parse("+919876543210");  // ✅
 * indianPhoneField.parse("+911234567890");  // ❌ starts with 1 (invalid)
 * indianPhoneField.parse("+9198765");       // ❌ too short
 * ```
 */
export const indianPhoneField = z
  .string()
  .regex(
    /^\+91[6-9]\d{9}$/,
    'Indian phone number must be +91 followed by 10 digits starting with 6-9',
  );

/**
 * International phone — E.164 format (7-15 digits after +).
 * Used for NRI patients, UAE/Saudi expats.
 */
export const internationalPhoneField = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Phone number must be in E.164 format (e.g., +919876543210)');

/**
 * Flexible phone field — accepts Indian or international.
 * Used in most forms where we accept global users.
 */
export const phoneField = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, 'Valid phone number required (e.g., +919876543210)')
  .refine(
    (val) => {
      // Indian numbers: must start with 6-9 after +91
      if (val.startsWith('+91')) {
        return /^\+91[6-9]\d{9}$/.test(val);
      }
      return true; // Other countries — E.164 format is sufficient
    },
    { message: 'Indian numbers must start with 6, 7, 8, or 9' },
  );

/**
 * Format raw digits + country code into E.164.
 * Used by PhoneInput component.
 *
 * @example
 * ```ts
 * formatPhoneE164("+91", "9876543210"); // → "+919876543210"
 * formatPhoneE164("+1", "212-555-1234"); // → "+12125551234"
 * ```
 */
export function formatPhoneE164(countryCode: string, digits: string): string {
  const clean = digits.replace(/\D/g, '');
  const code = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  return `${code}${clean}`;
}

/** Phone type */
export type Phone = z.infer<typeof phoneField>;
