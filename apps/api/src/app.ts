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
import { mountBullBoard } from './lib/queue/dashboard.js';

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
  // CRITICAL: `verify` callback captures raw bytes BEFORE parsing.
  // Webhook signature verification (Meta/Gupshup HMAC-SHA256) requires
  // the EXACT bytes Meta hashed — re-serializing parsed JSON via
  // JSON.stringify(req.body) produces different bytes (key order, whitespace,
  // unicode escaping) and breaks HMAC verification intermittently.
  // Pattern: Stripe webhook docs explicitly warn about this.
  // The raw body is exposed as `req.rawBody` for downstream handlers.
  app.use(
    express.json({
      limit: '20mb',
      verify: (req, _res, buf) => {
        // Attach raw body buffer as UTF-8 string.
        // Express types don't include rawBody by default — extend via `as any`.
        (req as unknown as { rawBody: string }).rawBody = buf.toString('utf8');
      },
    }),
  );

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

  // Mount bull-board dashboard at /internal/queues (basic auth)
  mountBullBoard(app);

  // ── Error handlers (MUST be after all routes) ──
  setupErrorHandlers(app);

  return app;
}
