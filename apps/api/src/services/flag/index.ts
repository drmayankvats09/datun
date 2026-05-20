// apps/api/src/services/flag/index.ts
// ═══════════════════════════════════════════════════════════════
// FLAG SERVICE — Public surface (Task #49)
// ─────────────────────────────────────────────────────────────────
// Phase B/C/D consumers import from here only. The internal layout
// (evaluator, cache, defaults, bucket, sync, pubsub) is private to
// this module — refactors stay local.
// ═══════════════════════════════════════════════════════════════

// ── Hot path: evaluation ──────────────────────────────────────────
export { evaluate, evaluateAll, __providerName } from './flag-evaluator.service.js';
export type { EvaluateOptions } from './flag-evaluator.service.js';

// ── Cache plumbing (used by admin "preview" + flush routes) ──────
export { flagCacheService } from './flag-cache.service.js';
export { l1Cache, FlagL1Cache } from './flag-cache-l1.service.js';

// ── Defaults + deterministic bucketing ───────────────────────────
export { FLAG_DEFAULTS, getFlagDefault, getDefaultFlagMap } from './flag-defaults.js';
export { computeBucket, isInRollout, rawBucketHash } from './flag-bucket.js';

// ── Lifecycle: sync worker + pub/sub broadcaster ─────────────────
export {
  startFlagSync,
  stopFlagSync,
  runOnce as runFlagSyncOnce,
  getSyncStatus as getFlagSyncStatus,
} from './flag-sync.service.js';
export {
  initFlagPubsub,
  publishFlagInvalidation,
  shutdownFlagPubsub,
  FLAG_INVALIDATE_CHANNEL,
} from './flag-pubsub.service.js';
