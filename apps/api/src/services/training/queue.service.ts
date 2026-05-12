// ═══════════════════════════════════════════════════════════════
// LABELING QUEUE — Task #44 (Active Learning)
//
// Strategy switch for "what message should Mayank label next?"
// Based on 2026 SOTA research:
//   - TypiClust (Hacohen 2022) — diversity-first, low-data regime
//   - Margin (Lewis 1994) — uncertainty-first, high-data regime
//   - TCM = TypiClust + Margin (2024) — combined SOTA
//   - Conflicts — judge-vs-human disagreement (high signal)
//   - Random — 10% baseline (unbiased eval control)
//
// At < 1000 total labels → TypiClust (diversity dominant)
// At ≥ 1000 total labels → Margin (uncertainty dominant)
//
// FAANG principles applied:
//   - Pure SQL queries — no in-memory ranking (Postgres does it)
//   - Composable: each strategy is its own SQL builder
//   - Deterministic ordering — same query, same DB, same results
//   - Excludes already-labeled-by-this-labeler messages
// ═══════════════════════════════════════════════════════════════

import { Prisma } from '@repo/db';
import { prisma } from '@repo/db';
import type { LabelingQueueItem, LabelingQueueStrategy } from '@repo/shared';
import { logger } from '../../lib/logger.js';

// ─── Strategy thresholds ───────────────────────────────────────

const TYPI_CLUST_TO_MARGIN_THRESHOLD = 1000;
const _RANDOM_QUOTA_RATIO = 0.1; // 10% random for unbiased eval (reserved for hybrid strategy — Month 4 TCM enhancement)

// ─── Inputs ────────────────────────────────────────────────────

export interface BuildQueueParams {
  readonly labelerId: string;
  readonly strategy: LabelingQueueStrategy;
  readonly limit: number;
}

// ─── Internal: total label count (auto-switch heuristic) ───────

async function countTotalLabels(): Promise<number> {
  return prisma.trainingLabel.count();
}

// ─── Strategy: Margin (judge score near 3) ─────────────────────

async function buildMarginQueue(
  labelerId: string,
  limit: number,
): Promise<readonly LabelingQueueItem[]> {
  // SQL: ASSISTANT messages with judge score not null, ordered by
  // distance from midpoint (3) ASC — closest to 3 = highest uncertainty.
  // Exclude messages already labeled by this labeler.
  return queryQueueItems({
    extraWhere: Prisma.sql`
      AND cm."judgeScore" IS NOT NULL
      AND cm."role" IN ('ASSISTANT', 'AI')
      AND NOT EXISTS (
        SELECT 1 FROM "training_labels" tl
        WHERE tl."messageId" = cm.id AND tl."labeledById" = ${labelerId}::uuid
      )
    `,
    orderBy: Prisma.sql`ORDER BY ABS(cm."judgeScore" - 3) ASC, cm."createdAt" DESC`,
    limit,
  });
}

// ─── Strategy: TypiClust (diversity via judge score buckets) ───
//
// True TypiClust requires embeddings (Task #132 — Month 5). Until then,
// approximate diversity via judge-score bucketing: pull N items from
// each score bucket [1, 2, 3, 4, 5] for spread. Within bucket, oldest
// unrated first (covers historical conversations evenly).

async function buildTypiClustQueue(
  labelerId: string,
  limit: number,
): Promise<readonly LabelingQueueItem[]> {
  const perBucket = Math.max(1, Math.ceil(limit / 5));
  const buckets = await Promise.all(
    [1, 2, 3, 4, 5].map((bucket) =>
      queryQueueItems({
        extraWhere: Prisma.sql`
          AND cm."judgeScore" IS NOT NULL
          AND cm."judgeScore" >= ${bucket - 0.5}::float
          AND cm."judgeScore" <  ${bucket + 0.5}::float
          AND cm."role" IN ('ASSISTANT', 'AI')
          AND NOT EXISTS (
            SELECT 1 FROM "training_labels" tl
            WHERE tl."messageId" = cm.id AND tl."labeledById" = ${labelerId}::uuid
          )
        `,
        orderBy: Prisma.sql`ORDER BY cm."createdAt" ASC`,
        limit: perBucket,
      }),
    ),
  );

  // Flatten + truncate to requested limit
  const flat: LabelingQueueItem[] = [];
  for (const batch of buckets) flat.push(...batch);
  return flat.slice(0, limit);
}

// ─── Strategy: Conflicts (judge vs human disagreement) ─────────

async function buildConflictsQueue(
  labelerId: string,
  limit: number,
): Promise<readonly LabelingQueueItem[]> {
  // Messages where THIS labeler labeled AND judge graded AND delta >= 2.
  // Mayank's gold queue — re-review disagreements.
  return queryQueueItems({
    extraWhere: Prisma.sql`
      AND cm."judgeScore" IS NOT NULL
      AND cm."role" IN ('ASSISTANT', 'AI')
      AND EXISTS (
        SELECT 1 FROM "training_labels" tl
        WHERE tl."messageId" = cm.id
          AND tl."labeledById" = ${labelerId}::uuid
          AND ABS(tl."qualityScore" - cm."judgeScore") >= 2
      )
    `,
    orderBy: Prisma.sql`ORDER BY cm."createdAt" DESC`,
    limit,
  });
}

// ─── Strategy: Random (unbiased control) ───────────────────────

