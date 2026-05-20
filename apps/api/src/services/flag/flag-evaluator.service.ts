// apps/api/src/services/flag/flag-evaluator.service.ts
// ═══════════════════════════════════════════════════════════════
// FLAG EVALUATOR — Decision engine (Task #49)
// ─────────────────────────────────────────────────────────────────
// Single entry point used by:
//   - `/api/flags` route handler (per-user flag map response)
//   - `kill-switch` middleware (Phase B)
//   - `<FeatureGate>` SSR helper (Phase C)
//   - server-side feature checks inside route handlers
//
// Decision flow (top to bottom; first match wins):
//
//   1. Unknown key?                                 → DEFAULT
//   2. Global kill (FEATURE_FLAGS_ENABLED=false)?   → DEFAULT
//   3. L1+L2 cache hit?                             → cached evaluation
//   4. DB miss / archived?                          → DEFAULT / ARCHIVED
//   5. Override row hit?                            → OVERRIDE
//   6. Clinic enable/disable list hit?              → TARGETED_HIT/MISS
//   7. status=OFF?                                  → STATIC_OFF
//      status=ON?                                   → STATIC_ON or KILLSWITCH
//      status=ROLLOUT_BUCKET?                       → ROLLOUT_HIT / ROLLOUT_MISS
//      status=TARGETED?                             → TARGETED_HIT / TARGETED_MISS
//   8. Persist to cache + sampled audit             → return
//
// Determinism: identical (flagKey, context) inputs MUST produce
// identical outputs across requests, processes and time (within a
// flag's stable config window). The L1/L2 cache lifetime is the
// only permitted source of drift — by design, capped at
// FLAG_CACHE_L2_TTL_SECONDS.
//
// Reference patterns:
//   - LaunchDarkly `evaluate()` flow (server SDK).
//   - PostHog `decide` endpoint algorithm (open-source posthog-py).
//   - Unleash strategy chain (Edge Worker docs).
// ═══════════════════════════════════════════════════════════════

import { randomInt } from 'node:crypto';
import { prisma } from '@repo/db';
import type {
  FlagContext,
  FlagEvaluation,
  FlagEvaluationReason,
  FlagKey,
  FlagOverrideEntity,
  FlagTargetingRule,
  FlagTargetingSpec,
} from '@repo/shared';
import { ALL_FLAG_KEYS, bucketKey, isKnownFlagKey } from '@repo/shared';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { getProvider } from '../../lib/openfeature.js';
import { flagCacheService } from './flag-cache.service.js';
import { getFlagDefault } from './flag-defaults.js';
import { computeBucket } from './flag-bucket.js';

// ─── Local types (DB row shape, not exported) ─────────────────────

interface FlagRow {
  readonly flagKey: string;
  readonly status: 'OFF' | 'ON' | 'ROLLOUT_BUCKET' | 'TARGETED';
  readonly category: string;
  readonly defaultValue: boolean;
  readonly rolloutPercent: number;
  readonly targetingRules: FlagTargetingSpec;
  readonly variants: Record<string, boolean>;
  readonly enabledClinicIds: readonly string[];
  readonly disabledClinicIds: readonly string[];
  readonly archivedAt: Date | null;
}

interface OverrideRow {
  readonly entityType: FlagOverrideEntity;
  readonly value: boolean;
  readonly expiresAt: Date | null;
}

// ─── Public surface ──────────────────────────────────────────────

export interface EvaluateOptions {
  /** Skip the read-through cache (used by the admin "preview" route). */
  readonly bypassCache?: boolean;
}

/**
 * Evaluate a single flag.
 *
 * Never throws — falls back to a defensive default and tags the
 * reason appropriately so callers can surface degraded-mode banners.
 */
