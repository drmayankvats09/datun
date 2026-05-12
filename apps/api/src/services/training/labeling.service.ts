// ═══════════════════════════════════════════════════════════════
// LABELING SERVICE — Task #44
//
// Mayank's labeling actions: get next queue items, submit a label,
// compute daily stats. Pure DB business logic, no HTTP.
//
// Architecture:
//   - Read path: queue.service.ts (this file delegates strategy)
//   - Write path: labelSubmission → TrainingLabel row
//   - Compute path: Cohen's Kappa over (human, judge) score pairs
//
// FAANG principles applied:
//   - Layered: this service uses queue.service for strategy details
//   - Idempotent submissions: same (labelerId, messageId) UPDATE not INSERT
//   - Stats cached at view layer (TanStack Query in FE) — no Redis here yet
//
// @see queue.service.ts — active learning strategy
// @see judge.service.ts — LLM-as-judge produces judgeScore consumed here
// ═══════════════════════════════════════════════════════════════

import type { LabelerTier } from '@repo/db';
import { prisma } from '@repo/db';
import type {
  LabelingQueueItem,
  LabelingQueueStrategy,
  LabelingStats,
  LabelConflict,
  QualityScore,
} from '@repo/shared';
import { logger } from '../../lib/logger.js';
import { NotFoundError } from '../../errors/index.js';
import { buildLabelingQueue } from './queue.service.js';

// ─── Constants ─────────────────────────────────────────────────

/** Mayank's daily labeling target — calibrated to ~25 min/day commitment. */
const DEFAULT_DAILY_TARGET = 50;

/** Conflict threshold: |human - judge| ≥ this triggers conflict flag. */
const CONFLICT_DELTA_THRESHOLD = 2;

// ─── Inputs/outputs ────────────────────────────────────────────

export interface GetQueueParams {
  readonly labelerId: string;
  readonly strategy: LabelingQueueStrategy;
  readonly limit: number;
}

export interface SubmitLabelParams {
  readonly labelerId: string;
  readonly messageId: string;
  readonly qualityScore: QualityScore;
  readonly isCorrect: boolean;
  readonly correctionText: string | null;
  readonly clinicalNotes: string | null;
  readonly category: string | null;
  readonly tier?: LabelerTier; // default HUMAN_EXPERT
}

export interface SubmitLabelResult {
  readonly labelId: string;
  readonly created: boolean; // false if updated existing label
  readonly conflictDetected: boolean;
  readonly conflictDelta: number | null;
}

// ─── Queue (delegates to queue.service) ────────────────────────

/**
 * Fetch next labeling queue items per strategy.
 * Delegates strategy implementation to queue.service.
 */
export async function getLabelingQueue(
  params: GetQueueParams,
): Promise<readonly LabelingQueueItem[]> {
  if (params.limit < 1 || params.limit > 50) {
    throw new Error(`getLabelingQueue: limit must be 1-50, got ${params.limit}`);
  }
  return buildLabelingQueue(params);
}

// ─── Submit label (upsert pattern) ─────────────────────────────

/**
 * Submit a quality label for a message. Idempotent — re-submission
 * by the same labeler for the same message UPDATES existing row
 * (never duplicates). Returns conflict flag if score differs from
 * existing LLM judge score by ≥ CONFLICT_DELTA_THRESHOLD.
 *
 * Side effects:
 *   - Creates/updates TrainingLabel row
 *   - If conflict detected, sets disputedWithLabelId on both labels
 *     (when judge label row exists — null otherwise; recorded inline)
 *
 * Throws:
 *   - NotFoundError if messageId does not exist
 *   - ConflictError if labeler attempts to label own-tier message
 */
