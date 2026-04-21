// ═══════════════════════════════════════════════════════════════
// JWT SERVICE — Own token issuer + verifier
// HS256 signing. Access token: 1hr. Refresh token: 30 days.
// No Auth0, no 3rd party. 100% Datun-issued tokens.
// Pattern: Stripe API keys, Google ID tokens, Clerk JWTs.
// ═══════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import type { DecodedToken, AuthTokens } from './types.js';
import type { UserPrimaryRole } from '@repo/db';

const ISSUER = 'datun';
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '30d';
const ACCESS_TOKEN_EXPIRY_SECONDS = 3600;

export class JwtService {
  /**
   * Generate access + refresh token pair for a user.
   */
  static generateTokens(payload: {
    userId: string;
    email: string;
    role: UserPrimaryRole;
  }): AuthTokens {
    const accessToken = jwt.sign(
      {
        sub: payload.userId,
        email: payload.email,
        role: payload.role,
        type: 'access' as const,
        iss: ISSUER,
      },
      env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    const refreshToken = jwt.sign(
      {
        sub: payload.userId,
        email: payload.email,
        role: payload.role,
        type: 'refresh' as const,
        iss: ISSUER,
      },
      env.JWT_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  /**
   * Verify and decode an access token.
   * Throws if expired, malformed, or wrong type.
   */
  static verifyAccessToken(token: string): DecodedToken {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: ISSUER,
    }) as DecodedToken;

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type: expected access token');
    }

    return decoded;
  }

  /**
   * Verify and decode a refresh token.
   * Throws if expired, malformed, or wrong type.
   */
  static verifyRefreshToken(token: string): DecodedToken {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: ISSUER,
    }) as DecodedToken;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type: expected refresh token');
    }

    return decoded;
  }

  /**
   * Decode token WITHOUT verification (for debugging/logging).
   * Never trust the output for authorization.
   */
  static decodeUnsafe(token: string): DecodedToken | null {
    try {
      return jwt.decode(token) as DecodedToken | null;
    } catch {
      return null;
    }
  }
}
