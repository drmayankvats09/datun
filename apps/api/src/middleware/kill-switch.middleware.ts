// apps/api/src/middleware/kill-switch.middleware.ts
// ═══════════════════════════════════════════════════════════════
// KILL-SWITCH MIDDLEWARE — Flag-gated 503 (Task #49)
// ─────────────────────────────────────────────────────────────────
// Decorates a route handler with a flag check. When the named
// kill-switch flag is ON, the request short-circuits to HTTP 503
// `KILL_SWITCH_ACTIVE` without executing the handler.
//
// Use cases:
//   - `requireFlagOff(FLAG_KEYS.KILLSWITCH_AI_PROVIDERS)` on
//     `/api/chat` so the chat endpoint stops calling Anthropic
//     while ops investigate a model regression.
//   - `requireFlagOff(FLAG_KEYS.KILLSWITCH_PAYMENTS)` on the
//     subscription routes during a Razorpay outage.
//   - `requireFlagOff(FLAG_KEYS.KILLSWITCH_SIGNUP)` to stop new
//     accounts during a credential-stuffing incident.
//
// Why this exists when `req.featureFlags` is already on the
// request:
//   - Centralises the 503 contract (one place sets Retry-After,
//     emits the audit log line, tags Sentry).
//   - Communicates intent at the route declaration — readers see
//     `requireFlagOff(KILLSWITCH_X)` in the router file and instantly
//     understand the kill-switch surface.
//   - Future capability: dynamic Retry-After from the flag row's
//     `metadata.retryAfterSeconds` (deferred to Phase C admin UI).
//
// Reference patterns:
//   - Stripe's `kill_switch` annotation (post-mortem 2017).
//   - GitHub's "service status" middleware.
//   - LaunchDarkly's `wrapHandler` ergonomic helper.
// ═══════════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import type { FlagKey } from '@repo/shared';
import { AppError } from '../errors/index.js';
import { logger } from '../lib/logger.js';
import { readFlag } from './flags.middleware.js';

const DEFAULT_RETRY_AFTER_SECONDS = 60;

/** Status code returned when a kill switch is active. */
const KILL_SWITCH_STATUS = 503;
const KILL_SWITCH_CODE = 'KILL_SWITCH_ACTIVE';

interface KillSwitchOptions {
  /** Retry-After header value in seconds. Default 60. */
  readonly retryAfterSeconds?: number;
  /** Human-readable message returned in the JSON body. */
  readonly message?: string;
}

/**
 * Returns an Express middleware that 503's the request when the
 * named kill-switch flag is ON. The middleware reads from
 * `req.featureFlags` (populated by `flagsMiddleware`) — there is
 * no DB call on the hot path.
 *
 * Best-practice usage:
 *   router.post(
 *     '/payments/charge',
 *     requireFlagOff(FLAG_KEYS.KILLSWITCH_PAYMENTS),
 *     handler,
 *   );
 */
export function requireFlagOff(flagKey: FlagKey, options: KillSwitchOptions = {}) {
  const retryAfter = options.retryAfterSeconds ?? DEFAULT_RETRY_AFTER_SECONDS;
  const message =
    options.message ?? 'Service temporarily unavailable due to incident response. Please retry.';

  return (req: Request, res: Response, next: NextFunction): void => {
    const active = readFlag(req, flagKey);
    if (!active) {
      next();
      return;
    }

    // Set Retry-After per RFC 7231 §7.1.3 — clients (browsers, mobile
    // apps, retry-aware fetch wrappers) honour this and back off.
    res.setHeader('Retry-After', String(retryAfter));

    logger.warn('[kill-switch] request blocked', {
      flagKey,
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
    });

    // Throw an AppError so the global error handler emits the
    // canonical `{ success: false, error: { code, message } }` shape.
    next(new AppError(message, KILL_SWITCH_STATUS, KILL_SWITCH_CODE));
  };
}

/**
 * Symmetric helper for the opposite case: require a feature flag to
 * be ON before letting the request through. Used for staged rollouts
 * of new endpoints (e.g. the new clinic dashboard API).
 *
 * Status: 404 (not 403) — when a feature does not exist yet for the
 * caller, advertising "you don't have access" is information leak.
 */
export function requireFlagOn(flagKey: FlagKey, options: { message?: string } = {}) {
  const message = options.message ?? 'Resource not found';

  return (req: Request, _res: Response, next: NextFunction): void => {
    const on = readFlag(req, flagKey);
    if (on) {
      next();
      return;
    }
    next(new AppError(message, 404, 'NOT_FOUND'));
  };
}
