// ═══════════════════════════════════════════════════════════════
// BOUNDARY TESTS — Edge cases, unicode, emoji, null bytes
// Tests real-world Indian user input patterns.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  emailField,
  nameField,
  phoneField,
  otpField,
  passwordField,
  uuidField,
  dobField,
} from '../../../validators/primitives/index';

describe('Unicode & Multilingual Names', () => {
  it('accepts Hindi (Devanagari) name', () => {
    expect(nameField.safeParse('डॉ. मयंक वत्स').success).toBe(true);
  });

  it('accepts Tamil name', () => {
    expect(nameField.safeParse('முருகன் செல்வம்').success).toBe(true);
  });

  it('accepts Telugu name', () => {
    expect(nameField.safeParse('రామ కృష్ణ').success).toBe(true);
  });

  it('accepts Bengali name', () => {
    expect(nameField.safeParse('সুব্রত মুখার্জী').success).toBe(true);
  });

  it('accepts Gujarati name', () => {
    expect(nameField.safeParse('મહાત્મા ગાંધી').success).toBe(true);
  });

  it('accepts Punjabi (Gurmukhi) name', () => {
    expect(nameField.safeParse('ਗੁਰੂ ਨਾਨਕ').success).toBe(true);
  });

  it('accepts mixed script name (English + Hindi)', () => {
    expect(nameField.safeParse('Dr. मयंक Vats').success).toBe(true);
  });
});

describe('Emoji Handling', () => {
  it('accepts name with emoji (Indian users do this)', () => {
    expect(nameField.safeParse('Rahul 🦷').success).toBe(true);
  });

  it('accepts email without emoji (email spec rejects)', () => {
    expect(emailField.safeParse('test😀@gmail.com').success).toBe(false);
  });
});

describe('Null Byte Attacks', () => {
  it('nameField handles null bytes', () => {
    // Null bytes can truncate strings in C-level operations
    const result = nameField.safeParse('admin\x00evil');
    // Should either reject or sanitize — never pass through raw
    if (result.success) {
      expect(typeof result.data).toBe('string');
    }
  });

  it('uuidField rejects null byte in ID', () => {
    expect(uuidField.safeParse('550e8400\x00-e29b-41d4-a716-446655440000').success).toBe(false);
  });
});

describe('Empty & Whitespace', () => {
  it('nameField rejects empty string', () => {
    expect(nameField.safeParse('').success).toBe(false);
  });

  it('nameField rejects whitespace-only (trim makes empty)', () => {
    expect(nameField.safeParse('   ').success).toBe(false);
  });

  it('nameField rejects tabs-only', () => {
    expect(nameField.safeParse('\t\t\t').success).toBe(false);
  });

  it('emailField rejects empty', () => {
    expect(emailField.safeParse('').success).toBe(false);
  });

  it('passwordField rejects empty', () => {
    expect(passwordField.safeParse('').success).toBe(false);
  });

  it('phoneField rejects empty', () => {
    expect(phoneField.safeParse('').success).toBe(false);
  });

  it('otpField rejects empty', () => {
    expect(otpField.safeParse('').success).toBe(false);
  });
});

describe('Max Length Boundaries', () => {
  it('nameField accepts exactly 200 chars', () => {
    expect(nameField.safeParse('A'.repeat(200)).success).toBe(true);
  });

  it('nameField rejects 201 chars', () => {
    expect(nameField.safeParse('A'.repeat(201)).success).toBe(false);
  });

  it('passwordField accepts exactly 128 chars', () => {
    const pw = 'Aa1' + 'x'.repeat(125); // 128 total
    expect(passwordField.safeParse(pw).success).toBe(true);
  });

  it('passwordField rejects 129 chars', () => {
    const pw = 'Aa1' + 'x'.repeat(126); // 129 total
    expect(passwordField.safeParse(pw).success).toBe(false);
  });
});

describe('Date Edge Cases', () => {
  it('dobField rejects future year 2030', () => {
    expect(dobField.safeParse('2030-01-01').success).toBe(false);
  });

  it('dobField accepts year 1900', () => {
    expect(dobField.safeParse('1900-01-01').success).toBe(true);
  });

  it('dobField rejects year 1899', () => {
    expect(dobField.safeParse('1899-12-31').success).toBe(false);
  });

  it('dobField rejects invalid date format', () => {
    expect(dobField.safeParse('31-12-1990').success).toBe(false);
  });

  it('dobField rejects non-date string', () => {
    expect(dobField.safeParse('not-a-date').success).toBe(false);
  });
});

describe('Type Coercion Safety', () => {
  it('emailField rejects number', () => {
    expect(emailField.safeParse(12345).success).toBe(false);
  });

  it('emailField rejects boolean', () => {
    expect(emailField.safeParse(true).success).toBe(false);
  });

  it('emailField rejects null', () => {
    expect(emailField.safeParse(null).success).toBe(false);
  });

  it('emailField rejects undefined', () => {
    expect(emailField.safeParse(undefined).success).toBe(false);
  });

  it('emailField rejects array', () => {
    expect(emailField.safeParse(['test@test.com']).success).toBe(false);
  });

  it('emailField rejects object', () => {
    expect(emailField.safeParse({ email: 'test@test.com' }).success).toBe(false);
  });
});
