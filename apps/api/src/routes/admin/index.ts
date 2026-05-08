// ═══════════════════════════════════════════════════════════════
// ADMIN ROUTES — Mount point for all /api/admin/* sub-routers
//
// Gating:
//   - featureFlags.adminRoutesEnabled (default true in non-production)
//   - requireAuth + requireRole('ADMIN') on every sub-router
//
// Sub-routers:
//   /api/admin/anonymization  — DPDP-grade ad-hoc anonymization
//   /api/admin/data-quality   — DQ scorecard + recent run
//   /api/admin/prompts        — Prompt version management
//   /api/admin/experiments    — A/B experiment management
//   /api/admin/outbox         — Outbox ops (DLQ replay, status)
//
// Pattern: Stripe internal admin routes (gated by both flag + RBAC).
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { featureFlags } from '../../config/feature-flags.js';
import { logger } from '../../lib/logger.js';
import { anonymizationRouter } from './anonymization.router.js';
import { dataQualityAdminRouter } from './data-quality.router.js';
import { promptsRouter } from './prompts.router.js';
import { experimentsRouter } from './experiments.router.js';
import { outboxAdminRouter } from './outbox.router.js';

export const adminRouter = Router();

if (featureFlags.adminRoutesEnabled) {
  // Every admin route requires JWT + ADMIN role
  adminRouter.use(requireAuth, requireRole('ADMIN'));

  adminRouter.use('/anonymization', anonymizationRouter);
  adminRouter.use('/data-quality', dataQualityAdminRouter);
  adminRouter.use('/prompts', promptsRouter);
  adminRouter.use('/experiments', experimentsRouter);
  adminRouter.use('/outbox', outboxAdminRouter);

  logger.info('Admin routes mounted at /api/admin/*');
} else {
  logger.info('Admin routes disabled by flag (ADMIN_ROUTES_ENABLED=false)');
}
