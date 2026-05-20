// apps/api/src/routes/admin/flags.router.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN FLAGS ROUTER — CRUD + kill-switch + overrides (Task #49)
// ─────────────────────────────────────────────────────────────────
// Mounted at /api/admin/flags by `routes/admin/index.ts`. Inherits
// `requireAuth + requireRole('ADMIN')` from the parent router.
//
// ENDPOINTS:
//   GET    /                          — List active flags (paged)
//   GET    /archived                  — List archived flags
//   GET    /:key                      — Flag detail (DTO + overrides)
//   POST   /                          — Create a flag
//   PATCH  /:key                      — Update flag fields
//   POST   /:key/kill                 — Toggle kill-switch ON
//   POST   /:key/restore              — Toggle kill-switch OFF
//   POST   /:key/archive              — Soft-delete
//   POST   /:key/restore-archived     — Un-archive
//
//   GET    /:key/overrides            — List overrides for a flag
//   POST   /:key/overrides            — Create/update an override
//   DELETE /:key/overrides/:id        — Delete an override
//
//   POST   /cache/flush               — Wipe L1 across instances
//   POST   /sync/run                  — Force a one-shot PostHog sync
//   GET    /sync/status               — Sync diagnostic snapshot
//
// Every mutation:
//   1. Validates input with Zod.
//   2. Persists via Prisma.
//   3. Calls `flagCacheService.invalidateFlag(key)` (drops L1+L2).
//   4. Calls `publishFlagInvalidation(key)` (broadcasts to every
//      API replica via Redis pub/sub).
//   5. Returns the new DTO with HTTP 200/201.
//
// Reference patterns:
//   - LaunchDarkly REST API v2 (paths + DTO shapes).
//   - Stripe admin API surface (idempotency keys, kebab-case routes).
//   - GitHub Settings API (PATCH-with-partial-payload semantics).
// ═══════════════════════════════════════════════════════════════

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@repo/db';
import { ALL_FLAG_KEYS, isKnownFlagKey, isWellFormedFlagKey } from '@repo/shared';
import type {
  FeatureFlagDTO,
  FeatureFlagOverrideDTO,
  FlagCategory,
  FlagOverrideEntity,
  FlagStatus,
  FlagTargetingSpec,
} from '@repo/shared';
import { validate, validateParams, validateQuery } from '../../middleware/validate.js';
import { AppError, NotFoundError, ValidationError } from '../../errors/index.js';
import { logger } from '../../lib/logger.js';
import {
  flagCacheService,
  publishFlagInvalidation,
  runFlagSyncOnce,
  getFlagSyncStatus,
} from '../../services/flag/index.js';

export const adminFlagsRouter = Router();

// ═══════════════════════════════════════════════════════════════
// Zod schemas — single source of truth for input shapes
// ═══════════════════════════════════════════════════════════════

const flagKeyParamSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(128)
    .refine((v) => isWellFormedFlagKey(v), {
      message: 'flagKey must be kebab-case in the form "<scope>.<feature>"',
    }),
});

const overrideIdParamSchema = flagKeyParamSchema.extend({
  id: z.string().min(1).max(64),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  category: z
    .enum(['RELEASE', 'EXPERIMENT', 'OPERATIONAL', 'PERMISSION', 'KILL_SWITCH', 'BETA'])
    .optional(),
  status: z.enum(['OFF', 'ON', 'ROLLOUT_BUCKET', 'TARGETED']).optional(),
});

const targetingRuleSchema = z.object({
  attribute: z.enum(['userId', 'clinicId', 'region', 'role', 'plan', 'locale']),
  op: z.enum(['in', 'not_in', 'eq', 'neq']),
  values: z.array(z.string().min(1).max(128)).min(1).max(500),
});

const targetingSpecSchema = z.object({
  combinator: z.enum(['AND', 'OR']),
  rules: z.array(targetingRuleSchema).max(50),
});

