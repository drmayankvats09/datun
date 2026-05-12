// ═══════════════════════════════════════════════════════════════
// ADMIN LABELING ROUTER — Task #44
//
// Endpoints (all require ADMIN role via parent admin/index.ts gate):
//   GET    /api/admin/labeling/queue        — Next N items per strategy
//   POST   /api/admin/labeling/submit       — Create/update a label
//   GET    /api/admin/labeling/stats        — Daily progress + agreement
//   GET    /api/admin/labeling/conflicts    — Judge-vs-human disputes
//   POST   /api/admin/labeling/judge/grade  — Manual single-message grade
//
// Auth: parent router applies requireAuth + requireRole('ADMIN').
// Validation: every body/query validated via @repo/api/validators.
// Errors: thrown AppError subclass → caught by global error handler.
//
// @see apps/api/src/routes/admin/index.ts — parent gate
// @see apps/api/src/services/training/* — business logic
// ═══════════════════════════════════════════════════════════════

import { Router, type Request, type Response, type NextFunction } from 'express';
import { validate, validateQuery } from '../../middleware/validate.js';
import {
  labelingQueueQuerySchema,
  labelSubmissionSchema,
  conflictsQuerySchema,
  judgeGradeRequestSchema,
} from '../../validators/training.schemas.js';
import {
  getLabelingQueue,
  submitLabel,
  getLabelingStats,
  getConflicts,
  gradeMessage,
} from '../../services/training/index.js';
import { AuthenticationError } from '../../errors/index.js';
import { makeQualityScore, type LabelingQueueStrategy } from '@repo/shared';

export const labelingRouter = Router();

// ─── Helper: extract labelerId from authenticated request ──────

function getLabelerId(req: Request): string {
  if (!req.auth?.sub) {
    throw new AuthenticationError('Authentication required');
  }
  return req.auth.sub;
}

// ─── GET /api/admin/labeling/queue ─────────────────────────────

labelingRouter.get(
  '/queue',
  validateQuery(labelingQueueQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const labelerId = getLabelerId(req);
      const query = req.query as unknown as {
        strategy: LabelingQueueStrategy;
        limit: number;
      };

      const items = await getLabelingQueue({
        labelerId,
        strategy: query.strategy,
        limit: query.limit,
      });

      res.json({
        success: true,
        data: {
          strategy: query.strategy,
          count: items.length,
          items,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/admin/labeling/submit ───────────────────────────

labelingRouter.post(
  '/submit',
  validate(labelSubmissionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const labelerId = getLabelerId(req);
      const body = req.body as {
        messageId: string;
        qualityScore: number;
        isCorrect: boolean;
        correctionText: string | null;
        clinicalNotes: string | null;
        category: string | null;
      };

      const result = await submitLabel({
        labelerId,
        messageId: body.messageId,
        qualityScore: makeQualityScore(body.qualityScore),
        isCorrect: body.isCorrect,
        correctionText: body.correctionText,
        clinicalNotes: body.clinicalNotes,
        category: body.category,
        tier: 'HUMAN_EXPERT',
      });

      res.status(result.created ? 201 : 200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/admin/labeling/stats ─────────────────────────────

labelingRouter.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const labelerId = getLabelerId(req);
    const stats = await getLabelingStats(labelerId);
    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/labeling/conflicts ─────────────────────────

labelingRouter.get(
  '/conflicts',
  validateQuery(conflictsQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const labelerId = getLabelerId(req);
      const query = req.query as unknown as { limit: number };
      const conflicts = await getConflicts(labelerId, query.limit);
      res.json({
        success: true,
        data: {
          count: conflicts.length,
          conflicts,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/admin/labeling/judge/grade ──────────────────────

labelingRouter.post(
  '/judge/grade',
  validate(judgeGradeRequestSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as { messageId: string; force: boolean };
      const result = await gradeMessage(body.messageId, { force: body.force });
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },
);
