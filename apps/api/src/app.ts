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

  // ── Trust proxy ──
  // Railway sits behind its own proxy, and now Cloudflare is in front too.
  // Trust 2 levels: Cloudflare edge → Railway proxy → Express
  app.set('trust proxy', 2);

  // ── Security headers ──
  app.use(
    helmet({
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'sameorigin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          scriptSrc: ["'none'"],
          styleSrc: ["'none'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
    }),
  );

  // ── Body parsing (20MB for base64 dental photos) ──
  app.use(express.json({ limit: '20mb' }));

  // ── CORS — origins from @repo/shared ──
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

  // ── Cloudflare Real IP extraction ──
  app.use((req, _res, next) => {
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp && typeof cfIp === 'string') {
      req.headers['x-forwarded-for'] = cfIp;
      req.headers['x-real-ip'] = cfIp;
    }
    next();
  });

  // ── Request ID tracing (before routes) ──
  app.use(requestIdMiddleware);

  // ── All routes ──
  mountRoutes(app);

  // ── Error handlers (MUST be after all routes) ──
  setupErrorHandlers(app);

  return app;
}