const createFlagBodySchema = z.object({
  flagKey: z
    .string()
    .min(1)
    .max(128)
    .refine((v) => isKnownFlagKey(v), {
      message: 'flagKey must be present in the @repo/shared FLAG_KEYS registry',
    }),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  category: z.enum(['RELEASE', 'EXPERIMENT', 'OPERATIONAL', 'PERMISSION', 'KILL_SWITCH', 'BETA']),
  status: z.enum(['OFF', 'ON', 'ROLLOUT_BUCKET', 'TARGETED']).default('OFF'),
  defaultValue: z.boolean().default(false),
  rolloutPercent: z.number().int().min(0).max(100).default(0),
  targetingRules: targetingSpecSchema.optional(),
  variants: z.record(z.string(), z.boolean()).optional(),
  enabledClinicIds: z.array(z.string().min(1).max(64)).max(1000).default([]),
  disabledClinicIds: z.array(z.string().min(1).max(64)).max(1000).default([]),
  staleAt: z.coerce.date().optional(),
});

const updateFlagBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['OFF', 'ON', 'ROLLOUT_BUCKET', 'TARGETED']).optional(),
  rolloutPercent: z.number().int().min(0).max(100).optional(),
  targetingRules: targetingSpecSchema.optional(),
  variants: z.record(z.string(), z.boolean()).optional(),
  enabledClinicIds: z.array(z.string().min(1).max(64)).max(1000).optional(),
  disabledClinicIds: z.array(z.string().min(1).max(64)).max(1000).optional(),
  staleAt: z.coerce.date().nullable().optional(),
});

const killSwitchBodySchema = z.object({
  reason: z.string().min(1).max(500),
  incidentId: z.string().min(1).max(64).optional(),
});

const createOverrideBodySchema = z.object({
  entityType: z.enum(['USER', 'CLINIC', 'REGION', 'ROLE']),
  entityId: z.string().min(1).max(64),
  value: z.boolean(),
  reason: z.string().max(500).optional(),
  expiresAt: z.coerce.date().optional(),
});

// ═══════════════════════════════════════════════════════════════
// DTO mappers — Prisma row → wire format
// ═══════════════════════════════════════════════════════════════

