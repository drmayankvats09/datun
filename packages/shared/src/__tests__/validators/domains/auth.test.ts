import { describe, it, expect } from 'vitest';
import {
  signupEmailSchema,
  loginEmailSchema,
  sendOtpSchema,
  verifyOtpSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  userResponseSchema,
  authResultSchema,
} from '../../../validators/domains/auth.schema.js';

describe('signupEmailSchema', () => {
  it('accepts valid signup with email auto-lowercase', () => {
    const result = signupEmailSchema.parse({
      email: 'Test@Datunai.COM',
      password: 'StrongPass1',
      name: 'Dr. Mayank',
    });
    expect(result.email).toBe('test@datunai.com');
  });

  it('sanitizes XSS in name', () => {
    const result = signupEmailSchema.parse({
      email: 'test@datunai.com',
      password: 'StrongPass1',
      name: '<script>alert("xss")</script>',
    });
    expect(result.name).not.toContain('<script>');
    expect(result.name).toContain('&lt;script&gt;');
  });

  it('accepts optional phone', () => {
    const result = signupEmailSchema.safeParse({
      email: 'test@datunai.com',
      password: 'StrongPass1',
      name: 'Test',
      phone: '+919876543210',
    });
    expect(result.success).toBe(true);
  });

  it('rejects weak password', () => {
    expect(
      signupEmailSchema.safeParse({
        email: 'test@datunai.com',
        password: 'weak',
        name: 'Test',
      }).success,
    ).toBe(false);
  });

  it('rejects disposable email', () => {
    expect(
      signupEmailSchema.safeParse({
        email: 'test@mailinator.com',
        password: 'StrongPass1',
        name: 'Test',
      }).success,
    ).toBe(false);
  });

  it('rejects empty name', () => {
    expect(
      signupEmailSchema.safeParse({
        email: 'test@test.com',
        password: 'StrongPass1',
        name: '',
      }).success,
    ).toBe(false);
  });
});

describe('loginEmailSchema', () => {
  it('accepts valid login (lenient password)', () => {
    expect(
      loginEmailSchema.safeParse({
        email: 'test@test.com',
        password: 'anything',
      }).success,
    ).toBe(true);
  });

  it('auto-lowercases email', () => {
    const result = loginEmailSchema.parse({ email: 'TEST@GMAIL.COM', password: 'x' });
    expect(result.email).toBe('test@gmail.com');
  });

  it('rejects missing password', () => {
    expect(loginEmailSchema.safeParse({ email: 'test@test.com' }).success).toBe(false);
  });
});

describe('sendOtpSchema', () => {
  it('accepts email channel', () => {
    expect(
      sendOtpSchema.safeParse({ destination: 'test@test.com', channel: 'email' }).success,
    ).toBe(true);
  });

  it('accepts phone channel', () => {
    expect(
      sendOtpSchema.safeParse({ destination: '+919876543210', channel: 'phone' }).success,
    ).toBe(true);
  });

  it('rejects invalid channel', () => {
    expect(sendOtpSchema.safeParse({ destination: 'x', channel: 'sms' }).success).toBe(false);
  });
});

describe('verifyOtpSchema', () => {
  it('accepts valid OTP', () => {
    expect(
      verifyOtpSchema.safeParse({
        destination: 'test@test.com',
        channel: 'email',
        code: '123456',
      }).success,
    ).toBe(true);
  });

  it('rejects non-6-digit OTP', () => {
    expect(
      verifyOtpSchema.safeParse({
        destination: 'test@test.com',
        channel: 'email',
        code: '12345',
      }).success,
    ).toBe(false);
  });

  it('rejects non-numeric OTP', () => {
    expect(
      verifyOtpSchema.safeParse({
        destination: 'test@test.com',
        channel: 'email',
        code: 'abcdef',
      }).success,
    ).toBe(false);
  });
});

describe('googleAuthSchema', () => {
  it('accepts valid google auth', () => {
    expect(
      googleAuthSchema.safeParse({
        code: 'auth-code-123',
        redirectUri: 'https://datunai.com/callback',
      }).success,
    ).toBe(true);
  });

  it('rejects invalid redirect URI', () => {
    expect(
      googleAuthSchema.safeParse({
        code: 'auth-code-123',
        redirectUri: 'not-a-url',
      }).success,
    ).toBe(false);
  });
});

describe('forgotPasswordSchema', () => {
  it('accepts valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'test@test.com' }).success).toBe(true);
  });

  it('auto-lowercases', () => {
    const result = forgotPasswordSchema.parse({ email: 'TEST@TEST.COM' });
    expect(result.email).toBe('test@test.com');
  });
});

describe('resetPasswordSchema', () => {
  it('accepts valid reset', () => {
    expect(
      resetPasswordSchema.safeParse({
        email: 'test@test.com',
        otp: '123456',
        newPassword: 'NewStrong1',
      }).success,
    ).toBe(true);
  });

  it('rejects weak new password', () => {
    expect(
      resetPasswordSchema.safeParse({
        email: 'test@test.com',
        otp: '123456',
        newPassword: 'weak',
      }).success,
    ).toBe(false);
  });
});

describe('refreshTokenSchema', () => {
  it('accepts valid refresh token', () => {
    expect(refreshTokenSchema.safeParse({ refreshToken: 'abc.def.ghi' }).success).toBe(true);
  });

  it('rejects empty', () => {
    expect(refreshTokenSchema.safeParse({ refreshToken: '' }).success).toBe(false);
  });
});

describe('userResponseSchema (prevents passwordHash leak)', () => {
  it('accepts valid user response', () => {
    expect(
      userResponseSchema.safeParse({
        id: '123',
        email: 'test@test.com',
        name: 'Test',
        phone: null,
        avatarUrl: null,
        role: 'PATIENT',
        isEmailVerified: true,
        isPhoneVerified: false,
      }).success,
    ).toBe(true);
  });

  it('strips unknown fields (passwordHash cannot leak)', () => {
    const result = userResponseSchema.parse({
      id: '123',
      email: 'test@test.com',
      name: 'Test',
      phone: null,
      avatarUrl: null,
      role: 'PATIENT',
      isEmailVerified: true,
      isPhoneVerified: false,
      passwordHash: 'SUPER_SECRET_HASH',
    });
    expect(result).not.toHaveProperty('passwordHash');
  });
});

describe('authResultSchema', () => {
  it('accepts valid auth result', () => {
    expect(
      authResultSchema.safeParse({
        user: {
          id: '1',
          email: 'x@y.com',
          name: 'X',
          phone: null,
          avatarUrl: null,
          role: 'PATIENT',
          isEmailVerified: false,
          isPhoneVerified: false,
        },
        tokens: { accessToken: 'a', refreshToken: 'r', expiresIn: 3600 },
        isNewUser: true,
      }).success,
    ).toBe(true);
  });
});
