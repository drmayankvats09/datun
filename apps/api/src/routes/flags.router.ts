// apps/api/src/routes/flags.router.ts
// ═══════════════════════════════════════════════════════════════
// PUBLIC FLAGS ROUTER — GET /api/flags (Task #49)
// ─────────────────────────────────────────────────────────────────
// Single endpoint returning the evaluated flag map for the caller.
//
// Authentication:
//   `optionalAuth` — works for both authenticated requests (uses the
//   JWT subject for personalised bucketing / targeting) and anonymous
//   requests (uses the anonymous context — bucket-by-IP-derived
//   region only).
//
// Response shape (stable wire contract):
//   {
//     "success": true,
//     "data": {
//       "flags": { "consultation.streaming": true, ... },
//       "context": { "anonymous": true|false, "region": "IN" | null,
//                    "userId": "user_..." | null },
//       "evaluatedAt": "2026-05-19T12:34:56.789Z",
//       "ttlSeconds": 60
//     }
//   }
//
// The browser caches the response for `ttlSeconds`, then re-fetches.
// On admin flag change, the Phase C provider listens for Server-Sent
// Events on `/api/flags/stream` (Phase D enhancement) to drop the
// cache instantly — Day 1 ships with poll-only.
//
// Performance:
//   - Hot path = `evaluateAll(context)` ≈ 200µs with warm L1.
//   - Payload is ~600 bytes gzipped (30 flag keys × ~20 bytes each).
//
// Reference patterns:
//   - PostHog `/decide/?v=3` (returns the flag map for distinct_id).
//   - Vercel `/.well-known/vercel/flags`.
//   - LaunchDarkly `/sdk/eval/<env>/users`.
// ═══════════════════════════════════════════════════════════════

import { Router, type Request, type Response, type NextFunction } from 'express';
import { evaluateAll } from '../services/flag/index.js';
import { optionalAuth } from '../middleware/auth.js';
import { flagContextFromRequest } from '../middleware/flags.middleware.js';
import { env } from '../config/env.js';

export const flagsRouter = Router();

flagsRouter.get('/flags', optionalAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = flagContextFromRequest(req);
    const flags = await evaluateAll(context);

    const evaluatedAt = new Date().toISOString();
    res.setHeader('Cache-Control', `private, max-age=${env.FLAG_CACHE_L2_TTL_SECONDS}`);

    res.json({
      success: true,
      data: {
        flags,
        context: {
          anonymous: !context.userId,
          userId: context.userId ?? null,
          clinicId: context.clinicId ?? null,
          region: context.region ?? null,
        },
        evaluatedAt,
        ttlSeconds: env.FLAG_CACHE_L2_TTL_SECONDS,
      },
      meta: {
        requestId: req.requestId ?? 'unknown',
        // Compute a coarse duration; precise tracing comes from
        // Sentry spans in production.
        durationMs: 0,
      },
    });
  } catch (err) {
    next(err);
  }
});
