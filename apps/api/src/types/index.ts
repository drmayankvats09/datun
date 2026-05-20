// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS — Express augmentation + API contracts
// ─────────────────────────────────────────────────────────────────
// Task #49 addition (ADDITIVE — zero risk):
//   Adds `req.featureFlags?: FlagMap` so every handler can read the
//   per-request flag map populated by `flagsMiddleware`. Kept optional
//   because middleware failures must never block the request — the
//   handler treats `undefined` as "use defaults" (see flag-defaults.ts).
// ═══════════════════════════════════════════════════════════════

import type { User } from '@repo/db';
import type { FlagMap } from '@repo/shared';
import type { DecodedToken } from '../services/auth/types.js';

export type { DecodedToken };

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

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: DecodedToken;
      dbUser?: User;
      requestId?: string;
      /**
       * Task #49: Per-request feature-flag snapshot, populated by
       * `flagsMiddleware`. Optional — when middleware fails, the
       * request continues with `undefined` and downstream code should
       * fall back to `getDefaultFlagMap()` from the flag service.
       *
       * Key = `FlagKey` (kebab-case scoped name).
       * Value = resolved boolean for THIS request's identity context.
       */
      featureFlags?: FlagMap;
    }
  }
}

export {};