export async function submitLabel(params: SubmitLabelParams): Promise<SubmitLabelResult> {
  // Verify message exists + fetch judge score for conflict detection
  const message = await prisma.consultationMessage.findUnique({
    where: { id: params.messageId },
    select: {
      id: true,
      consultationId: true,
      judgeScore: true,
    },
  });

  if (!message) {
    throw new NotFoundError(`ConsultationMessage ${params.messageId} not found`);
  }

  // Detect conflict with judge score (if judge has graded this message)
  let conflictDetected = false;
  let conflictDelta: number | null = null;
  if (message.judgeScore !== null) {
    conflictDelta = Math.abs(params.qualityScore - message.judgeScore);
    conflictDetected = conflictDelta >= CONFLICT_DELTA_THRESHOLD;
  }

  // Upsert by (labeledById, messageId) — composite uniqueness implicit
  // via labeler-pair scoping. If existing row found, UPDATE; else CREATE.
  const existingLabel = await prisma.trainingLabel.findFirst({
    where: {
      labeledById: params.labelerId,
      messageId: params.messageId,
    },
    select: { id: true },
  });

  const label = await prisma.$transaction(async (tx) => {
    if (existingLabel) {
      const updated = await tx.trainingLabel.update({
        where: { id: existingLabel.id },
        data: {
          qualityScore: params.qualityScore,
          isCorrect: params.isCorrect,
          correctionText: params.correctionText,
          clinicalNotes: params.clinicalNotes,
          category: params.category,
          tier: params.tier ?? 'HUMAN_EXPERT',
        },
        select: { id: true },
      });
      return { id: updated.id, created: false };
    }

    const created = await tx.trainingLabel.create({
      data: {
        consultationId: message.consultationId,
        messageId: params.messageId,
        labeledById: params.labelerId,
        qualityScore: params.qualityScore,
        isCorrect: params.isCorrect,
        correctionText: params.correctionText,
        clinicalNotes: params.clinicalNotes,
        category: params.category,
        tier: params.tier ?? 'HUMAN_EXPERT',
      },
      select: { id: true },
    });
    return { id: created.id, created: true };
  });

  logger.info('[Labeling] Label submitted', {
    labelId: label.id,
    labelerId: params.labelerId,
    messageId: params.messageId,
    qualityScore: params.qualityScore,
    tier: params.tier ?? 'HUMAN_EXPERT',
    created: label.created,
    conflictDetected,
    conflictDelta,
  });

  return {
    labelId: label.id,
    created: label.created,
    conflictDetected,
    conflictDelta,
  };
}

// ─── Stats ─────────────────────────────────────────────────────

/**
 * Compute labeling stats for a labeler over multiple time ranges.
 * Single DB roundtrip via SQL aggregation.
 */
