// ═══════════════════════════════════════════════════════════════
// PROPERTY-BASED FUZZ TESTS — Random input never crashes schemas
// Uses fast-check for 500+ random inputs per schema.
// Pattern: Stripe validation fuzz suite, Zod official benchmarks.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  emailField,
  passwordField,
  phoneField,
  otpField,
  nameField,
  uuidField,
  dateField,
  localeField,
} from '../../../validators/primitives/index';
import {
  signupEmailSchema,
  loginEmailSchema,
  verifyOtpSchema,
  chatMessageSchema,
  profileUpdateSchema,
} from '../../../validators/domains/index';

const FUZZ_RUNS = 300;

describe('Primitive fields — safeParse never throws on random input', () => {
  it('emailField', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => emailField.safeParse(input)).not.toThrow();
      }),
      { numRuns: FUZZ_RUNS },
    );
  });

  it('passwordField', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => passwordField.safeParse(input)).not.toThrow();
      }),
      { numRuns: FUZZ_RUNS },
    );
  });

  it('phoneField', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => phoneField.safeParse(input)).not.toThrow();
      }),
      { numRuns: FUZZ_RUNS },
    );
  });

  it('otpField', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => otpField.safeParse(input)).not.toThrow();
      }),
      { numRuns: FUZZ_RUNS },
    );
  });

  it('nameField', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => nameField.safeParse(input)).not.toThrow();
      }),
      { numRuns: FUZZ_RUNS },
    );
  });

  it('uuidField', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => uuidField.safeParse(input)).not.toThrow();
      }),
      { numRuns: FUZZ_RUNS },
    );
  });

  it('dateField', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => dateField.safeParse(input)).not.toThrow();
      }),
      { numRuns: FUZZ_RUNS },
    );
  });

  it('localeField', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => localeField.safeParse(input)).not.toThrow();
      }),
      { numRuns: FUZZ_RUNS },
    );
  });
});

describe('Domain schemas — safeParse never throws on random input', () => {
  it('signupEmailSchema', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => signupEmailSchema.safeParse(input)).not.toThrow();
      }),
      { numRuns: FUZZ_RUNS },
    );
  });

  it('loginEmailSchema', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => loginEmailSchema.safeParse(input)).not.toThrow();
      }),
      { numRuns: FUZZ_RUNS },
    );
  });

  it('verifyOtpSchema', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => verifyOtpSchema.safeParse(input)).not.toThrow();
      }),
      { numRuns: FUZZ_RUNS },
    );
  });

  it('chatMessageSchema', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => chatMessageSchema.safeParse(input)).not.toThrow();
      }),
      { numRuns: FUZZ_RUNS },
    );
  });

  it('profileUpdateSchema', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => profileUpdateSchema.safeParse(input)).not.toThrow();
      }),
      { numRuns: FUZZ_RUNS },
    );
  });
});
