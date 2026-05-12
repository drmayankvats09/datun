// ═══════════════════════════════════════════════════════════════
// SHARED JUDGE TYPES — Task #44
//
// LLM-as-judge auto-grading: types shared between FE (admin dashboards)
// and BE (judge service, worker cron).
//
// Validated against research:
//   - Croxford et al. 2025 (medRxiv) — clinical LLM-as-judge ICC 0.818
//   - Anthropic Constitutional AI (2022) — RLAIF judge architecture
//
// @see packages/db/prisma/schema.prisma — JudgeRun model
// ═══════════════════════════════════════════════════════════════

import type { QualityScore } from './training.js';

// ─── Judge run status (mirrors Prisma enum) ────────────────────

export type JudgeRunStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

// ─── Judge configuration ───────────────────────────────────────

export interface JudgeConfig {
  /** Exact model string — versioned. */
  readonly model: string; // e.g., "claude-haiku-4-5-20251001"
  readonly promptVersion: string; // semver of judge prompt template
  readonly rubricVersion: string; // semver of 1-5 scoring rubric
  /** Max tokens to allow in judge response. */
  readonly maxOutputTokens: number;
  /** Temperature — 0 for deterministic judging. */
  readonly temperature: number;
}

// ─── Judge run result ──────────────────────────────────────────

export interface JudgeRunResult {
  readonly judgeRunId: string;
  readonly consultationMessageId: string;
  readonly parsedScore: QualityScore;
  readonly rawScore: number; // pre-clamp model output (e.g., 4.7)
  readonly reasoning: string;
  readonly flags: JudgeFlags;
  readonly costUsd: number;
  readonly latencyMs: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly completedAt: string; // ISO
}

export interface JudgeFlags {
  /** True if judge score differs from human label by ≥2 points. */
  readonly disagreesWithHuman?: boolean;
  /** True if judge expressed low confidence in own scoring. */
  readonly lowConfidence?: boolean;
  /** True if response contained safety-relevant content (med dosage, etc.). */
  readonly safetyRelevant?: boolean;
  /** True if judge refused to score (out-of-scope, missing context, etc.). */
  readonly refused?: boolean;
}

// ─── Judge-vs-Human agreement ──────────────────────────────────

export interface JudgeHumanAgreement {
  /** Total labeled-by-both pairs. */
  readonly totalPairs: number;
  /** Cohen's Kappa coefficient — 0 (chance) to 1 (perfect). */
  readonly cohensKappa: number;
  /** Simple agreement ratio — pairs with same score / totalPairs. */
  readonly simpleAgreement: number;
  /** Average absolute difference in score. */
  readonly meanAbsoluteDelta: number;
  /** Date range computed over. */
  readonly rangeStart: string; // ISO
  readonly rangeEnd: string; // ISO
}

// ─── Judge calibration drift (Month 6+ feature, types ready now) ──

export interface JudgeCalibrationSnapshot {
  readonly snapshotId: string;
  readonly takenAt: string;
  readonly judgeModel: string;
  readonly judgePromptVersion: string;
  readonly humanReferenceCount: number; // # of human-labeled records
  readonly agreementMetrics: JudgeHumanAgreement;
  /** True if calibration has drifted significantly from last snapshot. */
  readonly driftDetected: boolean;
  readonly driftSignificanceP: number | null; // p-value if drift test ran
}
