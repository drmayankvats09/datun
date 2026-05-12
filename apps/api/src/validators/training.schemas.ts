// ═══════════════════════════════════════════════════════════════
// TRAINING ZOD SCHEMAS — Task #44
//
// Runtime validation for /api/admin/labeling/* endpoints.
// Aligned with @repo/shared types/training (compile-time) and
// Prisma model constraints (DB-time). Three-layer defense.
//
// FAANG principles applied:
//   - Strict modes (no unknown keys allowed)
//   - Branded types via Zod refinement (matches QualityScore brand)
//   - Coerce where reasonable (query params arrive as strings)
//
// @see packages/shared/src/types/training.ts
// @see packages/db/prisma/schema.prisma
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';

// ─── Reusable refinements ──────────────────────────────────────

const qualityScoreSchema = z
  .number()
  .int('qualityScore must be an integer')
  .min(1, 'qualityScore must be ≥ 1')
  .max(5, 'qualityScore must be ≤ 5');

const uuidSchema = z.string().uuid({ message: 'must be a valid UUID' });

const labelingStrategySchema = z.enum(['typi_clust', 'margin', 'conflicts', 'random']);

// ─── /admin/labeling/queue query ───────────────────────────────

export const labelingQueueQuerySchema = z
  .object({
    strategy: labelingStrategySchema.default('typi_clust'),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .strict();

export type LabelingQueueQueryInput = z.infer<typeof labelingQueueQuerySchema>;

// ─── /admin/labeling/submit body ───────────────────────────────

export const labelSubmissionSchema = z
  .object({
    messageId: uuidSchema,
    qualityScore: qualityScoreSchema,
    isCorrect: z.boolean(),
    correctionText: z.string().max(5000).nullable().default(null),
    clinicalNotes: z.string().max(5000).nullable().default(null),
    category: z.string().max(100).nullable().default(null),
  })
  .strict()
  .refine((data) => data.qualityScore > 2 || data.correctionText !== null, {
    message: 'correctionText required when qualityScore ≤ 2',
    path: ['correctionText'],
  });

export type LabelSubmissionInput = z.infer<typeof labelSubmissionSchema>;

// ─── /admin/labeling/conflicts query ───────────────────────────

export const conflictsQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type ConflictsQueryInput = z.infer<typeof conflictsQuerySchema>;

// ─── /admin/labeling/stats — no body, no query (auth identity is labelerId) ──

// ─── /admin/judge/grade body (manual trigger / regrade) ────────

export const judgeGradeRequestSchema = z
  .object({
    messageId: uuidSchema,
    force: z.boolean().default(false),
  })
  .strict();

export type JudgeGradeRequestInput = z.infer<typeof judgeGradeRequestSchema>;