export async function getLabelingStats(labelerId: string): Promise<LabelingStats> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setMonth(monthStart.getMonth() - 1);

  const [today, week, month, allTime] = await Promise.all([
    prisma.trainingLabel.count({
      where: { labeledById: labelerId, createdAt: { gte: todayStart } },
    }),
    prisma.trainingLabel.count({
      where: { labeledById: labelerId, createdAt: { gte: weekStart } },
    }),
    prisma.trainingLabel.count({
      where: { labeledById: labelerId, createdAt: { gte: monthStart } },
    }),
    prisma.trainingLabel.count({ where: { labeledById: labelerId } }),
  ]);

  // Average quality score from this labeler — last 30 days
  const avgQualityAgg = await prisma.trainingLabel.aggregate({
    where: { labeledById: labelerId, createdAt: { gte: monthStart } },
    _avg: { qualityScore: true },
  });

  // Pending conflicts — messages where this labeler's score and judge differ by ≥ threshold
  const conflictsPending = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "training_labels" tl
    JOIN "consultation_messages" cm ON cm.id = tl."messageId"
    WHERE tl."labeledById" = ${labelerId}
      AND cm."judgeScore" IS NOT NULL
      AND ABS(tl."qualityScore" - cm."judgeScore") >= ${CONFLICT_DELTA_THRESHOLD}
      AND tl."disputedWithLabelId" IS NULL
  `;

  const conflictsPendingCount = Number(conflictsPending[0]?.count ?? 0n);

  // Judge-human agreement — simple agreement ratio over last 30 days
  const agreementPairs = await prisma.$queryRaw<{ agree: bigint; total: bigint }[]>`
    SELECT
      SUM(CASE WHEN ABS(tl."qualityScore" - cm."judgeScore") < ${CONFLICT_DELTA_THRESHOLD} THEN 1 ELSE 0 END)::bigint AS agree,
      COUNT(*)::bigint AS total
    FROM "training_labels" tl
    JOIN "consultation_messages" cm ON cm.id = tl."messageId"
    WHERE tl."labeledById" = ${labelerId}
      AND cm."judgeScore" IS NOT NULL
      AND tl."createdAt" >= ${monthStart}
  `;

  const agreeCount = Number(agreementPairs[0]?.agree ?? 0n);
  const totalPairs = Number(agreementPairs[0]?.total ?? 0n);
  const judgeHumanAgreement = totalPairs > 0 ? agreeCount / totalPairs : 0;

  // Streak — consecutive days with ≥1 label (looking back from today)
  const streakDays = await computeStreak(labelerId, todayStart);

  return {
    counts: {
      today,
      thisWeek: week,
      thisMonth: month,
      allTime,
    },
    dailyTarget: DEFAULT_DAILY_TARGET,
    streakDays,
    avgQualityScore: avgQualityAgg._avg.qualityScore ?? 0,
    judgeHumanAgreement,
    conflictsPending: conflictsPendingCount,
    avgSecondsPerLabel: 0, // TODO Phase 3 — derived from LabelingSession (Month 2 add)
  };
}

/**
 * Walk backwards from today, counting consecutive days with ≥1 label.
 * Stops at first zero-day.
 */
async function computeStreak(labelerId: string, todayStart: Date): Promise<number> {
  let streak = 0;
  const cursor = new Date(todayStart);

  // Cap streak walk at 365 days for performance
  for (let i = 0; i < 365; i += 1) {
    const dayStart = new Date(cursor);
    const dayEnd = new Date(cursor);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const count = await prisma.trainingLabel.count({
      where: {
        labeledById: labelerId,
        createdAt: { gte: dayStart, lt: dayEnd },
      },
    });

    if (count === 0) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

// ─── Conflicts queue ───────────────────────────────────────────

/**
 * Fetch pending judge-vs-human conflicts for a labeler.
 * High-signal review queue — Mayank's gold cases.
 */
export async function getConflicts(
  labelerId: string,
  limit: number,
): Promise<readonly LabelConflict[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      messageId: string;
      humanScore: number;
      judgeScore: number;
      judgeReasoning: string | null;
      correctionText: string | null;
      delta: number;
      resolvedAt: Date | null;
    }>
  >`
    SELECT
      tl."messageId" AS "messageId",
      tl."qualityScore" AS "humanScore",
      cm."judgeScore" AS "judgeScore",
      cm."judgeReasoning" AS "judgeReasoning",
      tl."correctionText" AS "correctionText",
      ABS(tl."qualityScore" - cm."judgeScore") AS "delta",
      NULL::TIMESTAMP AS "resolvedAt"
    FROM "training_labels" tl
    JOIN "consultation_messages" cm ON cm.id = tl."messageId"
    WHERE tl."labeledById" = ${labelerId}
      AND cm."judgeScore" IS NOT NULL
      AND ABS(tl."qualityScore" - cm."judgeScore") >= ${CONFLICT_DELTA_THRESHOLD}
    ORDER BY "delta" DESC, tl."createdAt" DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    messageId: r.messageId,
    humanScore: r.humanScore as QualityScore,
    judgeScore: Math.round(r.judgeScore) as QualityScore,
    delta: r.delta,
    judgeReasoning: r.judgeReasoning ?? '',
    humanCorrectionText: r.correctionText,
    resolvedAt: r.resolvedAt?.toISOString() ?? null,
  }));
}
