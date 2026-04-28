// ═══════════════════════════════════════════════════════════════
// JWT SERVICE — Own token issuer + verifier
// HS256 signing. Access: 1hr (JWT_SECRET). Refresh: 30d (JWT_REFRESH_SECRET).
// Different secrets = compromise of one doesn't compromise other.
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

// P2-F7: Separate secret for refresh tokens. Falls back to JWT_SECRET if not set.
const REFRESH_SECRET = env.JWT_REFRESH_SECRET ?? env.JWT_SECRET;

export class JwtService {
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
      REFRESH_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
    };
  }

  static verifyAccessToken(token: string): DecodedToken {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: ISSUER,
    }) as DecodedToken;

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type: expected access token');
    }

    return decoded;
  }

  static verifyRefreshToken(token: string): DecodedToken {
    // P2-F7: Uses separate REFRESH_SECRET
    const decoded = jwt.verify(token, REFRESH_SECRET, {
      issuer: ISSUER,
    }) as DecodedToken;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type: expected refresh token');
    }

    return decoded;
  }

  static decodeUnsafe(token: string): DecodedToken | null {
    try {
      return jwt.decode(token) as DecodedToken | null;
    } catch {
      return null;
    }
  }
}