async function buildRandomQueue(
  labelerId: string,
  limit: number,
): Promise<readonly LabelingQueueItem[]> {
  // TABLESAMPLE BERNOULLI is fastest random sample for Postgres at scale,
  // but for small tables, ORDER BY random() suffices. Use the latter
  // until table > 100k rows.
  return queryQueueItems({
    extraWhere: Prisma.sql`
      AND cm."role" IN ('ASSISTANT', 'AI')
      AND NOT EXISTS (
        SELECT 1 FROM "training_labels" tl
        WHERE tl."messageId" = cm.id AND tl."labeledById" = ${labelerId}::uuid
      )
    `,
    orderBy: Prisma.sql`ORDER BY random()`,
    limit,
  });
}

// ─── Shared: SQL query template ────────────────────────────────

interface QueryParams {
  readonly extraWhere: Prisma.Sql;
  readonly orderBy: Prisma.Sql;
  readonly limit: number;
}

async function queryQueueItems(p: QueryParams): Promise<readonly LabelingQueueItem[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      messageId: string;
      consultationId: string;
      role: string;
      content: string;
      redactedContent: { text?: string } | null;
      sequenceNumber: number;
      createdAt: Date;
      aiProvider: string | null;
      aiModel: string | null;
      judgeScore: number | null;
      judgeReasoning: string | null;
      existingLabelId: string | null;
      chiefComplaint: string | null;
    }>
  >(Prisma.sql`
    SELECT
      cm.id                                AS "messageId",
      cm."consultationId"                  AS "consultationId",
      cm."role"::text                      AS "role",
      cm."content"                         AS "content",
      cm."redactedContent"                 AS "redactedContent",
      cm."sequenceNumber"                  AS "sequenceNumber",
      cm."createdAt"                       AS "createdAt",
      cm."aiProvider"                      AS "aiProvider",
      cm."aiModel"                         AS "aiModel",
      cm."judgeScore"                      AS "judgeScore",
      cm."judgeReasoning"                  AS "judgeReasoning",
      tl_existing.id                       AS "existingLabelId",
      c."chiefComplaint"                   AS "chiefComplaint"
    FROM "consultation_messages" cm
    JOIN "consultations" c ON c.id = cm."consultationId"
    LEFT JOIN "training_labels" tl_existing
      ON tl_existing."messageId" = cm.id
     AND tl_existing."labeledById" = (SELECT id FROM "users" LIMIT 0)
    WHERE c.status = 'COMPLETED'
      AND c."dataTrainingConsentAt" IS NOT NULL
      ${p.extraWhere}
    ${p.orderBy}
    LIMIT ${p.limit}
  `);

  return rows.map((r) => {
    const redactedText =
      r.redactedContent && typeof r.redactedContent.text === 'string'
        ? r.redactedContent.text
        : null;

    const uncertaintyBand: 'HIGH' | 'MEDIUM' | 'LOW' | null =
      r.judgeScore === null
        ? null
        : Math.abs(r.judgeScore - 3) <= 0.5
          ? 'HIGH'
          : Math.abs(r.judgeScore - 3) <= 1.5
            ? 'MEDIUM'
            : 'LOW';

    return {
      messageId: r.messageId,
      consultationId: r.consultationId,
      role: r.role as LabelingQueueItem['role'],
      content: r.content,
      redactedContent: redactedText,
      sequenceNumber: r.sequenceNumber,
      createdAt: r.createdAt.toISOString(),
      aiProvider: r.aiProvider,
      aiModel: r.aiModel,
      judgeScore: r.judgeScore,
      judgeReasoning: r.judgeReasoning,
      existingLabelId: r.existingLabelId,
      uncertaintyBand,
      chiefComplaintSnippet: r.chiefComplaint ? r.chiefComplaint.slice(0, 100) : null,
    };
  });
}

// ─── Public entry ──────────────────────────────────────────────

/**
 * Build labeling queue per strategy. Auto-switches TypiClust ↔ Margin
 * based on total label count when caller passes 'typi_clust' but DB
 * has crossed threshold. 'margin' / 'conflicts' / 'random' always exact.
 *
 * Strategy semantics:
 *   - 'typi_clust' → diversity-first; auto-upgrades to margin past 1k labels
 *   - 'margin'     → highest-uncertainty (judge score near 3)
 *   - 'conflicts'  → judge-vs-human disagreement (Mayank's gold queue)
 *   - 'random'     → unbiased baseline control
 */
export async function buildLabelingQueue(
  params: BuildQueueParams,
): Promise<readonly LabelingQueueItem[]> {
  const { labelerId, strategy, limit } = params;
  let effectiveStrategy = strategy;

  if (strategy === 'typi_clust') {
    const totalLabels = await countTotalLabels();
    if (totalLabels >= TYPI_CLUST_TO_MARGIN_THRESHOLD) {
      effectiveStrategy = 'margin';
      logger.info('[Queue] auto-switched typi_clust → margin', { totalLabels });
    }
  }

  switch (effectiveStrategy) {
    case 'typi_clust':
      return buildTypiClustQueue(labelerId, limit);
    case 'margin':
      return buildMarginQueue(labelerId, limit);
    case 'conflicts':
      return buildConflictsQueue(labelerId, limit);
    case 'random':
      return buildRandomQueue(labelerId, limit);
    default: {
      const _exhaustive: never = effectiveStrategy;
      throw new Error(`Unknown strategy: ${String(_exhaustive)}`);
    }
  }
}
