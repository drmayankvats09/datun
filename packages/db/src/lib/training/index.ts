// ═══════════════════════════════════════════════════════════════
// @repo/db/lib/training — Public barrel for training pipeline helpers
//
// Consumed by:
//   - apps/api/src/services/training/*       (Phase 2 — capture, labeling, judge)
//   - apps/worker/src/processors/*           (Phase 2 — judge-grading cron)
//   - packages/db/src/__tests__/training/*   (Phase 4 — property tests)
//
// Public surface — anything not re-exported here is internal-only.
// ═══════════════════════════════════════════════════════════════

// ── Runtime PII redaction ──
export {
  redactMessageContent,
  redactMessageContentBatch,
  detectRedactionLeak,
  REDACTION_VERSION,
  type RedactionLocale,
  type RedactionResult,
} from './redaction.js';

// ── Eligibility gate ──
export {
  isEligibleForTraining,
  eligibilityInputFromConsultation,
  type EligibilityBlocker,
  type EligibilityResult,
  type EligibilityInput,
} from './eligibility.js';

// ── Dataset content hashing ──
export {
  hashDataset,
  hashRecord,
  verifyDatasetHash,
  parseHash,
  HASHING_VERSION,
  HASH_DIGEST_LENGTH,
  type HashableRecord,
  type HashResult,
} from './content-hash.js';

// ── Uncertainty estimation (active learning) ──
export {
  computeUncertainty,
  type UncertaintyInput,
  type UncertaintyResult,
  type UncertaintyBand,
} from './uncertainty.js';
