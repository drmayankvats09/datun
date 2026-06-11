// ═══════════════════════════════════════════════════════════════
// MEDIA ROUTES — /api/media/*
//
// Endpoints:
//   POST   /api/media/upload-intent       — request signed R2 PUT URL
//   POST   /api/media/:id/confirm         — confirm client upload done
//   GET    /api/media/:id                 — fetch DTO with variants
//   DELETE /api/media/:id                 — owner / DPDP delete
//
// Each handler is a thin pass-through to media.service — no business
// logic here. Routes own validation, authentication, and response
// shaping; the service owns state transitions, access control, and
// provider orchestration. Same separation as consultation.router.ts.
//
// Pattern: Stripe API surface — routes are dumb HTTP adapters.
// ═══════════════════════════════════════════════════════════════

import { Router, type Request, type Response, type NextFunction } from 'express';

import { requireUser } from '../middleware/auth.js';
import { validate, validateParams } from '../middleware/validate.js';
import { logger } from '../lib/logger.js';

// Task #53.5 W2: runtime zod schemas now live on the /validators
// subpath — the root barrel exports them as TYPES only (client
// bundle diet; see packages/shared/src/index.ts).
import {
  requestUploadIntentSchema,
  confirmUploadSchema,
  deleteMediaSchema,
  mediaIdParamSchema,
  type RequestUploadIntentBody,
  type ConfirmUploadBody,
  type DeleteMediaBody,
  type MediaIdParam,
} from '@repo/shared/validators';

import {
  requestUploadIntent,
  confirmUpload,
  getMediaAsset,
  deleteMedia,
} from '../services/media/index.js';

export const mediaRouter = Router();

/** Pull client IP + UA for audit log fields. Same helper shape used in
 *  auth.router.ts — keeps audit metadata consistent across surfaces. */
function reqMeta(req: Request): { ip: string; userAgent: string | undefined } {
  return {
    ip:
      (req.headers['cf-connecting-ip'] as string | undefined) ??
      (req.headers['x-real-ip'] as string | undefined) ??
      req.ip ??
      'unknown',
    userAgent: req.headers['user-agent'],
  };
}

// ─── POST /api/media/upload-intent ─────────────────────────────

mediaRouter.post(
  '/media/upload-intent',
  requireUser,
  validate(requestUploadIntentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uploaderId = req.auth!.sub;
      const body = req.body as RequestUploadIntentBody;

      const result = await requestUploadIntent({
        uploaderId,
        kind: body.kind,
        entityId: body.entityId,
        mimeType: body.mimeType,
        sizeBytes: body.sizeBytes,
        originalFilename: body.originalFilename,
        consentLogId: body.consentLogId,
      });

      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/media/:id/confirm ───────────────────────────────

mediaRouter.post(
  '/media/:id/confirm',
  requireUser,
  validateParams(mediaIdParamSchema),
  validate(confirmUploadSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const uploaderId = req.auth!.sub;
      const { id: mediaId } = req.params as unknown as MediaIdParam;
      const body = req.body as ConfirmUploadBody;

      const dto = await confirmUpload({
        mediaId,
        uploaderId,
        finalSizeBytes: body.finalSizeBytes,
        width: body.width,
        height: body.height,
        blurhash: body.blurhash as unknown as never, // already validated as branded Blurhash
        sha256: body.sha256,
      });

      res.json({ success: true, data: dto });
    } catch (err) {
      next(err);
    }
  },
);

// ─── GET /api/media/:id ────────────────────────────────────────
//
// Auth is OPTIONAL — public-kind assets resolve without a Bearer
// token. The service layer enforces access control per `accessClass`.
// We attempt auth opportunistically: if a token is present we attach
// `req.auth`; if absent, requesterId stays undefined and the service
// will allow only public kinds.

mediaRouter.get(
  '/media/:id',
  validateParams(mediaIdParamSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: mediaId } = req.params as unknown as MediaIdParam;

      // Lazy auth — try requireUser semantics if a token is present;
      // missing token is fine for public assets, the service decides.
      let requesterId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        try {
          // Late-import to avoid circular dependency on auth middleware.
          const { JwtService } = await import('../services/auth/jwt.service.js');
          const token = authHeader.slice(7);
          const decoded = JwtService.verifyAccessToken(token);
          requesterId = decoded.sub;
        } catch {
          // Bad/expired token on a GET should not fail public assets.
          // We log it for observability but continue as anonymous.
          logger.debug('[Media] anonymous read despite bearer token', {
            mediaId,
            reason: 'token-verify-failed',
          });
        }
      }

      const dto = await getMediaAsset(mediaId, { requesterId });
      res.json({ success: true, data: dto });
    } catch (err) {
      next(err);
    }
  },
);

// ─── DELETE /api/media/:id ─────────────────────────────────────

mediaRouter.delete(
  '/media/:id',
  requireUser,
  validateParams(mediaIdParamSchema),
  validate(deleteMediaSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requesterId = req.auth!.sub;
      const { id: mediaId } = req.params as unknown as MediaIdParam;
      const body = req.body as DeleteMediaBody;
      const meta = reqMeta(req);

      await deleteMedia({
        mediaId,
        requesterId,
        reason: body.reason,
        hardPurge: body.hardPurge,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      });

      res.json({ success: true, data: { id: mediaId, deleted: true } });
    } catch (err) {
      next(err);
    }
  },
);
