// ═══════════════════════════════════════════════════════════════
// AUTH ROUTES — /api/auth/*
// User creation/login after Auth0 authentication.
// TODO: Implement findOrCreate logic in Task #24+
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { authUserSchema } from '../validators/schemas.js';

export const authRouter = Router();

// POST /api/auth/user — Find or create user after Auth0 login
authRouter.post(
  '/auth/user',
  authLimiter,
  requireAuth,
  validate(authUserSchema),
  async (_req, res) => {
    // TODO (Task #24): Find user by req.auth.sub (Auth0 ID)
    // If not found: create User + Patient + UserAuthIdentity rows
    // If found: update lastLoginAt, return user data
    // Always return: { success: true, data: { user, isNewUser } }
    res.status(501).json({
      success: false,
      error: { code: 'NOT_IMPLEMENTED', message: 'Auth user endpoint pending implementation' },
    });
  },
);
