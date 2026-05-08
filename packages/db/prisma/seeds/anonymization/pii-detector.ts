// ═══════════════════════════════════════════════════════════════
// PII DETECTOR — schema-driven detection of PII fields + value patterns
// Source: Greenmask (xata.io 2026 review) + DPDP Act 2023
//
// Two-layer detection:
//   1. Field name detection (column-level) — used by anonymization rule resolver
//   2. Value-level detection — used by post-anonymization audit + leak validation
//
// FAANG principle: Value-level detection MUST distinguish real PII from
// synthetic/anonymized values. Otherwise the detector flags the engine's
// own output as a leak — false positive that breaks property tests.
// ═══════════════════════════════════════════════════════════════

export type PiiCategory =
  | 'NAME'
  | 'EMAIL'
  | 'PHONE'
  | 'ADDRESS'
  | 'DATE_OF_BIRTH'
  | 'GOVERNMENT_ID'
  | 'BIOMETRIC'
  | 'MEDICAL_NOTE'
  | 'IP_ADDRESS'
  | 'GEOLOCATION'
  | 'PAYMENT_CARD'
  | 'BANK_ACCOUNT'
  | 'PASSWORD'
  | 'AUTH_TOKEN'
  | 'OTP'
  | 'SESSION_ID';

export interface PiiFieldRule {
  readonly fieldName: string;
  readonly fieldNameRegex?: RegExp;
  readonly category: PiiCategory;
  readonly confidence: 'high' | 'medium' | 'low';
}

const FIELD_NAME_RULES: readonly PiiFieldRule[] = [
  { fieldName: 'firstName', category: 'NAME', confidence: 'high' },
  { fieldName: 'lastName', category: 'NAME', confidence: 'high' },
  { fieldName: 'fullName', category: 'NAME', confidence: 'high' },
  { fieldName: 'name', category: 'NAME', confidence: 'high' },
  { fieldName: 'email', category: 'EMAIL', confidence: 'high' },
  { fieldName: 'emailAddress', category: 'EMAIL', confidence: 'high' },
  { fieldName: 'phone', category: 'PHONE', confidence: 'high' },
  { fieldName: 'phoneNumber', category: 'PHONE', confidence: 'high' },
  { fieldName: 'mobile', category: 'PHONE', confidence: 'high' },
  { fieldName: 'addressLine1', category: 'ADDRESS', confidence: 'high' },
  { fieldName: 'addressLine2', category: 'ADDRESS', confidence: 'medium' },
  { fieldName: 'pincode', category: 'ADDRESS', confidence: 'medium' },
  { fieldName: 'dateOfBirth', category: 'DATE_OF_BIRTH', confidence: 'high' },
  { fieldName: 'dob', category: 'DATE_OF_BIRTH', confidence: 'high' },
  { fieldName: 'aadhaar', category: 'GOVERNMENT_ID', confidence: 'high' },
  { fieldName: 'pan', category: 'GOVERNMENT_ID', confidence: 'high' },
  { fieldName: 'panCard', category: 'GOVERNMENT_ID', confidence: 'high' },
  { fieldName: 'passport', category: 'GOVERNMENT_ID', confidence: 'high' },
  { fieldName: 'biometricHash', category: 'BIOMETRIC', confidence: 'high' },
  { fieldName: 'medicalNotes', category: 'MEDICAL_NOTE', confidence: 'medium' },
  { fieldName: 'clinicalNotes', category: 'MEDICAL_NOTE', confidence: 'medium' },
  { fieldName: 'ipAddress', category: 'IP_ADDRESS', confidence: 'high' },
  { fieldName: 'lastIp', category: 'IP_ADDRESS', confidence: 'high' },
  { fieldName: 'latitude', category: 'GEOLOCATION', confidence: 'high' },
  { fieldName: 'longitude', category: 'GEOLOCATION', confidence: 'high' },
  { fieldName: 'cardNumber', category: 'PAYMENT_CARD', confidence: 'high' },
  { fieldName: 'cardLast4', category: 'PAYMENT_CARD', confidence: 'high' },
  { fieldName: 'bankAccountNumber', category: 'BANK_ACCOUNT', confidence: 'high' },
  { fieldName: 'ifsc', category: 'BANK_ACCOUNT', confidence: 'high' },
  { fieldName: 'passwordHash', category: 'PASSWORD', confidence: 'high' },
  { fieldName: 'token', category: 'AUTH_TOKEN', confidence: 'medium' },
  { fieldName: 'accessToken', category: 'AUTH_TOKEN', confidence: 'high' },
  { fieldName: 'refreshToken', category: 'AUTH_TOKEN', confidence: 'high' },
  { fieldName: 'otp', category: 'OTP', confidence: 'high' },
  { fieldName: 'otpHash', category: 'OTP', confidence: 'high' },
  { fieldName: 'sessionId', category: 'SESSION_ID', confidence: 'high' },
];