interface FlagRowForDTO {
  id: string;
  flagKey: string;
  name: string;
  description: string;
  category: string;
  status: string;
  defaultValue: boolean;
  rolloutPercent: number;
  targetingRules: unknown;
  variants: unknown;
  enabledClinicIds: string[];
  disabledClinicIds: string[];
  evaluationCount: bigint;
  lastEvaluatedAt: Date | null;
  staleAt: Date | null;
  createdByUserId: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OverrideRowForDTO {
  id: string;
  flagId: string;
  entityType: string;
  entityId: string;
  value: boolean;
  reason: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

function toFlagDTO(row: FlagRowForDTO): FeatureFlagDTO {
  return {
    id: row.id,
    flagKey: row.flagKey as FeatureFlagDTO['flagKey'],
    name: row.name,
    description: row.description,
    category: row.category as FlagCategory,
    status: row.status as FlagStatus,
    defaultValue: row.defaultValue,
    rolloutPercent: row.rolloutPercent,
    targetingRules: (row.targetingRules ?? { combinator: 'AND', rules: [] }) as FlagTargetingSpec,
    variants: (row.variants ?? { control: false, treatment: true }) as Record<string, boolean>,
    enabledClinicIds: row.enabledClinicIds,
    disabledClinicIds: row.disabledClinicIds,
    // BigInt does not serialise — render as decimal string.
    evaluationCount: row.evaluationCount.toString(),
    lastEvaluatedAt: row.lastEvaluatedAt?.toISOString() ?? null,
    staleAt: row.staleAt?.toISOString() ?? null,
    createdByUserId: row.createdByUserId,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toOverrideDTO(row: OverrideRowForDTO): FeatureFlagOverrideDTO {
  return {
    id: row.id,
    flagId: row.flagId,
    entityType: row.entityType as FlagOverrideEntity,
    entityId: row.entityId,
    value: row.value,
    reason: row.reason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

// ─── Internal helpers ────────────────────────────────────────────

async function invalidateEverywhere(flagKey: string): Promise<void> {
  await flagCacheService.invalidateFlag(flagKey);
  await publishFlagInvalidation(flagKey);
}

function requireAdminUserId(req: Request): string {
  const sub = req.auth?.sub;
  if (!sub) {
    throw new AppError('Authentication required', 401, 'AUTHENTICATION_ERROR');
  }
  return sub;
}

// ═══════════════════════════════════════════════════════════════
// LIST + SEARCH
// ═══════════════════════════════════════════════════════════════

adminFlagsRouter.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const q = (
        req as Request & {
          validatedQuery: z.infer<typeof listQuerySchema>;
        }
      ).validatedQuery;

      const where: Record<string, unknown> = { archivedAt: null };
      if (q.category) where.category = q.category;
      if (q.status) where.status = q.status;

      const [items, total] = await Promise.all([
        prisma.featureFlag.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
        }),
        prisma.featureFlag.count({ where }),
      ]);

      res.json({
        success: true,
        data: {
          items: items.map((r) => toFlagDTO(r as FlagRowForDTO)),
          knownKeys: ALL_FLAG_KEYS,
          pagination: {
            page: q.page,
            pageSize: q.pageSize,
            total,
            totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

adminFlagsRouter.get('/archived', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.featureFlag.findMany({
      where: { archivedAt: { not: null } },
      orderBy: { archivedAt: 'desc' },
      take: 200,
    });
    res.json({
      success: true,
      data: { items: items.map((r) => toFlagDTO(r as FlagRowForDTO)) },
    });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// SYNC + CACHE controls (must come BEFORE /:key to avoid shadowing)
// ═══════════════════════════════════════════════════════════════

adminFlagsRouter.post('/cache/flush', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await flagCacheService.flush();
    logger.warn('[admin-flags] cache flushed', { adminUserId: req.auth?.sub });
    res.json({ success: true, data: { flushed: true } });
  } catch (err) {
    next(err);
  }
});

adminFlagsRouter.post('/sync/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await runFlagSyncOnce();
    logger.info('[admin-flags] manual sync', { adminUserId: req.auth?.sub, result });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

adminFlagsRouter.get('/sync/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: getFlagSyncStatus() });
  } catch (err) {
    next(err);
  }
});

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════

adminFlagsRouter.post(
  '/',
  validate(createFlagBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = requireAdminUserId(req);
      const body = req.body as z.infer<typeof createFlagBodySchema>;

      const existing = await prisma.featureFlag.findUnique({
        where: { flagKey: body.flagKey },
      });
      if (existing) {
        throw new AppError(`Flag "${body.flagKey}" already exists`, 409, 'CONFLICT');
      }

      const created = await prisma.featureFlag.create({
        data: {
          flagKey: body.flagKey,
          name: body.name,
          description: body.description,
          category: body.category,
          status: body.status,
          defaultValue: body.defaultValue,
          rolloutPercent: body.rolloutPercent,
          targetingRules: body.targetingRules ?? { combinator: 'AND', rules: [] },
          variants: body.variants ?? { control: false, treatment: true },
          enabledClinicIds: body.enabledClinicIds,
          disabledClinicIds: body.disabledClinicIds,
          staleAt: body.staleAt ?? null,
          createdByUserId: adminUserId,
        },
      });

      await invalidateEverywhere(body.flagKey);

      logger.info('[admin-flags] created', {
        adminUserId,
        flagKey: body.flagKey,
        status: body.status,
      });

      res.status(201).json({
        success: true,
        data: { flag: toFlagDTO(created as FlagRowForDTO) },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════
// DETAIL
// ═══════════════════════════════════════════════════════════════

adminFlagsRouter.get(
  '/:key',
  validateParams(flagKeyParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = (
        req as Request & {
          validatedParams: z.infer<typeof flagKeyParamSchema>;
        }
      ).validatedParams;

      const flag = await prisma.featureFlag.findUnique({
        where: { flagKey: params.key },
        include: { overrides: { orderBy: { createdAt: 'desc' } } },
      });
      if (!flag) throw new NotFoundError('Flag', params.key);

      // Strip overrides from `flag` to avoid duplicating them in the
      // DTO mapper (mapper does not handle relations).
      const { overrides, ...flagRow } = flag;

      res.json({
        success: true,
        data: {
          flag: toFlagDTO(flagRow as FlagRowForDTO),
          overrides: overrides.map((o) => toOverrideDTO(o as OverrideRowForDTO)),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════

adminFlagsRouter.patch(
  '/:key',
  validateParams(flagKeyParamSchema),
  validate(updateFlagBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = requireAdminUserId(req);
      const params = (
        req as Request & {
          validatedParams: z.infer<typeof flagKeyParamSchema>;
        }
      ).validatedParams;
      const body = req.body as z.infer<typeof updateFlagBodySchema>;

      const existing = await prisma.featureFlag.findUnique({
        where: { flagKey: params.key },
      });
      if (!existing) throw new NotFoundError('Flag', params.key);
      if (existing.archivedAt) {
        throw new ValidationError('Cannot update an archived flag — restore it first');
      }

      // Build update object explicitly — never spread the user-supplied
      // body onto Prisma (defence against mass assignment).
      const data: Record<string, unknown> = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.description !== undefined) data.description = body.description;
      if (body.status !== undefined) data.status = body.status;
      if (body.rolloutPercent !== undefined) data.rolloutPercent = body.rolloutPercent;
      if (body.targetingRules !== undefined) data.targetingRules = body.targetingRules;
      if (body.variants !== undefined) data.variants = body.variants;
      if (body.enabledClinicIds !== undefined) data.enabledClinicIds = body.enabledClinicIds;
      if (body.disabledClinicIds !== undefined) data.disabledClinicIds = body.disabledClinicIds;
      if (body.staleAt !== undefined) data.staleAt = body.staleAt;

      const updated = await prisma.featureFlag.update({
        where: { flagKey: params.key },
        data,
      });

      await invalidateEverywhere(params.key);

      logger.info('[admin-flags] updated', {
        adminUserId,
        flagKey: params.key,
        changedFields: Object.keys(data),
      });

      res.json({
        success: true,
        data: { flag: toFlagDTO(updated as FlagRowForDTO) },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════
// KILL SWITCH (toggle ON) / RESTORE (toggle OFF)
// ═══════════════════════════════════════════════════════════════

adminFlagsRouter.post(
  '/:key/kill',
  validateParams(flagKeyParamSchema),
  validate(killSwitchBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = requireAdminUserId(req);
      const params = (
        req as Request & {
          validatedParams: z.infer<typeof flagKeyParamSchema>;
        }
      ).validatedParams;
      const body = req.body as z.infer<typeof killSwitchBodySchema>;

      const updated = await prisma.featureFlag.update({
        where: { flagKey: params.key },
        data: { status: 'ON', category: 'KILL_SWITCH' },
      });

      await invalidateEverywhere(params.key);

      logger.error('[admin-flags] KILL SWITCH ACTIVATED', {
        adminUserId,
        flagKey: params.key,
        reason: body.reason,
        incidentId: body.incidentId ?? null,
      });

      res.json({
        success: true,
        data: { flag: toFlagDTO(updated as FlagRowForDTO) },
      });
    } catch (err) {
      next(err);
    }
  },
);

adminFlagsRouter.post(
  '/:key/restore',
  validateParams(flagKeyParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = requireAdminUserId(req);
      const params = (
        req as Request & {
          validatedParams: z.infer<typeof flagKeyParamSchema>;
        }
      ).validatedParams;

      const updated = await prisma.featureFlag.update({
        where: { flagKey: params.key },
        data: { status: 'OFF' },
      });

      await invalidateEverywhere(params.key);

      logger.warn('[admin-flags] kill switch RESTORED (set to OFF)', {
        adminUserId,
        flagKey: params.key,
      });

      res.json({
        success: true,
        data: { flag: toFlagDTO(updated as FlagRowForDTO) },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════
// ARCHIVE / RESTORE-ARCHIVED
// ═══════════════════════════════════════════════════════════════

adminFlagsRouter.post(
  '/:key/archive',
  validateParams(flagKeyParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = requireAdminUserId(req);
      const params = (
        req as Request & {
          validatedParams: z.infer<typeof flagKeyParamSchema>;
        }
      ).validatedParams;

      const updated = await prisma.featureFlag.update({
        where: { flagKey: params.key },
        data: { archivedAt: new Date() },
      });

      await invalidateEverywhere(params.key);

      logger.info('[admin-flags] archived', { adminUserId, flagKey: params.key });

      res.json({
        success: true,
        data: { flag: toFlagDTO(updated as FlagRowForDTO) },
      });
    } catch (err) {
      next(err);
    }
  },
);

adminFlagsRouter.post(
  '/:key/restore-archived',
  validateParams(flagKeyParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = requireAdminUserId(req);
      const params = (
        req as Request & {
          validatedParams: z.infer<typeof flagKeyParamSchema>;
        }
      ).validatedParams;

      const updated = await prisma.featureFlag.update({
        where: { flagKey: params.key },
        data: { archivedAt: null },
      });

      await invalidateEverywhere(params.key);

      logger.info('[admin-flags] un-archived', { adminUserId, flagKey: params.key });

      res.json({
        success: true,
        data: { flag: toFlagDTO(updated as FlagRowForDTO) },
      });
    } catch (err) {
      next(err);
    }
  },
);

// ═══════════════════════════════════════════════════════════════
// OVERRIDES (per-entity exceptions)
// ═══════════════════════════════════════════════════════════════

adminFlagsRouter.get(
  '/:key/overrides',
  validateParams(flagKeyParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const params = (
        req as Request & {
          validatedParams: z.infer<typeof flagKeyParamSchema>;
        }
      ).validatedParams;

      const flag = await prisma.featureFlag.findUnique({
        where: { flagKey: params.key },
        select: { id: true },
      });
      if (!flag) throw new NotFoundError('Flag', params.key);

      const rows = await prisma.featureFlagOverride.findMany({
        where: { flagId: flag.id },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: { items: rows.map((o) => toOverrideDTO(o as OverrideRowForDTO)) },
      });
    } catch (err) {
      next(err);
    }
  },
);

adminFlagsRouter.post(
  '/:key/overrides',
  validateParams(flagKeyParamSchema),
  validate(createOverrideBodySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = requireAdminUserId(req);
      const params = (
        req as Request & {
          validatedParams: z.infer<typeof flagKeyParamSchema>;
        }
      ).validatedParams;
      const body = req.body as z.infer<typeof createOverrideBodySchema>;

      const flag = await prisma.featureFlag.findUnique({
        where: { flagKey: params.key },
        select: { id: true },
      });
      if (!flag) throw new NotFoundError('Flag', params.key);

      const row = await prisma.featureFlagOverride.upsert({
        where: {
          flagId_entityType_entityId: {
            flagId: flag.id,
            entityType: body.entityType,
            entityId: body.entityId,
          },
        },
        create: {
          flagId: flag.id,
          entityType: body.entityType,
          entityId: body.entityId,
          value: body.value,
          reason: body.reason ?? null,
          expiresAt: body.expiresAt ?? null,
          createdByUserId: adminUserId,
        },
        update: {
          value: body.value,
          reason: body.reason ?? null,
          expiresAt: body.expiresAt ?? null,
        },
      });

      await invalidateEverywhere(params.key);

      logger.info('[admin-flags] override upserted', {
        adminUserId,
        flagKey: params.key,
        entityType: body.entityType,
        entityId: body.entityId,
      });

      res.json({
        success: true,
        data: { override: toOverrideDTO(row as OverrideRowForDTO) },
      });
    } catch (err) {
      next(err);
    }
  },
);

adminFlagsRouter.delete(
  '/:key/overrides/:id',
  validateParams(overrideIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminUserId = requireAdminUserId(req);
      const params = (
        req as Request & {
          validatedParams: z.infer<typeof overrideIdParamSchema>;
        }
      ).validatedParams;

      const existing = await prisma.featureFlagOverride.findUnique({
        where: { id: params.id },
        select: { id: true, flag: { select: { flagKey: true } } },
      });
      if (!existing || existing.flag.flagKey !== params.key) {
        throw new NotFoundError('Override', params.id);
      }

      await prisma.featureFlagOverride.delete({ where: { id: params.id } });
      await invalidateEverywhere(params.key);

      logger.info('[admin-flags] override deleted', {
        adminUserId,
        flagKey: params.key,
        overrideId: params.id,
      });

      res.json({ success: true, data: { deleted: true } });
    } catch (err) {
      next(err);
    }
  },
);
