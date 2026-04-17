// ═══════════════════════════════════════════════════════════════
// ROUTE INDEX — Mount all routers onto Express app
// One file to see every endpoint the API serves.
// ═══════════════════════════════════════════════════════════════

import type { Express } from 'express';
import { healthRouter } from './health.router.js';
import { authRouter } from './auth.router.js';
import { chatRouter } from './chat.router.js';
import { consultationRouter } from './consultation.router.js';
import { userRouter } from './user.router.js';
import { webhookRouter } from './webhook.router.js';
import { generalLimiter } from '../middleware/rate-limit.js';

export function mountRoutes(app: Express): void {
  // Public — no auth, no rate limit
  app.use(healthRouter);

  // API — rate limited
  app.use('/api', generalLimiter, authRouter);
  app.use('/api', chatRouter);
  app.use('/api', consultationRouter);
  app.use('/api', userRouter);

  // WhatsApp webhook — no rate limit (Meta sends bursts)
  app.use('/webhook', webhookRouter);
}