const FIELD_REGEX_RULES: readonly PiiFieldRule[] = [
  { fieldName: '*', fieldNameRegex: /email/i, category: 'EMAIL', confidence: 'medium' },
  {
    fieldName: '*',
    fieldNameRegex: /phone|mobile|whatsapp/i,
    category: 'PHONE',
    confidence: 'medium',
  },
  {
    fieldName: '*',
    fieldNameRegex: /password|secret/i,
    category: 'PASSWORD',
    confidence: 'medium',
  },
  { fieldName: '*', fieldNameRegex: /token|jwt/i, category: 'AUTH_TOKEN', confidence: 'medium' },
];

export function detectPiiFields(fieldNames: readonly string[]): readonly PiiFieldRule[] {
  const detected: PiiFieldRule[] = [];
  for (const fieldName of fieldNames) {
    const exactMatch = FIELD_NAME_RULES.find(
      (r) => r.fieldName.toLowerCase() === fieldName.toLowerCase(),
    );
    if (exactMatch) {
      detected.push({ ...exactMatch, fieldName });
      continue;
    }
    const regexMatch = FIELD_REGEX_RULES.find((r) => r.fieldNameRegex?.test(fieldName));
    if (regexMatch) {
      detected.push({ ...regexMatch, fieldName });
    }
  }
  return detected;
}

// ─── Synthetic-pattern guards (FAANG: prevent false positives on anonymized output) ───
//
// A real Indian phone number per TRAI rules:
//   - Starts with country code +91
//   - First digit after +91 is 6, 7, 8, or 9
//   - Followed by 9 more digits
//   - Real numbers do NOT have 8+ consecutive identical digits
//
// Reference: https://dot.gov.in/relatedlinks/national-numbering-plan-2003

function isSyntheticPhone(value: string): boolean {
  if (/^\+?91[6-9](\d)\1{8}$/.test(value)) return true;
  if (/^(phone|fake|redacted|pseudo|anon|mask|test|sample|example)[-_]/i.test(value)) return true;
  if (/^\+?91[6-9]\d{0,2}0{7,}$/.test(value)) return true;
  return false;
}

function isSyntheticAadhaar(value: string): boolean {
  if (/^([2-9])\1{11}$/.test(value)) return true;
  if (/^[2-9]0{11}$/.test(value)) return true;
  return false;
}

function isSyntheticEmail(value: string): boolean {
  if (/@(example|test|localhost|invalid|fake|anonymized)\.(com|org|net|local)$/i.test(value))
    return true;
  if (/^[a-z0-9._-]+\.fake@/i.test(value)) return true;
  return false;
}

const VALUE_PATTERNS: ReadonlyArray<readonly [PiiCategory, RegExp, ((v: string) => boolean)?]> = [
  ['EMAIL', /^[\w.+-]+@[\w-]+\.[\w.-]+$/, isSyntheticEmail],
  ['PHONE', /^\+?91[\s-]?\d{10}$|^\d{10}$/, isSyntheticPhone],
  ['IP_ADDRESS', /^(?:\d{1,3}\.){3}\d{1,3}$/],
  ['GOVERNMENT_ID', /^[2-9]{1}[0-9]{11}$/, isSyntheticAadhaar],
  ['GOVERNMENT_ID', /^[A-Z]{5}\d{4}[A-Z]$/],
];

/**
 * Detects whether a string value matches a known PII pattern.
 * Returns the PII category if real PII, or `null` if non-PII OR synthetic.
 *
 * FAANG-grade: This function MUST return null for any value produced by
 * AnonymizationEngine masking — otherwise property tests flag false leaks.
 */
export function detectPiiInValue(value: unknown): PiiCategory | null {
  if (typeof value !== 'string' || value.length === 0) return null;

  for (const [category, pattern, syntheticGuard] of VALUE_PATTERNS) {
    if (pattern.test(value)) {
      if (syntheticGuard && syntheticGuard(value)) continue;
      return category;
    }
  }
  return null;
}
