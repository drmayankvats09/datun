// ═══════════════════════════════════════════════════════════════
// SHARED TRAINING TYPES — Task #44
//
// Type-only definitions used by both frontend and backend.
// No runtime code, no Prisma imports → keeps web bundle small.
//
// Importing this file from FE costs ~0 bytes (TypeScript erases types).
// All numeric ranges are branded for compile-time safety.
//
// @see packages/db/prisma/schema.prisma — runtime models
// @see apps/api/src/validators/training.schemas.ts — Zod runtime validation
// ═══════════════════════════════════════════════════════════════

// ─── Branded numeric types (compile-time range safety) ─────────

declare const __qualityScoreBrand: unique symbol;
/**
 * Quality score for AI response — INTEGER 1-5.
 * Compile-time guarantee — values must be created via `makeQualityScore`.
 */
export type QualityScore = number & { readonly [__qualityScoreBrand]: 'QualityScore' };

export function makeQualityScore(n: number): QualityScore {
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    throw new Error(`QualityScore must be integer in [1, 5]. Got: ${n}`);
  }
  return n as QualityScore;
}

declare const __confidenceBrand: unique symbol;
/**
 * Confidence score — FLOAT in [0, 1].
 */
export type Confidence = number & { readonly [__confidenceBrand]: 'Confidence' };

export function makeConfidence(n: number): Confidence {
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new Error(`Confidence must be finite number in [0, 1]. Got: ${n}`);
  }
  return n as Confidence;
}

// ─── Labeler tier (mirrors Prisma enum) ────────────────────────

export type LabelerTier = 'HUMAN_EXPERT' | 'LLM_JUDGE' | 'CROWD';

// ─── Active learning strategies ────────────────────────────────

export type LabelingQueueStrategy =
  | 'typi_clust' // low-data regime default (diversity-first)
  | 'margin' // high-data regime (uncertainty-first via judge score)
  | 'conflicts' // human-vs-judge disagreements (high signal)
  | 'random'; // unbiased control (10% baseline)

// ─── Queue item shape ──────────────────────────────────────────

export interface LabelingQueueItem {
  readonly messageId: string;
  readonly consultationId: string;
  readonly role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  readonly content: string; // raw text (Mayank reads original)
  readonly redactedContent: string | null; // null for legacy rows
  readonly sequenceNumber: number;
  readonly createdAt: string; // ISO datetime
  readonly aiProvider: string | null;
  readonly aiModel: string | null;
  readonly judgeScore: number | null;
  readonly judgeReasoning: string | null;
  readonly existingLabelId: string | null; // if Mayank already labeled, the label UUID
  readonly uncertaintyBand: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  readonly chiefComplaintSnippet: string | null; // first 100 chars for context
}

// ─── Label submission payload ──────────────────────────────────

export interface LabelSubmission {
  readonly messageId: string;
  readonly qualityScore: QualityScore;
  readonly isCorrect: boolean;
  readonly correctionText: string | null;
  readonly clinicalNotes: string | null;
  readonly category: string | null;
}

// ─── Stats payload ─────────────────────────────────────────────

export interface LabelingStatsRange {
  readonly today: number;
  readonly thisWeek: number;
  readonly thisMonth: number;
  readonly allTime: number;
}

export interface LabelingStats {
  readonly counts: LabelingStatsRange;
  readonly dailyTarget: number;
  readonly streakDays: number;
  readonly avgQualityScore: number; // human-given, 1-5
  readonly judgeHumanAgreement: number; // 0-1 (Cohen-style)
  readonly conflictsPending: number; // human-vs-judge mismatches awaiting review
  readonly avgSecondsPerLabel: number;
}

// ─── Label conflict (human vs judge) ───────────────────────────

export interface LabelConflict {
  readonly messageId: string;
  readonly humanScore: QualityScore;
  readonly judgeScore: QualityScore;
  readonly delta: number; // |humanScore - judgeScore|
  readonly judgeReasoning: string;
  readonly humanCorrectionText: string | null;
  readonly resolvedAt: string | null;
}

// ─── Consent payload (DPDP-compliant) ──────────────────────────

export interface DataTrainingConsentPayload {
  readonly consentVersion: string; // e.g., "v1.0.0"
  readonly grantedAt: string; // ISO datetime
  readonly locale: 'hi' | 'en';
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
}

// ─── PII redaction (mirrors lib/training/redaction.ts) ─────────

export type PiiCategoryShared =
  | 'NAME'
  | 'EMAIL'
  | 'PHONE'
  | 'ADDRESS'
  | 'GOVERNMENT_ID'
  | 'IP_ADDRESS'
  | 'PAYMENT_CARD'
  | 'BANK_ACCOUNT'
  | 'OTHER';

export interface RedactedContentPayload {
  readonly text: string;
  readonly piiCategoriesFound: readonly PiiCategoryShared[];
  readonly maskCount: number;
  readonly redactionVersion: string;
}
