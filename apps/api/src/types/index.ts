// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS — Express augmentation + API contracts
// req.auth = decoded JWT, req.dbUser = Prisma User row
// ═══════════════════════════════════════════════════════════════

import type { User } from '@repo/db';

/** Decoded Auth0 JWT payload */
export interface DecodedToken {
  sub: string; // "google-oauth2|12345" or "auth0|67890"
  aud: string | string[];
  iss: string;
  iat: number;
  exp: number;
  azp?: string;
  scope?: string;
}

/** Consistent API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    requestId: string;
    durationMs: number;
  };
}

/** Augment Express Request */
declare global {
  namespace Express {
    interface Request {
      /** Decoded JWT token — set by requireAuth middleware */
      auth?: DecodedToken;
      /** Full Prisma User row — set by requireUser middleware */
      dbUser?: User;
      /** Unique request identifier for tracing */
      requestId?: string;
    }
  }
}

export {};
