// packages/shared/src/flags/flag-types.ts
// ═══════════════════════════════════════════════════════════════
// FEATURE FLAG — Shared Types (Task #49)
// ─────────────────────────────────────────────────────────────────
// These types describe the WIRE FORMAT for flags. Both `apps/api`
// and `apps/web` import from here — there is no separate copy on
// either side. Schema drift between frontend and backend is the
// single largest source of regression in microservice systems
// (see Stripe's 2019 internal post-mortem). One file, two consumers.
//
// IMPORTANT: These types must stay in lock-step with the Prisma
// `FeatureFlag` model + enums in `packages/db/prisma/schema.prisma`.
// The migration adds the DB shape; THIS file projects the same
// shape over the wire (lowercase camelCase, no Prisma-specific bits
// like `_count` selectors).
//
// Reference:
//   - OpenFeature spec evaluation result types
//   - LaunchDarkly REST API v2 flag schema
//   - Vercel `flag()` SDK runtime types
// ═══════════════════════════════════════════════════════════════

import type { FlagKey } from './flag-keys';

// ─── Enum mirrors (intentionally string-literal unions, not enums) ─
// String-literal unions tree-shake to zero bytes — TS enums leak as
// runtime objects. Pattern: Linear, Stripe, Vercel internal code.

export type FlagCategory =
  | 'RELEASE'
  | 'EXPERIMENT'
  | 'OPERATIONAL'
  | 'PERMISSION'
  | 'KILL_SWITCH'
  | 'BETA';

export type FlagStatus =
  /** Hard-off for every caller. Bypass cache. Used for emergencies. */
  | 'OFF'
  /** Hard-on for every caller. */
  | 'ON'
  /** Deterministic per-user bucketing against `rolloutPercent`. */
  | 'ROLLOUT_BUCKET'
  /** Match if context satisfies `targetingRules`. */
  | 'TARGETED';

export type FlagOverrideEntity = 'USER' | 'CLINIC' | 'REGION' | 'ROLE';

/**
 * Reasons emitted by the evaluator. They are **stable strings** —
 * dashboards and audit reports key off them. Never rename without
 * a deprecation cycle.
 */
export type FlagEvaluationReason =
  | 'DEFAULT' //  Flag missing in DB → safe default returned
  | 'STATIC_ON' //  Hard-coded ON (rare — boot-time flags)
  | 'STATIC_OFF' //  Hard-coded OFF
  | 'ROLLOUT_HIT' //  Bucketed in, status=ROLLOUT_BUCKET
  | 'ROLLOUT_MISS' //  Bucketed out, status=ROLLOUT_BUCKET
  | 'TARGETED_HIT' //  Matched targetingRules
  | 'TARGETED_MISS' //  Did not match targetingRules
  | 'OVERRIDE' //  feature_flag_overrides row hit
  | 'KILLSWITCH' //  Flag is category=KILL_SWITCH and status=ON
  | 'ARCHIVED' //  Flag soft-deleted; returning default
  | 'FALLBACK'; //  Read failed; emergency default returned

// ─── Targeting rules (Json column projected as a discriminated union) ──

/**
 * One leaf rule. Attribute names match `FlagContext` field names
 * exactly so the evaluator can do `context[rule.attribute]`.
 */
export interface FlagTargetingRule {
  readonly attribute: 'userId' | 'clinicId' | 'region' | 'role' | 'plan' | 'locale';
  readonly op: 'in' | 'not_in' | 'eq' | 'neq';
  readonly values: readonly string[];
}

/**
 * The shape stored in `feature_flags.targetingRules` JSON column.
 *
 * `combinator`: 'AND' → every rule must match (most common case).
 * `combinator`: 'OR'  → any rule matches.
 *
 * Empty rules → status=TARGETED collapses to false (safe default).
 */
export interface FlagTargetingSpec {
  readonly combinator: 'AND' | 'OR';
  readonly rules: readonly FlagTargetingRule[];
}

// ─── Evaluation context ────────────────────────────────────────────

/**
 * Inputs supplied to `flagEvaluator.evaluate(key, context)`.
 * Every field is optional — anonymous evaluations are valid (and
 * common on the marketing site before login).
 *
 * Anonymous flags fall back to defaults / public matrix.
 */
