// apps/api/src/routes/admin/security.router.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN SECURITY ROUTER — Mayank-facing CSP violation dashboard backend
//
// ENDPOINTS (all gated by parent admin/index.ts requireAuth + requireRole('ADMIN')):
//   GET    /api/admin/security/violations         — Paginated list with filters
//   GET    /api/admin/security/violations/:id     — Single violation detail
//   GET    /api/admin/security/stats              — Aggregate stats
//
// Express 5 compat: reads validated query/params from req.validatedQuery /
// req.validatedParams (set by middleware/validate.ts).
//
// Pattern: Stripe Radar dashboards, Cloudflare Security Center.
// ═══════════════════════════════════════════════════════════════

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@repo/db';
import { validateQuery, validateParams } from '../../middleware/validate.js';

export const adminSecurityRouter = Router();

// ── Schemas ────────────────────────────────────────────────────

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  effectiveDirective: z.string().max(256).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const detailParamsSchema = z.object({
  id: z.string().min(1).max(64),
});

type ListQuery = z.infer<typeof listQuerySchema>;
type DetailParams = z.infer<typeof detailParamsSchema>;

// Type helper for validated request attachments.
interface ValidatedRequest<Q = unknown, P = unknown> extends Request {
  validatedQuery?: Q;
  validatedParams?: P;
}

// ── GET /violations ───────────────────────────────────────────

adminSecurityRouter.get(
  '/violations',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (req as ValidatedRequest<ListQuery>).validatedQuery as ListQuery;

      const where: Record<string, unknown> = {};
      if (q.severity) where.severity = q.severity;
      if (q.effectiveDirective) where.effectiveDirective = q.effectiveDirective;
      if (q.from || q.to) {
        const range: Record<string, Date> = {};
        if (q.from) range.gte = q.from;
        if (q.to) range.lte = q.to;
        where.createdAt = range;
      }

      const [items, total] = await Promise.all([
        prisma.cspViolation.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
          select: {
            id: true,
            blockedUri: true,
            documentUri: true,
            effectiveDirective: true,
            violatedDirective: true,
            severity: true,
            disposition: true,
            dedupCount: true,
            createdAt: true,
          },
        }),
        prisma.cspViolation.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          items,
          pagination: {
            page: q.page,
            pageSize: q.pageSize,
            total,
            totalPages: Math.ceil(total / q.pageSize),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /violations/:id ───────────────────────────────────────

adminSecurityRouter.get(
  '/violations/:id',
  validateParams(detailParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = (req as ValidatedRequest<unknown, DetailParams>)
        .validatedParams as DetailParams;
      const { id } = params;
      const item = await prisma.cspViolation.findUnique({ where: { id } });

      if (!item) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: `Violation '${id}' not found` },
        });
        return;
      }

      res.json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },
);

// ── GET /stats ────────────────────────────────────────────────

adminSecurityRouter.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    const [today, yesterday, criticalToday, byDirective] = await Promise.all([
      prisma.cspViolation.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.cspViolation.count({
        where: { createdAt: { gte: twoDaysAgo, lt: oneDayAgo } },
      }),
      prisma.cspViolation.count({
        where: { createdAt: { gte: oneDayAgo }, severity: 'critical' },
      }),
      prisma.cspViolation.groupBy({
        by: ['effectiveDirective'],
        where: { createdAt: { gte: oneDayAgo } },
        _count: { _all: true },
        orderBy: { _count: { effectiveDirective: 'desc' } },
        take: 10,
      }),
    ]);

    const changeVsYesterdayPct =
      yesterday === 0 ? null : Math.round(((today - yesterday) / yesterday) * 100);

    res.json({
      success: true,
      data: {
        today,
        yesterday,
        criticalToday,
        changeVsYesterdayPct,
        topDirectives: byDirective.map(
          (row: { effectiveDirective: string; _count: { _all: number } }) => ({
            directive: row.effectiveDirective,
            count: row._count._all,
          }),
        ),
      },
    });
  } catch (err) {
    next(err);
  }
});
