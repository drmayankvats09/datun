// ═══════════════════════════════════════════════════════════════
// EXPRESS APP FACTORY — Middleware + Routes assembly
// Separated from server.ts for testability.
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { URLS } from '@repo/shared';
import { requestIdMiddleware } from './middleware/request-id.js';
import { mountRoutes } from './routes/index.js';
import { setupErrorHandlers } from './middleware/error-handler.js';

export function createApp(): express.Express {
  const app = express();

  // Trust proxy (Railway/Vercel)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // Body parsing (20MB for base64 dental photos)
  app.use(express.json({ limit: '20mb' }));

  // CORS — origins from @repo/shared
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || URLS.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    }),
  );

  // Request ID tracing (before routes)
  app.use(requestIdMiddleware);

  // All routes
  mountRoutes(app);

  // Error handlers (MUST be after all routes)
  setupErrorHandlers(app);

  return app;
}
