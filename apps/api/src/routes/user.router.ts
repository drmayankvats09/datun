// ═══════════════════════════════════════════════════════════════
// USER ROUTES — /api/profile, /api/user/*
// Profile management + consultation history access.
// TODO: Implement handlers in Task #24+
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { requireUser } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { profileUpdateSchema } from '../validators/schemas.js';

export const userRouter = Router();

// PATCH /api/profile — Update user profile
userRouter.patch('/profile', requireUser, validate(profileUpdateSchema), async (_req, res) => {
  // TODO (Task #24): Update User + Patient via Prisma
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Pending implementation' },
  });
});

// GET /api/user/consultations — List user's consultations (drawer)
userRouter.get('/user/consultations', requireUser, async (_req, res) => {
  // TODO (Task #24): Prisma query — user's consultations, sorted by updatedAt desc
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Pending implementation' },
  });
});

// GET /api/user/consultation/:id — Single consultation detail
userRouter.get('/user/consultation/:id', requireUser, async (_req, res) => {
  // TODO (Task #24): Fetch single consultation + messages
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Pending implementation' },
  });
});

// DELETE /api/user/consultation/:id — Soft delete
userRouter.delete('/user/consultation/:id', requireUser, async (_req, res) => {
  // TODO (Task #24): Set deletedAt = NOW(), never hard delete
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Pending implementation' },
  });
});