export async function evaluate(
  key: FlagKey,
  context: FlagContext,
  options: EvaluateOptions = {},
): Promise<FlagEvaluation> {
  // 1. Reject unknown keys early — protects the cache from poisoning
  //    via misspelled inputs (defense-in-depth; the API layer also
  //    rejects them at the route boundary).
  if (!isKnownFlagKey(key)) {
    return buildResult(key, getFlagDefault(key), 'DEFAULT', null);
  }

  // 2. Global flag-platform kill switch.
  if (!env.FEATURE_FLAGS_ENABLED) {
    return buildResult(key, getFlagDefault(key), 'DEFAULT', null);
  }

  const entity = bucketKey(context);

  // 3. Cache lookup.
  if (!options.bypassCache) {
    const cached = await flagCacheService.get(key, entity);
    if (cached) return cached;
  }

  // 4. DB lookup.
  let row: FlagRow | null = null;
  try {
    // The select shape narrows JsonValue → our domain types. We own
    // the write path (admin route validates via Zod) so the cast is
    // a sound narrowing, not a lying cast (memory rule #24).
    row = (await prisma.featureFlag.findUnique({
      where: { flagKey: key },
      select: {
        flagKey: true,
        status: true,
        category: true,
        defaultValue: true,
        rolloutPercent: true,
        targetingRules: true,
        variants: true,
        enabledClinicIds: true,
        disabledClinicIds: true,
        archivedAt: true,
      },
    })) as FlagRow | null;
  } catch (err) {
    logger.warn('[flag-evaluator] DB lookup failed', {
      flagKey: key,
      error: (err as Error).message,
    });
    // Defensive fall-through — keep going to default below.
  }

  // 5. Archived or absent → defaults.
  if (!row || row.archivedAt) {
    const reason: FlagEvaluationReason = row?.archivedAt ? 'ARCHIVED' : 'DEFAULT';
    const value = row?.defaultValue ?? getFlagDefault(key);
    const result = buildResult(key, value, reason, null);
    await flagCacheService.set(key, entity, result);
    return result;
  }

  // 6. Override row (highest precedence after archive).
  const override = await fetchOverride(row.flagKey, context);
  if (override !== null) {
    const result = buildResult(key, override, 'OVERRIDE', null);
    await flagCacheService.set(key, entity, result);
    sampleAudit(result, context);
    return result;
  }

  // 7. Clinic-specific enable / disable lists.
  if (context.clinicId) {
    if (row.disabledClinicIds.includes(context.clinicId)) {
      const result = buildResult(key, false, 'TARGETED_MISS', null);
      await flagCacheService.set(key, entity, result);
      sampleAudit(result, context);
      return result;
    }
    if (row.enabledClinicIds.includes(context.clinicId)) {
      const result = buildResult(key, true, 'TARGETED_HIT', null);
      await flagCacheService.set(key, entity, result);
      sampleAudit(result, context);
      return result;
    }
  }

  // 8. Status switch.
  let result: FlagEvaluation;
  switch (row.status) {
    case 'OFF':
      result = buildResult(key, false, 'STATIC_OFF', null);
      break;
    case 'ON':
      result = buildResult(
        key,
        true,
        row.category === 'KILL_SWITCH' ? 'KILLSWITCH' : 'STATIC_ON',
        null,
      );
      break;
    case 'ROLLOUT_BUCKET': {
      const bucket = computeBucket(key, context);
      if (bucket === null) {
        result = buildResult(key, false, 'ROLLOUT_MISS', null);
      } else {
        const hit = bucket < row.rolloutPercent;
        result = buildResult(key, hit, hit ? 'ROLLOUT_HIT' : 'ROLLOUT_MISS', bucket);
      }
      break;
    }
    case 'TARGETED': {
      const matched = evaluateTargeting(row.targetingRules, context);
      result = buildResult(key, matched, matched ? 'TARGETED_HIT' : 'TARGETED_MISS', null);
      break;
    }
    default:
      result = buildResult(key, row.defaultValue, 'DEFAULT', null);
  }

  // 9. Persist + audit-sample.
  await flagCacheService.set(key, entity, result);
  sampleAudit(result, context);
  return result;
}

/**
 * Bulk evaluate every known flag for the given context. Used by the
 * `/api/flags` route to seed the browser's flag map in one round trip.
 *
 * Returns a plain `{ [key]: boolean }` object — variants and reasons
 * are stripped so the browser bundle stays small. Admin tools that
 * need full evaluations call `evaluate()` per key instead.
 */
export async function evaluateAll(context: FlagContext): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};

  // Iterate the static registry (not the DB row list). This means:
  //   - Keys present only in the registry → resolve via hard-coded
  //     default (safe — admin hasn't created the row yet).
  //   - Keys present only in DB but missing from the registry → IGNORED
  //     (defense: prevents stale PostHog rows from poisoning clients).
  for (const k of ALL_FLAG_KEYS) {
    const evalResult = await evaluate(k, context);
    out[k] = evalResult.value;
  }
  return out;
}

// ─── Internal helpers ─────────────────────────────────────────────

