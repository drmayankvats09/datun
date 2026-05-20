// apps/api/src/services/flag/flag-bucket.ts
// ═══════════════════════════════════════════════════════════════
// FLAG BUCKET — Deterministic hash for percentage rollouts (Task #49)
// ─────────────────────────────────────────────────────────────────
// Implements the "same user gets the same answer forever" guarantee
// that production rollouts depend on. Without determinism, a user
// would flip between treatment and control on every page navigation
// (called "flag flicker") — terrible UX and analytical poison.
//
// Algorithm: 32-bit FNV-1a.
//   - Industry-standard non-cryptographic hash. Used by LaunchDarkly,
//     Unleash, GrowthBook for the same bucketing problem.
//   - Properties we need:
//       * Uniform distribution across [0, 100) for ~any input.
//       * Deterministic — pure function of input bytes.
//       * Fast — single allocation, two ops per byte, < 1µs even on
//         long inputs.
//       * Stable across V8/Node versions — no JIT-specific ops.
//   - Cryptographic hashes (SHA-256, BLAKE2) are overkill and ~50×
//     slower. We do not need attacker resistance here — the bucket
//     output is non-secret and changing it would only mean a one-time
//     reshuffle of who-sees-what at flag birth.
//
// Salt strategy:
//   The composite input is `${flagKey}:${entityKey}`. Each flag thus
//   gets its own pseudo-random shuffle. A user can be in the 5% for
//   `clinic.dashboard-v2` and in the 95% for `experiment.pricing-v3`
//   without correlation.
//
// Reference:
//   - FNV authors: http://www.isthe.com/chongo/tech/comp/fnv/
//   - LaunchDarkly: https://docs.launchdarkly.com/sdk/concepts/flag-evaluation-rules#percentage-rollouts
// ═══════════════════════════════════════════════════════════════

import type { FlagContext } from '@repo/shared';
import { bucketKey } from '@repo/shared';

// FNV-1a 32-bit constants.
// Offset basis and prime are fixed parts of the spec — do not change.
const FNV_OFFSET_BASIS_32 = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;

/**
 * 32-bit FNV-1a over UTF-8 bytes of `input`. Returns a non-negative
 * 32-bit unsigned integer.
 *
 * Implementation notes:
 *   - We iterate the string as UTF-16 code units (charCodeAt) for
 *     speed; for ASCII keys this is identical to bytewise FNV. Since
 *     all our flag keys and IDs are ASCII (kebab-case + cuids), this
 *     is correct and deterministic. NON-ASCII inputs would diverge
 *     slightly from the spec, which we accept — we never bucket on
 *     user-controlled non-ASCII fields.
 *   - `Math.imul` performs proper 32-bit multiplication; using raw
 *     `*` would overflow into Number precision and bucket unevenly.
 */
function fnv1a32(input: string): number {
  let hash = FNV_OFFSET_BASIS_32;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME_32);
  }
  // Force unsigned 32-bit.
  return hash >>> 0;
}

/**
 * Compute a deterministic bucket number in [0, 100) for the
 * `(flagKey, context)` pair. Returns `null` when no stable identity
 * is available (anonymous + no clinic context) — the caller treats
 * `null` as "bucket out" (defensive default).
 */
export function computeBucket(flagKey: string, context: FlagContext): number | null {
  const entity = bucketKey(context);
  if (!entity) return null;
  const composite = `${flagKey}:${entity}`;
  const hash = fnv1a32(composite);
  return hash % 100;
}

/**
 * Convenience helper: returns true when the (flag, user) pair is
 * inside the rollout percentage.
 *
 * Edge cases:
 *   - `rolloutPercent <= 0` → always false (no users in).
 *   - `rolloutPercent >= 100` → always true.
 *   - Anonymous user → falls back to `false` (cannot deterministically
 *     bucket). Use targeting rules instead for anonymous traffic.
 */
export function isInRollout(
  flagKey: string,
  context: FlagContext,
  rolloutPercent: number,
): boolean {
  if (rolloutPercent <= 0) return false;
  if (rolloutPercent >= 100) return true;
  const bucket = computeBucket(flagKey, context);
  if (bucket === null) return false;
  return bucket < rolloutPercent;
}

/**
 * Exported for tests + audit logging. Returns the raw 32-bit hash
 * before the `% 100` reduction — useful when verifying that two
 * implementations produce the same bucket for the same inputs.
 */
export function rawBucketHash(flagKey: string, entityKey: string): number {
  return fnv1a32(`${flagKey}:${entityKey}`);
}
