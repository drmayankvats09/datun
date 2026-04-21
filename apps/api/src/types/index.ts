// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS — Express augmentation + API contracts
// ═══════════════════════════════════════════════════════════════

import type { User } from '@repo/db';
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
  namespace Express {
    interface Request {
      auth?: DecodedToken;
      dbUser?: User;
      requestId?: string;
    }
  }
}

export {};
