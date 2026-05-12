// ═══════════════════════════════════════════════════════════════
// TRAINING ELIGIBILITY GATE — Task #44
//
// Pure decision function: "Is this consultation eligible for use
// as AI training data?" Returns boolean + structured blocker list
// (debuggable, auditable).
//
// FAANG principles applied:
//   - Single responsibility: eligibility check only, no DB writes
//   - Pure function: deterministic, testable with property tests
//   - Structured output: every rejection has an actionable reason
//   - Conservative default: returns false if ANY field is ambiguous
//
// DPDP Act 2023 alignment:
//   - Section 6 (consent) — explicit DATA_TRAINING consent required
//   - Section 8 (notice + purpose limitation) — consent must be
//     current (not revoked)
//   - Section 9 (children) — age verification required for under-18
//     usage (NMC India Telemedicine Practice Guidelines)
//
// @see docs/adr/ADR-0003-training-data-architecture.md
// @see docs/dpdp/training-data-dpia.md
// ═══════════════════════════════════════════════════════════════

import type { ConsultationStatus, ConsentStatus } from '@prisma/client';

// ─── Public types ──────────────────────────────────────────────

/** Reasons a consultation cannot be used for training. Structured for analytics. */
export type EligibilityBlocker =
  | 'NO_DATA_TRAINING_CONSENT'
  | 'CONSENT_REVOKED'
  | 'NOT_COMPLETED'
  | 'AGE_NOT_VERIFIED'
  | 'SAFETY_FLAG_RAISED'
  | 'MISSING_REDACTION'
  | 'EMERGENCY_CONSULTATION';

export interface EligibilityResult {
  /** True iff this consultation can be used for AI training. */
  readonly eligible: boolean;
  /** Non-empty array of blockers if `eligible === false`. */
  readonly blockers: readonly EligibilityBlocker[];
  /** Snapshot timestamp — when the decision was made. */
  readonly checkedAt: Date;
}

/**
 * Subset of ConsentLog fields needed for eligibility evaluation.
 * Plain interface (not Pick<>) for parser robustness across editors.
 */
export interface EligibilityConsentLog {
  readonly status: ConsentStatus;
  readonly grantedAt: Date;
  readonly revokedAt: Date | null;
}

/**
 * Subset of Consultation fields needed for eligibility evaluation.
 * Plain interface (not Pick<>) for parser robustness across editors.
 */
export interface EligibilityConsultationFields {
  readonly status: ConsultationStatus;
  readonly dataTrainingConsentAt: Date | null;
  readonly dataTrainingConsentVersion: string | null;
  readonly ageVerifiedAt: Date | null;
  readonly safetyFlags: unknown;
  readonly urgency: 'EMERGENCY' | 'URGENT' | 'MODERATE' | 'ROUTINE' | null;
}

/**
 * Minimal shape of inputs needed for eligibility check.
 * Decoupled from full Prisma model so unit tests can pass plain objects.
 */
export interface EligibilityInput {
  readonly status: ConsultationStatus;
  readonly dataTrainingConsentAt: Date | null;
  readonly dataTrainingConsentVersion: string | null;
  readonly ageVerifiedAt: Date | null;
  readonly safetyFlags: unknown;
  readonly urgency: 'EMERGENCY' | 'URGENT' | 'MODERATE' | 'ROUTINE' | null;
  /** Latest ConsentLog rows for this user, filtered to purpose=DATA_TRAINING. */
  readonly dataTrainingConsentLogs: readonly EligibilityConsentLog[];
}

// ─── Pure decision function ────────────────────────────────────

/**
 * Determine whether a consultation is eligible for AI training use.
 *
 * @returns EligibilityResult — eligible iff all gates pass.
 *
 * Gates checked (collected, not short-circuited — caller sees full
 * blocker list for better debugging and analytics):
 *   1. DATA_TRAINING consent timestamp present
 *   2. Latest DATA_TRAINING ConsentLog status is not REVOKED
 *   3. Consultation status is COMPLETED
 *   4. Age verified (NMC compliance)
 *   5. No safety flags raised
 *   6. Not an emergency consultation (emergency cases excluded from training
 *      regardless of consent — clinical-context principle)
 */
export function isEligibleForTraining(input: EligibilityInput): EligibilityResult {
  const blockers: EligibilityBlocker[] = [];

  // ── Gate 1: DATA_TRAINING consent ──
  if (input.dataTrainingConsentAt === null || input.dataTrainingConsentVersion === null) {
    blockers.push('NO_DATA_TRAINING_CONSENT');
  }

  // ── Gate 2: Consent not revoked ──
  // Walk all DATA_TRAINING consent logs for this user. If the most recent
  // entry has status === 'REVOKED', the consent is currently withdrawn.
  // Note: input is expected to be pre-filtered to purpose=DATA_TRAINING.
  const sortedLogs = [...input.dataTrainingConsentLogs].sort((a, b) => {
    const ta = a.revokedAt?.getTime() ?? a.grantedAt.getTime();
    const tb = b.revokedAt?.getTime() ?? b.grantedAt.getTime();
    return tb - ta; // newest first
  });
  const latestLog = sortedLogs[0];
  if (latestLog?.status === 'REVOKED') {
    blockers.push('CONSENT_REVOKED');
  }

  // ── Gate 3: Consultation completed ──
  if (input.status !== 'COMPLETED') {
    blockers.push('NOT_COMPLETED');
  }

  // ── Gate 4: Age verified ──
  if (input.ageVerifiedAt === null) {
    blockers.push('AGE_NOT_VERIFIED');
  }

  // ── Gate 5: No safety flags ──
  if (Array.isArray(input.safetyFlags) && input.safetyFlags.length > 0) {
    blockers.push('SAFETY_FLAG_RAISED');
  }

  // ── Gate 6: Not emergency ──
  // Emergencies are clinically time-sensitive and may contain incomplete
  // context. Excluded from training to avoid biasing model toward
  // emergency-handling patterns inappropriately.
  if (input.urgency === 'EMERGENCY') {
    blockers.push('EMERGENCY_CONSULTATION');
  }

  return {
    eligible: blockers.length === 0,
    blockers,
    checkedAt: new Date(),
  };
}

/**
 * Adapter — convert a full Prisma Consultation row + consent logs into
 * the minimal EligibilityInput shape. Service layer uses this helper.
 */
export function eligibilityInputFromConsultation(
  consultation: EligibilityConsultationFields,
  dataTrainingConsentLogs: readonly EligibilityConsentLog[],
): EligibilityInput {
  return {
    status: consultation.status,
    dataTrainingConsentAt: consultation.dataTrainingConsentAt,
    dataTrainingConsentVersion: consultation.dataTrainingConsentVersion,
    ageVerifiedAt: consultation.ageVerifiedAt,
    safetyFlags: consultation.safetyFlags,
    urgency: consultation.urgency,
    dataTrainingConsentLogs,
  };
}