export interface FlagContext {
  readonly userId?: string;
  readonly clinicId?: string;
  readonly region?: string;
  readonly role?: string;
  readonly plan?: string;
  readonly locale?: string;
  /**
   * Server-side correlation id — included in evaluation audit rows
   * (when sampled). Helps trace `"why did user X see treatment?"`
   * across services.
   */
  readonly traceId?: string;
}

// ─── Evaluation result ─────────────────────────────────────────────

/**
 * Wire shape returned by `GET /api/flags` for **internal** callers
 * (admin tools, debugging UIs, server-side renderers).
 *
 * Public flag map served to the browser is a simpler
 * `Record<FlagKey, boolean>` to keep payloads small.
 */
export interface FlagEvaluation {
  readonly key: FlagKey;
  readonly value: boolean;
  /** Variant key when flag has multi-variants; null for booleans. */
  readonly variantKey: string | null;
  readonly reason: FlagEvaluationReason;
  /** Deterministic bucket (0–99) for ROLLOUT flags; null otherwise. */
  readonly bucketHash: number | null;
  /** Server clock at evaluation; useful for cache-age debugging. */
  readonly evaluatedAt: string; // ISO-8601
}

/**
 * Compact map for the browser. Falls back to `false` for missing
 * keys (consumer never sees `undefined`).
 */
export type FlagMap = Readonly<Record<string, boolean>>;

// ─── Admin / CRUD DTOs (used by the admin router) ──────────────────

/**
 * Wire-format flag record returned by admin endpoints. Mirrors the
 * Prisma row 1:1 but with ISO date strings (not Date objects) and
 * `BigInt` evaluationCount widened to string (so JSON.stringify works
 * without `BigInt.prototype.toJSON` polyfills).
 */
export interface FeatureFlagDTO {
  readonly id: string;
  readonly flagKey: FlagKey;
  readonly name: string;
  readonly description: string;
  readonly category: FlagCategory;
  readonly status: FlagStatus;
  readonly defaultValue: boolean;
  readonly rolloutPercent: number;
  readonly targetingRules: FlagTargetingSpec;
  readonly variants: Record<string, boolean>;
  readonly enabledClinicIds: readonly string[];
  readonly disabledClinicIds: readonly string[];
  /** BigInt serialised as decimal string (>= "0"). */
  readonly evaluationCount: string;
  readonly lastEvaluatedAt: string | null;
  readonly staleAt: string | null;
  readonly createdByUserId: string;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FeatureFlagOverrideDTO {
  readonly id: string;
  readonly flagId: string;
  readonly entityType: FlagOverrideEntity;
  readonly entityId: string;
  readonly value: boolean;
  readonly reason: string | null;
  readonly createdByUserId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt: string | null;
}

// ─── Create / update payloads ─────────────────────────────────────

/** POST /api/admin/flags */
export interface CreateFlagPayload {
  readonly flagKey: FlagKey;
  readonly name: string;
  readonly description: string;
  readonly category: FlagCategory;
  readonly status?: FlagStatus;
  readonly defaultValue?: boolean;
  readonly rolloutPercent?: number;
  readonly targetingRules?: FlagTargetingSpec;
  readonly variants?: Record<string, boolean>;
  readonly enabledClinicIds?: readonly string[];
  readonly disabledClinicIds?: readonly string[];
  readonly staleAt?: string;
}

/** PATCH /api/admin/flags/:key */
export interface UpdateFlagPayload {
  readonly name?: string;
  readonly description?: string;
  readonly status?: FlagStatus;
  readonly rolloutPercent?: number;
  readonly targetingRules?: FlagTargetingSpec;
  readonly variants?: Record<string, boolean>;
  readonly enabledClinicIds?: readonly string[];
  readonly disabledClinicIds?: readonly string[];
  readonly staleAt?: string | null;
}

/** POST /api/admin/flags/:key/kill */
export interface KillSwitchPayload {
  readonly reason: string;
  /** Optional Sentry incident id for cross-system correlation. */
  readonly incidentId?: string;
}

/** Returned by every mutation endpoint for client-side cache invalidation. */
export interface FlagMutationResult {
  readonly flag: FeatureFlagDTO;
  readonly version: number;
}