function buildResult(
  key: string,
  value: boolean,
  reason: FlagEvaluationReason,
  bucketHash: number | null,
): FlagEvaluation {
  return {
    key: key as FlagKey,
    value,
    variantKey: null,
    reason,
    bucketHash,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Fetch a non-expired override row for this flag + context.
 *
 * Returns `null` when:
 *   - context lacks every override-eligible attribute, OR
 *   - the flag does not exist, OR
 *   - no row matches the OR clauses, OR
 *   - every matching row is expired.
 *
 * Precedence ladder when multiple rows match (most → least specific):
 *   USER > CLINIC > ROLE > REGION
 */
async function fetchOverride(flagKey: string, context: FlagContext): Promise<boolean | null> {
  const orClauses: Array<{
    entityType: FlagOverrideEntity;
    entityId: string;
  }> = [];
  if (context.userId) orClauses.push({ entityType: 'USER', entityId: context.userId });
  if (context.clinicId) orClauses.push({ entityType: 'CLINIC', entityId: context.clinicId });
  if (context.role) orClauses.push({ entityType: 'ROLE', entityId: context.role });
  if (context.region) orClauses.push({ entityType: 'REGION', entityId: context.region });
  if (orClauses.length === 0) return null;

  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { flagKey },
      select: { id: true },
    });
    if (!flag) return null;

    // Prisma's `OR` is an array of subqueries combined with the
    // top-level `AND` predicate (`flagId` here). Expiry is filtered
    // in-process below because the result set is tiny (at most 4
    // rows: one per orClause entity).
    const rows = (await prisma.featureFlagOverride.findMany({
      where: {
        flagId: flag.id,
        OR: orClauses,
      },
      select: { entityType: true, value: true, expiresAt: true },
    })) as ReadonlyArray<OverrideRow>;

    const now = Date.now();
    const valid = rows.filter((r) => !r.expiresAt || r.expiresAt.getTime() > now);
    if (valid.length === 0) return null;

    // Precedence: USER > CLINIC > ROLE > REGION.
    const order: ReadonlyArray<FlagOverrideEntity> = ['USER', 'CLINIC', 'ROLE', 'REGION'];
    for (const tier of order) {
      const hit = valid.find((r) => r.entityType === tier);
      if (hit) return hit.value;
    }
    return null;
  } catch (err) {
    logger.warn('[flag-evaluator] override lookup failed', {
      flagKey,
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Evaluate a targeting spec against the context. Empty rule lists
 * collapse to `false` (safe default — admins must explicitly list
 * a matching rule for TARGETED status).
 */
function evaluateTargeting(spec: FlagTargetingSpec, context: FlagContext): boolean {
  if (!spec || !spec.rules || spec.rules.length === 0) return false;

  const ruleResults = spec.rules.map((rule) => evaluateRule(rule, context));
  return spec.combinator === 'OR' ? ruleResults.some(Boolean) : ruleResults.every(Boolean);
}

function evaluateRule(rule: FlagTargetingRule, context: FlagContext): boolean {
  const lhs = (context as unknown as Record<string, string | undefined>)[rule.attribute];
  if (lhs === undefined) {
    // Missing attribute: only the "not present" ops can be true.
    return rule.op === 'not_in' || rule.op === 'neq';
  }
  switch (rule.op) {
    case 'in':
      return rule.values.includes(lhs);
    case 'not_in':
      return !rule.values.includes(lhs);
    case 'eq':
      return rule.values[0] === lhs;
    case 'neq':
      return rule.values[0] !== lhs;
    default:
      return false;
  }
}

/**
 * Sampled audit-log persistence. Probability comes from env so ops
 * can tune at runtime (turn UP for debugging, DOWN at scale).
 *
 * Best-effort — never blocks the caller, never throws.
 */
function sampleAudit(result: FlagEvaluation, context: FlagContext): void {
  const rate = env.FLAG_EVALUATION_AUDIT_SAMPLE_RATE;
  if (rate <= 0) return;
  // randomInt(0, 10_000) ∈ [0, 10000). Compare against rate * 10000
  // to support rates down to 0.0001 (one-in-ten-thousand).
  if (randomInt(0, 10_000) >= rate * 10_000) return;

  // Fire-and-forget; explicitly do NOT await — caller's latency budget
  // must not include this row insert.
  void prisma.featureFlagEvaluation
    .create({
      data: {
        flagKey: result.key,
        userId: context.userId ?? null,
        clinicId: context.clinicId ?? null,
        result: result.value,
        variantKey: result.variantKey,
        reason: result.reason,
        bucketHash: result.bucketHash,
      },
    })
    .catch((err) => {
      logger.warn('[flag-evaluator] audit insert failed', {
        flagKey: result.key,
        error: (err as Error).message,
      });
    });
}

// ─── Provider seam (reserved for future remote-fallback wiring) ───
//
// When a future task integrates a remote provider into the DB-miss
// path, plug the provider call into step 5 above. Keeping the import
// here documents the abstraction seam so the type isn't tree-shaken.
export function __providerName(): string {
  return getProvider().name;
}
