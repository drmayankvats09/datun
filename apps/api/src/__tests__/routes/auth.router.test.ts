// ═══════════════════════════════════════════════════════════════
// AUTH ROUTER INTEGRATION TESTS — Full coverage of /api/auth/*
//
// SCOPE (FAANG separation of concerns):
//   ✓ HTTP routing — correct status codes (200/201/400/401/404/409/500)
//   ✓ Validation middleware — Zod schemas reject malformed input
//   ✓ Auth gates — requireAuth/requireUser reject missing/invalid JWT
//   ✓ Security event logging — every auth event logged for DPDP compliance
//   ✓ Service error propagation — custom errors → correct HTTP codes
//   ✓ Response envelope — { success, data } or { success: false, error }
//
// EXPLICITLY OUT OF SCOPE (already tested elsewhere):
//   ✗ AuthService business logic — auth.service.test.ts
//   ✗ JWT signing/verification — jwt.test.ts
//   ✗ OTP generation — otp.test.ts
//   ✗ Password hashing — password.test.ts
//   ✗ Validator schemas detail — packages/shared/__tests__/validators/
//
// PATTERN: Stripe (auth-routes.test.ts), Vercel (api/auth/*.test.ts),
//          Linear (server/routes/__tests__/auth.test.ts)
//
// Mocking strategy:
//   - AuthService: full mock (we test routing, not service logic)
//   - JwtService: full mock (controlled JWT verify behavior)
//   - logger, security-logger, redis (incl. blacklist), prisma: setup.ts globals
// ═══════════════════════════════════════════════════════════════

// ── Module mocks (must come BEFORE imports) ─────────────────────

import { vi } from 'vitest';

