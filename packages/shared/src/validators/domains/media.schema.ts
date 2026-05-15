// ═══════════════════════════════════════════════════════════════
// MEDIA SCHEMAS — Task #46 Zod runtime validation
//
// Wire-level contracts for the /media/* routes. Mirror the TypeScript
// DTOs in packages/shared/src/types/media.ts at runtime.
//
// Used by:
//   - apps/api/src/routes/media.router.ts via the validate() middleware
//   - apps/web client hooks for parallel client-side validation
//   - calibration scripts to assert payload shape
//
// IMPORTANT: this file imports type-only definitions from `../../types/media`.
// The Zod schemas below are the runtime authority and must remain in lockstep
// with both the type definitions AND the Prisma enum (drift test enforces).
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import { stringIdField, uuidField } from '../primitives/index';
import { MEDIA_KINDS, MEDIA_VARIANTS, type MediaKind, type MediaVariant } from '../../types/media';
import { INPUT_MIME_TYPES, MAX_OUTPUT_BYTES } from '../../constants/media.constants';

// ─── Primitive field schemas ───────────────────────────────────

/**
 * MediaKind enum mirror. Constructed from the canonical {@link MEDIA_KINDS}
 * tuple so adding a new kind in one place keeps every consumer in sync.
 *
 * The double-cast (`unknown` → `[MediaKind, ...MediaKind[]]`) preserves the
 * literal MediaKind union in Zod's output type — without it, Zod would widen
 * to `string` and the strict `RequestUploadIntentArgs.kind: MediaKind` type
 * in `media.service.ts` would refuse to accept `body.kind`. Tuple-of-literals
 * is what Zod's `z.enum` overload requires for proper inference.
 */
export const mediaKindField = z.enum(
  MEDIA_KINDS as unknown as readonly [MediaKind, ...MediaKind[]],
);

/** MediaVariant enum mirror. Same literal-preserving cast as above. */
export const mediaVariantField = z.enum(
  MEDIA_VARIANTS as unknown as readonly [MediaVariant, ...MediaVariant[]],
);

/** Accepted input MIME types. */
export const inputMimeField = z.enum(INPUT_MIME_TYPES as readonly [string, ...string[]]);

/** Lower-case 64-hex SHA-256 digest. */
export const sha256Field = z
  .string()
  .regex(/^[0-9a-f]{64}$/, 'Must be a lower-case 64-character SHA-256 hex digest');

/** Blurhash — base83, typically 6–32 chars. */
export const blurhashField = z.string().min(6).max(64);

/** Pixel dimension — positive int, reasonable upper bound to reject garbage. */
export const pixelDimensionField = z.number().int().positive().max(16_384);

// ─── POST /media/upload-intent ─────────────────────────────────

/**
 * Body of `POST /media/upload-intent`. The client describes the file it
 * INTENDS to upload (kind, MIME, expected size, optional consent context),
 * and the server returns a presigned R2 URL + the new MediaAsset id.
 *
 * NOTE: `sizeBytes` here is the FINAL (post-client-resize) size the client
 * is about to PUT. R2 enforces this on its end via the signed URL — any
 * larger payload is refused by R2 itself (`x-amz-decoded-content-length`).
 */
export const requestUploadIntentSchema = z.object({
  kind: mediaKindField,
  mimeType: inputMimeField,
  sizeBytes: z.number().int().positive().max(MAX_OUTPUT_BYTES),
  /** Original filename ONLY for audit — never used for type decisions. */
  originalFilename: z.string().max(255).optional(),
  /**
   * Entity this upload attaches to (e.g., consultation UUID for
   * `CONSULTATION_PHOTO`, clinic UUID for `CLINIC_COVER`). Required for
   * every kind so we can enforce per-entity caps and access control.
   */
  entityId: stringIdField,
  /**
   * Optional ConsentLog row id giving DPDP-grade legal basis for the
   * upload. Required for `CONSULTATION_PHOTO` and `PRESCRIPTION_DOC`
   * — enforced by the service layer, not by Zod (router can't see DB).
   */
  consentLogId: uuidField.optional(),
});

export type RequestUploadIntentBody = z.infer<typeof requestUploadIntentSchema>;

// ─── POST /media/:id/confirm ───────────────────────────────────

/**
 * Body of `POST /media/:id/confirm`. Client reports back the metrics of
 * the blob it actually pushed to R2 (server still verifies on the worker).
 */
export const confirmUploadSchema = z.object({
  finalSizeBytes: z.number().int().positive().max(MAX_OUTPUT_BYTES),
  width: pixelDimensionField,
  height: pixelDimensionField,
  blurhash: blurhashField,
  sha256: sha256Field,
});

export type ConfirmUploadBody = z.infer<typeof confirmUploadSchema>;

// ─── GET /media/:id ────────────────────────────────────────────

/**
 * Query string for `GET /media/:id?variant=…`. The default variant per
 * kind is returned when omitted (see `MEDIA_KIND_CONFIG[kind].defaultVariant`).
 */
export const getMediaQuerySchema = z.object({
  variant: mediaVariantField.optional(),
});

export type GetMediaQuery = z.infer<typeof getMediaQuerySchema>;

// ─── DELETE /media/:id ─────────────────────────────────────────

/**
 * Body of `DELETE /media/:id`. Reason is stored on the AuditLog row.
 * `hardPurge` triggers immediate R2 + CF Images deletion (DPDP path).
 */
export const deleteMediaSchema = z.object({
  reason: z.string().min(3).max(500),
  hardPurge: z.boolean().default(false),
});

export type DeleteMediaBody = z.infer<typeof deleteMediaSchema>;

// ─── POST /media/:id/moderation/override (admin) ───────────────

/**
 * Admin override for the AI moderation outcome (used by the labeling UI).
 * Bypasses the auto-flag/reject when a doctor reviewer disagrees.
 */
export const moderationOverrideSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED']),
  note: z.string().min(3).max(1000),
});

export type ModerationOverrideBody = z.infer<typeof moderationOverrideSchema>;

// ─── Path param schemas ────────────────────────────────────────

export const mediaIdParamSchema = z.object({
  id: uuidField,
});

export type MediaIdParam = z.infer<typeof mediaIdParamSchema>;
