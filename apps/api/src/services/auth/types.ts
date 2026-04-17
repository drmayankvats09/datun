// ═══════════════════════════════════════════════════════════════
// AUTH PROVIDER TYPES — Abstraction for token verification
// Today: Auth0 JWKS. Tomorrow: own JWT. Day after: multi-provider.
// Middleware doesn't care WHO issued the token — just verifies it.
// Pattern: Strategy pattern. passport.js concept but cleaner.
// ═══════════════════════════════════════════════════════════════

import type { DecodedToken } from '../../types/index.js';

export interface AuthProvider {
  /** Human-readable provider name for logs */
  readonly name: string;

  /** Verify a bearer token, return decoded payload or throw */
  verifyToken(token: string): Promise<DecodedToken>;
}
