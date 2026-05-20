// apps/api/src/middleware/flags.middleware.ts
// ═══════════════════════════════════════════════════════════════
// FLAGS MIDDLEWARE — Per-request flag map attach (Task #49)
// ─────────────────────────────────────────────────────────────────
// Populates `req.featureFlags` with the full evaluated flag map for
// the current request identity. Mounted GLOBALLY in `app.ts` after
// `requestIdMiddleware` and BEFORE `mountRoutes`, so every handler
// can read `req.featureFlags['<key>']` without setup.
//
// Identity resolution (order of precedence):
//   1. `req.auth` (set by `requireAuth` if it already ran)
//   2. Anonymous context (no user id; falls back to default rollout
//      behaviour for percentage-bucketed flags)
//
// Because the global mount runs BEFORE `requireAuth`, the initial
// attach uses anonymous context. Routes that need user-aware flags
// AFTER auth should call `refreshFeatureFlags(req)` once at the top
// of the handler — this is documented in Phase D's architecture doc.
//
// Failure mode (never throw):
//   The evaluator itself never throws (Phase A guarantee), but the
//   middleware still wraps the call in a try/catch as defence-in-
//   depth. If something does throw (e.g. an unexpected Prisma error
//   reaching the evaluator), the request continues with the default
//   flag map. The error is logged so we never go blind.
//
// Performance:
//   With a warm L1 cache, one `evaluateAll()` call resolves ~30
//   flags in ≤200µs. That is a negligible request-time cost. Cold
//   cache (boot): one DB SELECT per flag → ~30 selects → ~50ms.
//   The L1 then sticks for the configured TTL (default 30s) — so
//   only the first 30 requests-after-boot pay the cold price.
//
// Reference patterns:
//   - Vercel `flag()` SDK SSR middleware
//   - LaunchDarkly Edge SDK request-scoped boot
//   - Stripe internal `enrichRequestWithFlags` middleware
// ═══════════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import { fromTrustedContext, makeFlagContext } from '@repo/shared';
import type { FlagContext } from '@repo/shared';
import { evaluateAll, getDefaultFlagMap } from '../services/flag/index.js';
import { logger } from '../lib/logger.js';

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Build a `FlagContext` from whatever identity bits are already on
 * the request. Safe to call with a fully-anonymous request — every
 * field falls through to `undefined`.
 *
 * Region: pulled from Cloudflare's `cf-ipcountry` header if present
 * (set by Cloudflare proxy at the edge). Uppercased for parity with
 * the flag-context Zod schema (region is canonicalised in shared).
 */
function buildContextFromRequest(req: Request): FlagContext {
  const cfCountry = req.headers['cf-ipcountry'];
  const region = typeof cfCountry === 'string' && cfCountry !== 'XX' ? cfCountry : undefined;

  return makeFlagContext({
    userId: req.auth?.sub,
    role: req.auth?.role,
    region,
    traceId: req.requestId,
  });
}

// ─── Global middleware ───────────────────────────────────────────

/**
 * Attach `req.featureFlags` with anonymous-or-best-effort context.
 * Never throws. Mounted globally in `app.ts`.
 */
export async function flagsMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const context = buildContextFromRequest(req);
    req.featureFlags = await evaluateAll(context);
  } catch (err) {
    logger.warn('[flags-middleware] evaluation failed, falling back to defaults', {
      requestId: req.requestId,
      error: (err as Error).message,
    });
    req.featureFlags = getDefaultFlagMap();
  }
  next();
}

// ─── Authenticated refresh helper ────────────────────────────────

/**
 * Re-evaluate flags AFTER `requireAuth` has populated `req.auth`.
 * Call from authenticated route handlers that want personalised
 * results (rollout bucket, targeted rules). Side-effect: replaces
 * `req.featureFlags`.
 *
 * Cheap: hits the L1 cache for unchanged flags.
 */
export async function refreshFeatureFlags(req: Request): Promise<void> {
  try {
    const context = buildContextFromRequest(req);
    req.featureFlags = await evaluateAll(context);
  } catch (err) {
    logger.warn('[flags-middleware] refresh failed, keeping prior map', {
      requestId: req.requestId,
      error: (err as Error).message,
    });
    if (!req.featureFlags) {
      req.featureFlags = getDefaultFlagMap();
    }
  }
}

/**
 * Read a single flag from the request map with default fallback.
 * Use this in route handlers instead of `req.featureFlags!['key']`
 * to avoid optional-chain noise + guarantee a boolean answer.
 */
export function readFlag(req: Request, key: string): boolean {
  const map = req.featureFlags ?? getDefaultFlagMap();
  return Boolean(map[key]);
}

/**
 * Build a `FlagContext` from the request — exported for the public
 * `/api/flags` route handler so it can call `evaluateAll(context)`
 * directly without rebuilding the context.
 */
export function flagContextFromRequest(req: Request): FlagContext {
  return fromTrustedContext(buildContextFromRequest(req));
}
