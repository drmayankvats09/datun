// ═══════════════════════════════════════════════════════════════
// AUTH0 PROVIDER — JWKS-based JWT verification
// Caches signing keys (jwks-rsa built-in cache).
// Zero Auth0 API calls per request — purely cryptographic verification.
// ═══════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { env } from '../../config/env.js';
import type { AuthProvider } from './types.js';
import type { DecodedToken } from '../../types/index.js';

export class Auth0Provider implements AuthProvider {
  readonly name = 'auth0';

  private readonly client: ReturnType<typeof jwksClient>;
  private readonly audience: string;
  private readonly issuer: string;

  constructor() {
    this.client = jwksClient({
      jwksUri: `https://${env.AUTH0_DOMAIN}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 600_000, // 10 min cache
      rateLimit: true,
      jwksRequestsPerMinute: 5,
    });
    this.audience = env.AUTH0_AUDIENCE;
    this.issuer = `https://${env.AUTH0_DOMAIN}/`;
  }

  async verifyToken(token: string): Promise<DecodedToken> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        (header, callback) => {
          this.client.getSigningKey(header.kid, (err, key) => {
            if (err) return callback(err);
            callback(null, key?.getPublicKey());
          });
        },
        {
          audience: this.audience,
          issuer: this.issuer,
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err) return reject(err);
          resolve(decoded as DecodedToken);
        },
      );
    });
  }
}
