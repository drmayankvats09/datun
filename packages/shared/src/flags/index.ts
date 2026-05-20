// packages/shared/src/flags/index.ts
// ═══════════════════════════════════════════════════════════════
// @repo/shared/flags — Public surface (Task #49)
// ─────────────────────────────────────────────────────────────────
// Barrel re-export. Internal layout (3 files: flag-keys, flag-types,
// flag-context) is private to this module. Consumers depend only on
// the symbols re-exported here.
//
// Convention: extension-less imports throughout `packages/shared`
// because the Turbopack/Next.js consumer rejects `.js` suffix on
// shared source. The API consumer compiles via `tsup` which rewrites
// extension on emit, so this works on both sides.
// ═══════════════════════════════════════════════════════════════

export {
  FLAG_KEYS,
  ALL_FLAG_KEYS,
  FLAG_KEY_SET,
  FLAG_KEY_PATTERN,
  isKnownFlagKey,
  isWellFormedFlagKey,
} from './flag-keys';
export type { FlagKey } from './flag-keys';

export type {
  FlagCategory,
  FlagStatus,
  FlagOverrideEntity,
  FlagEvaluationReason,
  FlagTargetingRule,
  FlagTargetingSpec,
  FlagContext,
  FlagEvaluation,
  FlagMap,
  FeatureFlagDTO,
  FeatureFlagOverrideDTO,
  CreateFlagPayload,
  UpdateFlagPayload,
  KillSwitchPayload,
  FlagMutationResult,
} from './flag-types';

export {
  flagContextSchema,
  buildFlagContext,
  fromTrustedContext,
  makeFlagContext,
  ANONYMOUS_CONTEXT,
  bucketKey,
} from './flag-context';
