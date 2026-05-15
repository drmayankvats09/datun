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

  // Admin API — JWT + ADMIN role required, gated by ADMIN_ROUTES_ENABLED flag.
  // Includes /api/admin/security/* (Task #45).
  app.use('/api/admin', adminRouter);

  // WhatsApp webhook — no rate limit (Meta sends bursts)
  app.use('/webhook', webhookRouter);
}
