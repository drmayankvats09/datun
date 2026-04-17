// ═══════════════════════════════════════════════════════════════
// EXPRESS APP FACTORY — Middleware + Routes assembly
// Separated from server.ts for testability.
// ═══════════════════════════════════════════════════════════════

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { requestIdMiddleware } from './middleware/request-id.js';
import { mountRoutes } from './routes/index.js';
import { setupErrorHandlers } from './middleware/error-handler.js';

const ALLOWED_ORIGINS = [
  'https://datunai.com',
  'https://www.datunai.com',
  'https://datun.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5500',
];

export function createApp(): express.Express {
  const app = express();

  // Trust proxy (Railway/Vercel)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // Body parsing (20MB for base64 dental photos)
  app.use(express.json({ limit: '20mb' }));

  // CORS
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
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
