import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  signupEmailSchema,
  loginEmailSchema,
  verifyOtpSchema,
  chatMessageSchema,
  profileUpdateSchema,
} from '../../validators/schemas.js';

describe('signupEmailSchema', () => {
  it('accepts valid signup data', () => {
    const result = signupEmailSchema.safeParse({
      email: 'test@datunai.com',
      password: 'StrongPass1',
      name: 'Dr. Mayank',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = signupEmailSchema.safeParse({
      email: 'not-an-email',
      password: 'StrongPass1',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = signupEmailSchema.safeParse({
      email: 'test@test.com',
      password: 'short',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = signupEmailSchema.safeParse({
      email: 'test@test.com',
      password: 'StrongPass1',
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('trims name whitespace', () => {
    const result = signupEmailSchema.safeParse({
      email: 'test@test.com',
      password: 'StrongPass1',
      name: '  Dr. Mayank  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Dr. Mayank');
    }
  });

  // Property-based: never crashes on random objects
  it('never throws on random input (property-based)', () => {
    fc.assert(
      fc.property(fc.anything(), (input) => {
        expect(() => signupEmailSchema.safeParse(input)).not.toThrow();
      }),
      { numRuns: 200 },
    );
  });

  // P6-F5: Password strength rules at Zod level
  it('rejects password without uppercase letter', () => {
    const result = signupEmailSchema.safeParse({
      email: 'test@test.com',
      password: 'alllowercase1',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects password without number', () => {
    const result = signupEmailSchema.safeParse({
      email: 'test@test.com',
      password: 'NoNumberHere',
      name: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('accepts password meeting all strength rules', () => {
    const result = signupEmailSchema.safeParse({
      email: 'test@test.com',
      password: 'StrongPass1',
      name: 'Test',
    });
    expect(result.success).toBe(true);
  });
});

describe('loginEmailSchema', () => {
  it('accepts valid login', () => {
    const result = loginEmailSchema.safeParse({
      email: 'test@test.com',
      password: 'anything',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing password', () => {
    const result = loginEmailSchema.safeParse({ email: 'test@test.com' });
    expect(result.success).toBe(false);
  });
});

describe('verifyOtpSchema', () => {
  it('accepts valid OTP', () => {
    const result = verifyOtpSchema.safeParse({
      destination: 'test@test.com',
      channel: 'email',
      code: '123456',
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-6-digit code', () => {
    const result = verifyOtpSchema.safeParse({
      destination: 'test@test.com',
      channel: 'email',
      code: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric code', () => {
    const result = verifyOtpSchema.safeParse({
      destination: 'test@test.com',
      channel: 'email',
      code: 'abcdef',
    });
    expect(result.success).toBe(false);
  });
});

describe('chatMessageSchema', () => {
  it('accepts valid chat message', () => {
    const result = chatMessageSchema.safeParse({
      messages: [{ role: 'user', content: 'Hello' }],
      language: 'en',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty messages array', () => {
    const result = chatMessageSchema.safeParse({ messages: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = chatMessageSchema.safeParse({
      messages: [{ role: 'hacker', content: 'Hello' }],
    });
    expect(result.success).toBe(false);
  });

  it('defaults language to en', () => {
    const result = chatMessageSchema.safeParse({
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe('en');
    }
  });
});

describe('profileUpdateSchema', () => {
  it('accepts partial profile update', () => {
    const result = profileUpdateSchema.safeParse({ name: 'New Name' });
    expect(result.success).toBe(true);
  });

  it('validates gender enum', () => {
    const valid = profileUpdateSchema.safeParse({ gender: 'MALE' });
    expect(valid.success).toBe(true);

    const invalid = profileUpdateSchema.safeParse({ gender: 'ALIEN' });
    expect(invalid.success).toBe(false);
  });

  it('accepts empty object (all fields optional)', () => {
    const result = profileUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