vi.mock('../../services/auth/auth.service.js', () => ({
  AuthService: {
    signupWithEmail: vi.fn(),
    loginWithEmail: vi.fn(),
    sendOtp: vi.fn(),
    verifyOtp: vi.fn(),
    loginWithGoogle: vi.fn(),
    getGoogleConsentUrl: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

vi.mock('../../services/auth/jwt.service.js', () => ({
  JwtService: {
    generateTokens: vi.fn(),
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: vi.fn(),
    decodeUnsafe: vi.fn(),
  },
}));

// ── Imports (after mocks so they pick up mocked modules) ────────

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestApp } from '../helpers/test-app.js';
import { AuthService } from '../../services/auth/auth.service.js';
import { JwtService } from '../../services/auth/jwt.service.js';
import { logSecurityEvent } from '../../lib/security-logger.js';
import { blacklist } from '../../lib/redis.js';
import { prisma } from '@repo/db';
import { AuthenticationError, ConflictError } from '../../errors/index.js';
import type { AuthResponse, OtpSendResponse } from '../../services/auth/types.js';

// ── Test fixtures ───────────────────────────────────────────────

/** A canonical valid user — used as service mock return value */
const FAKE_USER = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'test@example.com',
  name: 'Test User',
  phone: null,
  avatarUrl: null,
  role: 'PATIENT' as const,
  isEmailVerified: true,
  isPhoneVerified: false,
};

/** A canonical AuthResponse — what services return on success */
const FAKE_AUTH_RESPONSE: AuthResponse = {
  user: FAKE_USER,
  tokens: {
    accessToken: 'fake-access-token-jwt',
    refreshToken: 'fake-refresh-token-jwt',
    expiresIn: 3600,
  },
  isNewUser: false,
};

/** A canonical OTP send response */
const FAKE_OTP_SEND: OtpSendResponse = {
  success: true,
  maskedDestination: 't***@example.com',
  expiresInSeconds: 300,
  retryAfterSeconds: 60,
};

/** A canonical decoded JWT — for requireAuth/requireUser happy paths */
const FAKE_DECODED_TOKEN = {
  sub: FAKE_USER.id,
  email: FAKE_USER.email,
  role: 'PATIENT' as const,
  type: 'access' as const,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  iss: 'datun',
};

/** A valid signup payload (passes all Zod validation) */
const VALID_SIGNUP = {
  email: 'newuser@example.com',
  password: 'StrongPass1', // 8+ chars, upper+lower+digit
  name: 'New User',
};

/** A valid login payload */
const VALID_LOGIN = {
  email: 'user@example.com',
  password: 'AnyPassword1',
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ═══════════════════════════════════════════════════════════════
// 1. POST /api/auth/signup
// ═══════════════════════════════════════════════════════════════

describe('POST /api/auth/signup', () => {
  it('returns 400 when email is malformed', async () => {
    const res = await getTestApp()
      .post('/api/auth/signup')
      .send({ ...VALID_SIGNUP, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('email');
    expect(AuthService.signupWithEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when password is too weak (no uppercase)', async () => {
    const res = await getTestApp()
      .post('/api/auth/signup')
      .send({ ...VALID_SIGNUP, password: 'weakpass1' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('password');
    expect(AuthService.signupWithEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when name is missing', async () => {
    const res = await getTestApp()
      .post('/api/auth/signup')
      .send({ email: VALID_SIGNUP.email, password: VALID_SIGNUP.password });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('name');
  });

  it('returns 201 with auth payload on successful signup', async () => {
    vi.mocked(AuthService.signupWithEmail).mockResolvedValueOnce({
      ...FAKE_AUTH_RESPONSE,
      isNewUser: true,
    });

    const res = await getTestApp().post('/api/auth/signup').send(VALID_SIGNUP);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe(FAKE_USER.id);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(AuthService.signupWithEmail).toHaveBeenCalledTimes(1);
    // Defensive: ensure password never echoed back
    expect(JSON.stringify(res.body)).not.toContain(VALID_SIGNUP.password);
  });

  it('logs auth.signup.success security event on success', async () => {
    vi.mocked(AuthService.signupWithEmail).mockResolvedValueOnce({
      ...FAKE_AUTH_RESPONSE,
      isNewUser: true,
    });

    await getTestApp().post('/api/auth/signup').send(VALID_SIGNUP);

    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.signup.success',
        userId: FAKE_USER.id,
        email: FAKE_USER.email,
      }),
    );
    // Blacklist removed (re-login after signup)
    expect(blacklist.remove).toHaveBeenCalledWith(FAKE_USER.id);
  });

  it('returns 409 + logs failure event when email already exists', async () => {
    vi.mocked(AuthService.signupWithEmail).mockRejectedValueOnce(
      new ConflictError('Email already registered'),
    );

    const res = await getTestApp().post('/api/auth/signup').send(VALID_SIGNUP);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.login.failed',
        details: expect.objectContaining({ endpoint: 'signup' }),
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. POST /api/auth/login
// ═══════════════════════════════════════════════════════════════

describe('POST /api/auth/login', () => {
  it('returns 400 when email missing', async () => {
    const res = await getTestApp().post('/api/auth/login').send({ password: 'whatever' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('email');
  });

  it('returns 400 when password missing', async () => {
    const res = await getTestApp().post('/api/auth/login').send({ email: 'user@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('password');
  });

  it('returns 200 with auth payload on success', async () => {
    vi.mocked(AuthService.loginWithEmail).mockResolvedValueOnce(FAKE_AUTH_RESPONSE);

    const res = await getTestApp().post('/api/auth/login').send(VALID_LOGIN);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe(FAKE_USER.id);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth.login.success' }),
    );
    expect(blacklist.remove).toHaveBeenCalledWith(FAKE_USER.id);
  });

  it('returns 401 + logs failure on invalid credentials', async () => {
    vi.mocked(AuthService.loginWithEmail).mockRejectedValueOnce(
      new AuthenticationError('Invalid email or password'),
    );

    const res = await getTestApp().post('/api/auth/login').send(VALID_LOGIN);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.login.failed',
        email: VALID_LOGIN.email,
      }),
    );
  });

  it('does not log success event when service throws', async () => {
    vi.mocked(AuthService.loginWithEmail).mockRejectedValueOnce(new AuthenticationError('bad'));

    await getTestApp().post('/api/auth/login').send(VALID_LOGIN);

    const successCalls = vi
      .mocked(logSecurityEvent)
      .mock.calls.filter((call) => call[0].event === 'auth.login.success');
    expect(successCalls).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. POST /api/auth/otp/send
// ═══════════════════════════════════════════════════════════════

describe('POST /api/auth/otp/send', () => {
  it('returns 400 when destination missing', async () => {
    const res = await getTestApp().post('/api/auth/otp/send').send({ channel: 'email' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('destination');
  });

  it('returns 400 when channel is not email or phone', async () => {
    const res = await getTestApp()
      .post('/api/auth/otp/send')
      .send({ destination: 'user@example.com', channel: 'whatsapp' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('channel');
  });

  it('returns 200 with masked destination on success', async () => {
    vi.mocked(AuthService.sendOtp).mockResolvedValueOnce(FAKE_OTP_SEND);

    const res = await getTestApp()
      .post('/api/auth/otp/send')
      .send({ destination: 'user@example.com', channel: 'email' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.maskedDestination).toBe('t***@example.com');
    expect(res.body.data.expiresInSeconds).toBe(300);
  });

  it('logs auth.otp.requested with channel detail', async () => {
    vi.mocked(AuthService.sendOtp).mockResolvedValueOnce(FAKE_OTP_SEND);

    await getTestApp()
      .post('/api/auth/otp/send')
      .send({ destination: '+919999135340', channel: 'phone' });

    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.otp.requested',
        details: expect.objectContaining({ channel: 'phone' }),
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. POST /api/auth/otp/verify
// ═══════════════════════════════════════════════════════════════

describe('POST /api/auth/otp/verify', () => {
  const VALID_VERIFY = {
    destination: 'user@example.com',
    channel: 'email' as const,
    code: '123456',
  };

  it('returns 400 when code is not 6 digits', async () => {
    const res = await getTestApp()
      .post('/api/auth/otp/verify')
      .send({ ...VALID_VERIFY, code: '1234' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('code');
  });

  it('returns 400 when code contains non-digits', async () => {
    const res = await getTestApp()
      .post('/api/auth/otp/verify')
      .send({ ...VALID_VERIFY, code: '12ab56' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('code');
  });

  it('returns 200 + isNewUser=false for existing user', async () => {
    vi.mocked(AuthService.verifyOtp).mockResolvedValueOnce({
      ...FAKE_AUTH_RESPONSE,
      isNewUser: false,
    });

    const res = await getTestApp().post('/api/auth/otp/verify').send(VALID_VERIFY);

    expect(res.status).toBe(200);
    expect(res.body.data.isNewUser).toBe(false);
  });

  it('returns 201 + isNewUser=true for new user signup via OTP', async () => {
    vi.mocked(AuthService.verifyOtp).mockResolvedValueOnce({
      ...FAKE_AUTH_RESPONSE,
      isNewUser: true,
    });

    const res = await getTestApp()
      .post('/api/auth/otp/verify')
      .send({ ...VALID_VERIFY, name: 'Brand New User' });

    expect(res.status).toBe(201);
    expect(res.body.data.isNewUser).toBe(true);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.otp.verified',
        details: expect.objectContaining({ isNewUser: true }),
      }),
    );
  });

  it('logs auth.otp.failed on service error', async () => {
    vi.mocked(AuthService.verifyOtp).mockRejectedValueOnce(new AuthenticationError('Invalid OTP'));

    const res = await getTestApp().post('/api/auth/otp/verify').send(VALID_VERIFY);

    expect(res.status).toBe(401);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth.otp.failed' }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. POST /api/auth/google
// ═══════════════════════════════════════════════════════════════

describe('POST /api/auth/google', () => {
  const VALID_GOOGLE = {
    code: 'google-auth-code-12345',
    redirectUri: 'https://datunai.com/auth/google/callback',
  };

  it('returns 400 when code missing', async () => {
    const res = await getTestApp()
      .post('/api/auth/google')
      .send({ redirectUri: VALID_GOOGLE.redirectUri });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('code');
  });

  it('returns 400 when redirectUri is not a valid URL', async () => {
    const res = await getTestApp()
      .post('/api/auth/google')
      .send({ code: VALID_GOOGLE.code, redirectUri: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('redirectUri');
  });

  it('returns 200 for existing user (isNewUser=false)', async () => {
    vi.mocked(AuthService.loginWithGoogle).mockResolvedValueOnce(FAKE_AUTH_RESPONSE);

    const res = await getTestApp().post('/api/auth/google').send(VALID_GOOGLE);

    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(FAKE_USER.id);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth.google.success' }),
    );
  });

  it('returns 201 for new user (isNewUser=true)', async () => {
    vi.mocked(AuthService.loginWithGoogle).mockResolvedValueOnce({
      ...FAKE_AUTH_RESPONSE,
      isNewUser: true,
    });

    const res = await getTestApp().post('/api/auth/google').send(VALID_GOOGLE);

    expect(res.status).toBe(201);
  });

  it('returns 401 + logs failure when Google email unverified', async () => {
    vi.mocked(AuthService.loginWithGoogle).mockRejectedValueOnce(
      new AuthenticationError('Please verify your email with Google first'),
    );

    const res = await getTestApp().post('/api/auth/google').send(VALID_GOOGLE);

    expect(res.status).toBe(401);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth.google.failed' }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. GET /api/auth/google/consent-url
// ═══════════════════════════════════════════════════════════════

describe('GET /api/auth/google/consent-url', () => {
  it('returns 400 when redirect_uri query param missing', async () => {
    const res = await getTestApp().get('/api/auth/google/consent-url');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 200 with consent URL on valid redirect_uri', async () => {
    const fakeUrl =
      'https://accounts.google.com/o/oauth2/v2/auth?client_id=xxx&redirect_uri=https%3A%2F%2Fdatunai.com';
    vi.mocked(AuthService.getGoogleConsentUrl).mockReturnValueOnce(fakeUrl);

    const res = await getTestApp()
      .get('/api/auth/google/consent-url')
      .query({ redirect_uri: 'https://datunai.com/auth/google/callback' });

    expect(res.status).toBe(200);
    expect(res.body.data.url).toBe(fakeUrl);
    expect(AuthService.getGoogleConsentUrl).toHaveBeenCalledWith(
      'https://datunai.com/auth/google/callback',
    );
  });

  it('propagates service errors via error handler', async () => {
    vi.mocked(AuthService.getGoogleConsentUrl).mockImplementationOnce(() => {
      throw new Error('GOOGLE_CLIENT_ID not configured');
    });

    const res = await getTestApp()
      .get('/api/auth/google/consent-url')
      .query({ redirect_uri: 'https://datunai.com/cb' });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. POST /api/auth/forgot-password
// ═══════════════════════════════════════════════════════════════

describe('POST /api/auth/forgot-password', () => {
  it('returns 400 when email is malformed', async () => {
    const res = await getTestApp().post('/api/auth/forgot-password').send({ email: 'not-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('email');
  });

  it('returns 200 with generic message (no enumeration leak)', async () => {
    vi.mocked(AuthService.forgotPassword).mockResolvedValueOnce(undefined);

    const res = await getTestApp()
      .post('/api/auth/forgot-password')
      .send({ email: 'maybe-exists@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Critical: response message MUST be identical regardless of email existence.
    // Otherwise attacker can enumerate registered emails (security bug).
    expect(res.body.data.message).toMatch(/if an account exists/i);
  });

  it('logs auth.password.reset.requested event', async () => {
    vi.mocked(AuthService.forgotPassword).mockResolvedValueOnce(undefined);

    await getTestApp().post('/api/auth/forgot-password').send({ email: 'user@example.com' });

    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth.password.reset.requested' }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. POST /api/auth/reset-password
// ═══════════════════════════════════════════════════════════════

describe('POST /api/auth/reset-password', () => {
  const VALID_RESET = {
    email: 'user@example.com',
    otp: '123456',
    newPassword: 'NewStrongPass1',
  };

  it('returns 400 when OTP is wrong length', async () => {
    const res = await getTestApp()
      .post('/api/auth/reset-password')
      .send({ ...VALID_RESET, otp: '12345' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('otp');
  });

  it('returns 400 when newPassword is too weak', async () => {
    const res = await getTestApp()
      .post('/api/auth/reset-password')
      .send({ ...VALID_RESET, newPassword: 'weak' });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('newPassword');
  });

  it('returns 200 + invalidates all existing sessions on success', async () => {
    vi.mocked(AuthService.resetPassword).mockResolvedValueOnce(FAKE_AUTH_RESPONSE);

    const res = await getTestApp().post('/api/auth/reset-password').send(VALID_RESET);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Critical: blacklist.add MUST be called with userId — forces re-login on
    // all existing sessions (other devices) for security after password reset.
    expect(blacklist.add).toHaveBeenCalledWith(FAKE_USER.id, expect.any(Number));
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth.password.changed' }),
    );
  });

  it('returns 401 + logs failure on invalid OTP', async () => {
    vi.mocked(AuthService.resetPassword).mockRejectedValueOnce(
      new AuthenticationError('Invalid or expired OTP'),
    );

    const res = await getTestApp().post('/api/auth/reset-password').send(VALID_RESET);

    expect(res.status).toBe(401);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.otp.failed',
        details: expect.objectContaining({ endpoint: 'reset-password' }),
      }),
    );
  });

  it('does not call blacklist.add when service throws', async () => {
    vi.mocked(AuthService.resetPassword).mockRejectedValueOnce(new AuthenticationError('bad'));

    await getTestApp().post('/api/auth/reset-password').send(VALID_RESET);

    expect(blacklist.add).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// 9. POST /api/auth/refresh
// ═══════════════════════════════════════════════════════════════

describe('POST /api/auth/refresh', () => {
  it('returns 400 when refreshToken missing', async () => {
    const res = await getTestApp().post('/api/auth/refresh').send({});

    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('refreshToken');
  });

  it('returns 200 with new token pair on success', async () => {
    vi.mocked(AuthService.refreshToken).mockResolvedValueOnce({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
    });

    const res = await getTestApp()
      .post('/api/auth/refresh')
      .send({ refreshToken: 'old-refresh-token' });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBe('new-access-token');
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth.token.refresh' }),
    );
  });

  it('returns 401 + logs token.expired on invalid refresh token', async () => {
    vi.mocked(AuthService.refreshToken).mockRejectedValueOnce(
      new AuthenticationError('Refresh token expired'),
    );

    const res = await getTestApp().post('/api/auth/refresh').send({ refreshToken: 'expired' });

    expect(res.status).toBe(401);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'auth.token.expired' }),
    );
  });

  it('does not log success event when refresh fails', async () => {
    vi.mocked(AuthService.refreshToken).mockRejectedValueOnce(new AuthenticationError('bad'));

    await getTestApp().post('/api/auth/refresh').send({ refreshToken: 'x' });

    const successCalls = vi
      .mocked(logSecurityEvent)
      .mock.calls.filter((call) => call[0].event === 'auth.token.refresh');
    expect(successCalls).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 10. GET /api/auth/me  (requires JWT + DB user load)
// ═══════════════════════════════════════════════════════════════

describe('GET /api/auth/me', () => {
  it('returns 401 when Authorization header missing', async () => {
    const res = await getTestApp().get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(res.body.error.message).toMatch(/bearer token required/i);
  });

  it('returns 401 when Bearer token is invalid', async () => {
    vi.mocked(JwtService.verifyAccessToken).mockImplementationOnce(() => {
      throw new Error('jwt malformed');
    });

    const res = await getTestApp().get('/api/auth/me').set('Authorization', 'Bearer garbage-token');

    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/invalid or expired token/i);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'suspicious.invalid_token' }),
    );
  });

  it('returns 401 when user is blacklisted', async () => {
    vi.mocked(JwtService.verifyAccessToken).mockReturnValueOnce(FAKE_DECODED_TOKEN);
    vi.mocked(blacklist.isBlacklisted).mockResolvedValueOnce(true);

    const res = await getTestApp()
      .get('/api/auth/me')
      .set('Authorization', 'Bearer valid-but-blacklisted');

    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/session expired/i);
  });

  it('returns 200 with user profile (no passwordHash leak)', async () => {
    vi.mocked(JwtService.verifyAccessToken).mockReturnValueOnce(FAKE_DECODED_TOKEN);
    vi.mocked(blacklist.isBlacklisted).mockResolvedValueOnce(false);
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      id: FAKE_USER.id,
      email: FAKE_USER.email,
      name: FAKE_USER.name,
      phone: FAKE_USER.phone,
      avatarUrl: FAKE_USER.avatarUrl,
      primaryRole: 'PATIENT',
      isEmailVerified: true,
      isPhoneVerified: false,
      isActive: true,
      passwordHash: 'should-never-leak-bcrypt-hash',
      lastLoginAt: new Date(),
    } as never);

    const res = await getTestApp().get('/api/auth/me').set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(FAKE_USER.id);
    expect(res.body.data.email).toBe(FAKE_USER.email);
    expect(res.body.data.role).toBe('PATIENT');
    // CRITICAL SECURITY ASSERTION: passwordHash MUST NEVER appear in response
    expect(JSON.stringify(res.body)).not.toContain('should-never-leak-bcrypt-hash');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });
});

// ═══════════════════════════════════════════════════════════════
// 11. POST /api/auth/logout  (requires JWT)
// ═══════════════════════════════════════════════════════════════

describe('POST /api/auth/logout', () => {
  it('returns 401 when Authorization header missing', async () => {
    const res = await getTestApp().post('/api/auth/logout');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('returns 401 + logs suspicious event on invalid token', async () => {
    vi.mocked(JwtService.verifyAccessToken).mockImplementationOnce(() => {
      throw new Error('invalid signature');
    });

    const res = await getTestApp()
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer tampered.token.here');

    expect(res.status).toBe(401);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'suspicious.invalid_token' }),
    );
  });

  it('returns 200 + blacklists user on successful logout', async () => {
    vi.mocked(JwtService.verifyAccessToken).mockReturnValueOnce(FAKE_DECODED_TOKEN);
    vi.mocked(blacklist.isBlacklisted).mockResolvedValueOnce(false);

    const res = await getTestApp()
      .post('/api/auth/logout')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toMatch(/logged out/i);
    // Critical: blacklist.add called with userId + token expiry timestamp
    expect(blacklist.add).toHaveBeenCalledWith(FAKE_DECODED_TOKEN.sub, FAKE_DECODED_TOKEN.exp);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'auth.logout',
        userId: FAKE_DECODED_TOKEN.sub,
      }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// CROSS-CUTTING — Response envelope contract
// ═══════════════════════════════════════════════════════════════

describe('Auth router — response envelope contract', () => {
  it('all success responses have { success: true, data }', async () => {
    vi.mocked(AuthService.loginWithEmail).mockResolvedValueOnce(FAKE_AUTH_RESPONSE);

    const res = await getTestApp().post('/api/auth/login').send(VALID_LOGIN);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body).not.toHaveProperty('error');
  });

  it('all error responses have { success: false, error: { code, message }, meta }', async () => {
    const res = await getTestApp().post('/api/auth/login').send({ email: 'bad' });

    expect(res.body).toHaveProperty('success', false);
    expect(res.body).toHaveProperty('error.code');
    expect(res.body).toHaveProperty('error.message');
    expect(res.body).toHaveProperty('meta.requestId');
    expect(res.body).not.toHaveProperty('data');
  });
});
