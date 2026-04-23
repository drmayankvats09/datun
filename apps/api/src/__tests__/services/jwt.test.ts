import { describe, it, expect } from 'vitest';
import { JwtService } from '../../services/auth/jwt.service.js';

const testPayload = {
  userId: 'user-001',
  email: 'test@datunai.com',
  role: 'PATIENT' as const,
};

describe('JwtService', () => {
  // ── Token generation ──
  it('generates access + refresh token pair', () => {
    const tokens = JwtService.generateTokens(testPayload);
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.expiresIn).toBe(3600);
    expect(typeof tokens.accessToken).toBe('string');
    expect(typeof tokens.refreshToken).toBe('string');
  });

  it('access and refresh tokens are different', () => {
    const tokens = JwtService.generateTokens(testPayload);
    expect(tokens.accessToken).not.toBe(tokens.refreshToken);
  });

  // ── Access token verification ──
  it('verifies valid access token', () => {
    const tokens = JwtService.generateTokens(testPayload);
    const decoded = JwtService.verifyAccessToken(tokens.accessToken);
    expect(decoded.sub).toBe('user-001');
    expect(decoded.email).toBe('test@datunai.com');
    expect(decoded.role).toBe('PATIENT');
    expect(decoded.type).toBe('access');
    expect(decoded.iss).toBe('datun');
  });

  it('rejects refresh token when access expected', () => {
    const tokens = JwtService.generateTokens(testPayload);
    expect(() => JwtService.verifyAccessToken(tokens.refreshToken)).toThrow('expected access');
  });

  // ── Refresh token verification ──
  it('verifies valid refresh token', () => {
    const tokens = JwtService.generateTokens(testPayload);
    const decoded = JwtService.verifyRefreshToken(tokens.refreshToken);
    expect(decoded.sub).toBe('user-001');
    expect(decoded.type).toBe('refresh');
  });

  it('rejects access token when refresh expected', () => {
    const tokens = JwtService.generateTokens(testPayload);
    expect(() => JwtService.verifyRefreshToken(tokens.accessToken)).toThrow('expected refresh');
  });

  // ── Invalid tokens ──
  it('rejects malformed token', () => {
    expect(() => JwtService.verifyAccessToken('not-a-jwt')).toThrow();
  });

  it('rejects token with wrong secret', () => {
    // nosemgrep: generic.secrets.security.detected-jwt-token
    const fakeToken = [
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
      'eyJzdWIiOiIxIiwidHlwZSI6ImFjY2VzcyJ9',
      'fake',
    ].join('.');
    expect(() => JwtService.verifyAccessToken(fakeToken)).toThrow();
  });

  // ── Unsafe decode (for debugging) ──
  it('decodeUnsafe returns payload without verification', () => {
    const tokens = JwtService.generateTokens(testPayload);
    const decoded = JwtService.decodeUnsafe(tokens.accessToken);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe('user-001');
  });

  it('decodeUnsafe returns null for invalid token', () => {
    const result = JwtService.decodeUnsafe('garbage');
    expect(result).toBeNull();
  });

  // ── Different roles generate different tokens ──
  it('embeds role correctly for different user types', () => {
    const doctorTokens = JwtService.generateTokens({
      ...testPayload,
      role: 'DOCTOR',
    });
    const decoded = JwtService.verifyAccessToken(doctorTokens.accessToken);
    expect(decoded.role).toBe('DOCTOR');
  });
});
