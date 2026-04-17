// ═══════════════════════════════════════════════════════════════
// PHONE UTILS — Indian phone number normalization
// Handles: +91, 0-prefix, spaces, dashes, missing country code.
// Output: "91XXXXXXXXXX" (12 digits, no +)
// ═══════════════════════════════════════════════════════════════

/**
 * Normalize any Indian phone input to 91XXXXXXXXXX format.
 * Examples:
 *   "+91 98765 43210" → "919876543210"
 *   "09876543210"     → "919876543210"
 *   "9876543210"      → "919876543210"
 *   "919876543210"    → "919876543210"
 */
export function normalizeIndianPhone(phone: string): string {
  let clean = String(phone)
    .replace(/\+/g, '')
    .replace(/[\s\-()]/g, '')
    .replace(/^0+/, '');

  if (!clean.startsWith('91') && clean.length === 10) {
    clean = '91' + clean;
  }

  return clean;
}

/**
 * Validate that a normalized phone looks like a valid Indian mobile.
 */
export function isValidIndianPhone(phone: string): boolean {
  const normalized = normalizeIndianPhone(phone);
  return /^91[6-9]\d{9}$/.test(normalized);
}
