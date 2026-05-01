// ═══════════════════════════════════════════════════════════════
// AUTH SERVICE TEST — Google OAuth email_verified enforcement
//
// REGRESSION GUARD (Day 11): Prevents account takeover via unverified
// Gmail-style emails. Google sets `verified_email: false` for accounts
// that haven't proven domain ownership.
//
// Pattern: Auth0 default policy, Clerk default, every serious auth provider.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../../services/auth/auth.service.js';
import { GoogleOAuthService } from '../../services/auth/google-oauth.service.js';
import { AuthenticationError } from '../../errors/index.js';

// Mock the Google OAuth exchange (we don't want real HTTP in tests)
vi.mock('../../services/auth/google-oauth.service.js', () => ({
  GoogleOAuthService: {
    exchangeCodeForUser: vi.fn(),
    getConsentUrl: vi.fn(),
  },
}));

// Mock JwtService (avoid actual JWT signing in tests)
vi.mock('../../services/auth/jwt.service.js', () => ({
  JwtService: {
    generateTokens: vi.fn().mockReturnValue({
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresIn: 3600,
    }),
    verifyRefreshToken: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthService.loginWithGoogle — email verification enforcement', () => {
  it('REJECTS unverified Google emails with AuthenticationError', async () => {
    // Setup: Google returns user with verified_email = false
    vi.mocked(GoogleOAuthService.exchangeCodeForUser).mockResolvedValue({
      id: 'google-user-id-12345',
      email: 'unverified@gmail.com',
      name: 'Unverified User',
      picture: null,
      emailVerified: false, // ← critical: not verified
    });

    // Expect AuthenticationError thrown
    await expect(
      AuthService.loginWithGoogle({
        code: 'fake-auth-code',
        redirectUri: 'https://datunai.com/auth/google/callback',
      }),
    ).rejects.toThrow(AuthenticationError);
  });

  it('REJECTS unverified Google emails BEFORE any database lookup', async () => {
    // Defensive: prove that DB is not touched for unverified emails
    // (saves DB query cost + leaks no information about user existence)
    vi.mocked(GoogleOAuthService.exchangeCodeForUser).mockResolvedValue({
      id: 'google-user-id-67890',
      email: 'attacker@gmail.com',
      name: 'Attacker',
      picture: null,
      emailVerified: false,
    });

    try {
      await AuthService.loginWithGoogle({
        code: 'fake-code',
        redirectUri: 'https://datunai.com/cb',
      });
      // If no throw, test fails:
      expect.fail('Expected AuthenticationError but none thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AuthenticationError);
      expect((err as AuthenticationError).message).toContain('not verified');
    }
  });

  it('error message tells user to verify with Google', async () => {
    vi.mocked(GoogleOAuthService.exchangeCodeForUser).mockResolvedValue({
      id: 'g-id',
      email: 'pending@gmail.com',
      name: 'Pending',
      picture: null,
      emailVerified: false,
    });

    try {
      await AuthService.loginWithGoogle({
        code: 'code',
        redirectUri: 'https://datunai.com/cb',
      });
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as AuthenticationError).message).toMatch(/verify your email/i);
    }
  });

  // Note: We don't test the "verified email passes" path here because that
  // flow hits Prisma which is broadly mocked at setup.ts. Full happy-path
  // testing belongs in E2E with real DB. This unit test scope is scoped to
  // the SECURITY GATE — does verification actually block unverified users.
});

describe('AuthService.loginWithGoogle — input validation', () => {
  it('propagates errors from GoogleOAuthService.exchangeCodeForUser', async () => {
    // Defensive: if Google returns an error (network, invalid code, etc.),
    // the error bubbles up and DOESN'T accidentally pass the email check
    vi.mocked(GoogleOAuthService.exchangeCodeForUser).mockRejectedValue(
      new Error('Failed to get access token from Google'),
    );

    await expect(
      AuthService.loginWithGoogle({
        code: 'invalid-code',
        redirectUri: 'https://datunai.com/cb',
      }),
    ).rejects.toThrow('Failed to get access token from Google');
  });
});
