// apps/api/src/routes/index.ts
// ═══════════════════════════════════════════════════════════════
// ROUTE INDEX — Mount all routers onto Express app
// One file to see every endpoint the API serves.
//
// Task #45 (CSP):
//   - /api/security/csp-report  → mounted directly on `app` in app.ts
//     (uses its own rate limiter, bypasses generalLimiter).
//   - /api/admin/security/*     → mounted under admin/index.ts (this file
//     does not need updating; admin/index.ts adds the new sub-router).
//
// Task #49 (Feature Flags):
//   - /api/flags                → public flag map endpoint (optional
//     auth) mounted here under generalLimiter for parity with other
//     public reads.
//   - /api/admin/flags/*        → admin CRUD; mounted by admin/index.ts.
//
// Task #52 (Error Boundaries):
//   - /api/audit/error          → public-ish (optionalAuth) audit
//     ingestion endpoint. Mounted under generalLimiter so an
//     attacker can't spam more than 500 audit writes per 15 min
//     per IP. See routes/audit.router.ts for rationale on
//     optionalAuth.
// ═══════════════════════════════════════════════════════════════

import type { Express } from 'express';
import { healthRouter } from './health.router.js';
import { authRouter } from './auth.router.js';
import { chatRouter } from './chat.router.js';
import { consultationRouter } from './consultation.router.js';
import { userRouter } from './user.router.js';
import { webhookRouter } from './webhook.router.js';
import { adminRouter } from './admin/index.js';
import { mediaRouter } from './media.router.js';
import { flagsRouter } from './flags.router.js';
import { auditRouter } from './audit.router.js';
import { generalLimiter } from '../middleware/rate-limit.js';

export function mountRoutes(app: Express): void {
  // Public — no auth, no rate limit
  app.use(healthRouter);

  // API — rate limited (500/15min general limiter)
  app.use('/api', generalLimiter, authRouter);
  app.use('/api', chatRouter);
  app.use('/api', consultationRouter);
  app.use('/api', userRouter);
  app.use('/api', mediaRouter);

  // Task #49 — public feature flag map endpoint (optional auth).
  // Mounted under generalLimiter to match read-side public routes.
  app.use('/api', generalLimiter, flagsRouter);

  // Task #52 — error audit ingestion (optional auth).
  // generalLimiter keeps audit writes capped at 500/15min/IP — enough
  // for legitimate use (errors are rare per session), too low for abuse.
  app.use('/api', generalLimiter, auditRouter);

  // Admin API — JWT + ADMIN role required, gated by ADMIN_ROUTES_ENABLED flag.
  // Includes /api/admin/security/* (Task #45) and /api/admin/flags/* (Task #49).
  app.use('/api/admin', adminRouter);

  // WhatsApp webhook — no rate limit (Meta sends bursts)
  app.use('/webhook', webhookRouter);
}
