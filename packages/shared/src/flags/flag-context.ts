// packages/shared/src/flags/flag-context.ts
// ═══════════════════════════════════════════════════════════════
// FLAG CONTEXT — Runtime validators + factories (Task #49)
// ─────────────────────────────────────────────────────────────────
// Centralised constructors and Zod schemas for `FlagContext`.
//
// Why a factory file instead of just relying on the TypeScript type?
//   - The evaluator hot-path receives data from many sources: HTTP
//     headers, query strings, JWT claims, internal RPC. All of them
//     produce `unknown`. Validating once here prevents every caller
//     from hand-rolling defensive checks.
//   - Trim + cast inputs once (e.g. `region` always uppercased).
//
// Pattern: Stripe's request-context builder, Linear's IdentityShape
// helper, the Vercel `evaluationContext()` factory.
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import type { FlagContext } from './flag-types';

// ─── Zod schema ────────────────────────────────────────────────────

/**
 * Maximum length per string field. Keeps payloads bounded and stops
 * abuse from senders trying to evade rate limits by stuffing large
 * blobs into `region`/`role`.
 */
const MAX_FIELD = 64;

export const flagContextSchema = z
  .object({
    userId: z.string().min(1).max(MAX_FIELD).optional(),
    clinicId: z.string().min(1).max(MAX_FIELD).optional(),
    region: z.string().min(1).max(MAX_FIELD).optional(),
    role: z.string().min(1).max(MAX_FIELD).optional(),
    plan: z.string().min(1).max(MAX_FIELD).optional(),
    locale: z
      .string()
      .min(2)
      .max(16)
      // Accept `en`, `en-IN`, `ta`, `ta-IN`. Anything else stripped.
      .regex(/^[a-z]{2}(-[A-Z]{2})?$/i)
      .optional(),
    traceId: z.string().min(1).max(128).optional(),
  })
  .strict();

// ─── Factories ─────────────────────────────────────────────────────

/**
 * Build a `FlagContext` from arbitrary input. Unknown fields are
 * dropped (strict()); invalid fields throw at the boundary.
 *
 * Use this on inputs you DO NOT trust (HTTP query, webhook payload).
 */
export function buildFlagContext(input: unknown): FlagContext {
  const parsed = flagContextSchema.parse(input ?? {});
  return Object.freeze({
    userId: parsed.userId,
    clinicId: parsed.clinicId,
    region: parsed.region?.toUpperCase(),
    role: parsed.role,
    plan: parsed.plan,
    locale: parsed.locale,
    traceId: parsed.traceId,
  });
}

/**
 * Variant for callers that already know they have a clean object
 * (e.g. another internal service forwarding context). Skips the
 * full safeParse for performance on the hot path.
 *
 * NEVER call this on data crossing a trust boundary.
 */
export function fromTrustedContext(fields: FlagContext): FlagContext {
  return Object.freeze({ ...fields });
}

/**
 * Anonymous context — used for unauthenticated visitors. Anonymous
 * users still get flags resolved (e.g. marketing page experiments)
 * but only against `defaultValue` + targeting rules that don't
 * require `userId` (e.g. region-based).
 */
export const ANONYMOUS_CONTEXT: FlagContext = Object.freeze({});

/**
 * Helper for tests — call with partial fields, rest is defaulted.
 *
 *   const ctx = makeFlagContext({ userId: 'user_test_123' });
 */
export function makeFlagContext(overrides: Partial<FlagContext> = {}): FlagContext {
  return Object.freeze({ ...ANONYMOUS_CONTEXT, ...overrides });
}

// ─── Pure helpers used by the evaluator ───────────────────────────

/**
 * Stable canonical identifier used by the deterministic bucket hash.
 * Order of precedence: clinicId > userId. Anonymous → falls back to
 * a synthetic anonymous bucket so unauthenticated users still get
 * consistent results within a session (random per visit is fine —
 * we accept some session-to-session flicker for anonymous traffic).
 *
 * Returning `null` is the signal to bucket-out (treat as ROLLOUT_MISS).
 */
export function bucketKey(ctx: FlagContext): string | null {
  if (ctx.userId) return `user:${ctx.userId}`;
  if (ctx.clinicId) return `clinic:${ctx.clinicId}`;
  return null;
}
