// ═══════════════════════════════════════════════════════════════
// MEDIA CONSTANTS — Task #46 runtime configuration
//
// Per-MediaKind policies: bucket routing, MIME whitelist, size limits,
// dimensions, retention defaults, variant rules, capture-guidance i18n keys.
//
// Both API (validation, signed-URL constraints, retention cron) and FE
// (client-side validation, capture UI, optimised-image sizes) import here.
// Changing a number here propagates to every consumer automatically.
//
// Source-of-truth values (do NOT inline literals elsewhere):
//   - 1568px = Claude Vision's internal resize target (longest edge)
//   - q92    = medical-imaging-grade JPEG quality (per BDS calibration)
//   - 1.5 MB = hard ceiling on encoded output bytes
//
// @see packages/shared/src/types/media.ts — type definitions
// ═══════════════════════════════════════════════════════════════

import type { MediaKind, MediaAccessClass, MediaVariant } from '../types/media';

// ─── Global resize targets ─────────────────────────────────────

/**
 * Longest-edge pixel target after client-side resize.
 *
 * Anthropic's Vision API internally resizes inputs to ~1568 longest-edge
 * before processing. Sending anything larger wastes upload bandwidth and
 * AI token cost with zero diagnostic benefit. Calibrated against dental
 * golden cases — preserves caries (≥3px), white-spot lesions (≥8px) and
 * pit-and-fissure detection.
 */
export const RESIZE_TARGET_PX = 1568 as const;

/**
 * JPEG output quality for encoded blobs. q92 is the FDA-tier "visually
 * lossless" threshold used by Practo / Apollo for clinical imaging.
 * q85 starts to show measurable degradation in caries detection tests.
 */
export const JPEG_QUALITY = 92 as const;

/**
 * Hard ceiling on the final encoded blob — anything larger is rejected
 * before the R2 signed-URL is even minted (client + server enforce).
 * Real-world dental photos at 1568px / q92 land at ~500–900 KB.
 */
export const MAX_OUTPUT_BYTES = 1_500_000 as const; // 1.5 MB

/**
 * Soft target the resize pipeline aims for. The worker may downscale
 * further if a kind's `targetBytes` is lower.
 */
export const TARGET_OUTPUT_BYTES = 800_000 as const; // 800 KB

/**
 * Default TTL for R2 presigned PUT URLs handed to the client. 5 minutes
 * is industry-standard (AWS, Stripe). Long enough for slow rural 3G,
 * short enough to make replay attacks economically uninteresting.
 */
export const SIGNED_UPLOAD_TTL_SECONDS = 300 as const;

/**
 * TTL for short-lived signed READ URLs on private clinical assets.
 * Renewed on every fetch — never long-lived.
 */
export const SIGNED_READ_TTL_SECONDS = 300 as const;

// ─── MIME whitelist (input — what we ACCEPT from clients) ──────

/**
 * MIME types accepted at the upload boundary. HEIC/HEIF are accepted
 * but transparently converted to JPEG inside the client Web Worker
 * (libheif-js WASM, lazy-loaded). After conversion the server only
 * ever sees jpeg / png / webp.
 */
export const INPUT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const;

export type InputMimeType = (typeof INPUT_MIME_TYPES)[number];

/** Tightened whitelist for the OUTPUT blob (after client-side encode). */
export const OUTPUT_MIME_TYPES = ['image/jpeg', 'image/webp'] as const;
export type OutputMimeType = (typeof OUTPUT_MIME_TYPES)[number];

// ─── Magic-byte signatures (file-type detection) ───────────────

/**
 * Signature table mapping a MIME type → array of byte patterns at fixed
 * offsets. Used by both the browser pre-flight (`apps/web/lib/media/magic-bytes.ts`)
 * and the server worker (defensive re-check) to refuse non-image bytes
 * regardless of the file extension claimed by the OS.
 *
 * `bytes` is interpreted as: at `offset`, the buffer must contain
 * exactly these byte values. `null` matches any byte (don't-care).
 */
export interface MagicByteSignature {
  readonly offset: number;
  readonly bytes: ReadonlyArray<number | null>;
}

export const MAGIC_BYTES: Readonly<Record<InputMimeType, readonly MagicByteSignature[]>> = {
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  'image/png': [
    {
      offset: 0,
      bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    },
  ],
  'image/webp': [
    // 'RIFF' .... 'WEBP'
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  ],
  'image/heic': [
    // ftyp box at offset 4, brand 'heic' / 'heix' / 'mif1' acceptable
    { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },
  ],
  'image/heif': [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],
} as const;

/**
 * Signatures we use to *recognise and reject* common non-image files
 * with a friendly redirect message instead of a generic "upload failed".
 */
export const NON_IMAGE_SIGNATURES = {
  // 'ftyp' + brand 'mp4'/'isom'/'qt  ' → video
  video: { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] as const },
  // PK\x03\x04 — ZIP family (incl. office docs)
  zip: { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] as const },
  // MZ — Windows executable
  exe: { offset: 0, bytes: [0x4d, 0x5a] as const },
  // %PDF
  pdf: { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] as const },
} as const;

// ─── MediaKind configuration ───────────────────────────────────

export interface MediaKindConfig {
  /** Private bucket (signed URLs, audit) vs public bucket (CDN, SEO). */
  readonly accessClass: MediaAccessClass;
  /** R2 key prefix — first segment of the storage key. */
  readonly r2KeyPrefix: string;
  /** Whitelist of input MIME types for THIS kind. */
  readonly allowedInputMimes: readonly InputMimeType[];
  /** Maximum bytes accepted by R2 (raw upload PUT). */
  readonly maxRawBytes: number;
  /** Maximum bytes for the encoded output (post client-side resize). */
  readonly maxOutputBytes: number;
  /**
   * Variant generation rule. `aspect-preserve` keeps the whole photo
   * (clinical safety — never crop a molar out). `face-crop` enables
   * Cloudflare Images face-gravity for avatars.
   */
  readonly variantStrategy: 'aspect-preserve' | 'face-crop';
  /** Default retention in days; `null` = forever. */
  readonly retentionDays: number | null;
  /** True if this kind is eligible to feed the AI-training pipeline. */
  readonly trainingEligibleByDefault: boolean;
  /** True if AI content-moderation must complete before READY. */
  readonly requiresModeration: boolean;
  /** Used by the orchestrator to enforce per-entity upload caps. */
  readonly limits: {
    readonly perEntityActive: number;
  };
  /** Display variant a UI should request by default. */
  readonly defaultVariant: MediaVariant;
}

/**
 * Authoritative per-kind config. Importing modules MUST go through
 * {@link getMediaKindConfig} — never `MEDIA_KIND_CONFIG[kind]` directly,
 * to keep the indirection refactor-safe.
 *
 * Retention defaults per DPDP-aligned policy (15 May 2026 lock):
 *   - Clinical PHI (consultation / Rx / user avatar): 7 years
 *   - Public marketing assets: forever
 *
 * `perEntityActive` enforced by `media.service.requestUploadIntent`.
 */
export const MEDIA_KIND_CONFIG: Readonly<Record<MediaKind, MediaKindConfig>> = {
  // ── PRIVATE — clinical PHI ───────────────────────────────────
  CONSULTATION_PHOTO: {
    accessClass: 'private',
    r2KeyPrefix: 'consultations',
    allowedInputMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    maxRawBytes: 30 * 1024 * 1024, // 30 MB raw cap (per "kbs to server" directive)
    maxOutputBytes: MAX_OUTPUT_BYTES,
    variantStrategy: 'aspect-preserve',
    retentionDays: 7 * 365,
    trainingEligibleByDefault: false, // only if ConsentLog.purpose contains DATA_TRAINING
    requiresModeration: true,
    limits: { perEntityActive: 5 },
    defaultVariant: 'MEDIUM',
  },
  PRESCRIPTION_DOC: {
    accessClass: 'private',
    r2KeyPrefix: 'prescriptions',
    allowedInputMimes: ['image/jpeg', 'image/png', 'image/webp'],
    maxRawBytes: 10 * 1024 * 1024,
    maxOutputBytes: MAX_OUTPUT_BYTES,
    variantStrategy: 'aspect-preserve',
    retentionDays: 7 * 365,
    trainingEligibleByDefault: false,
    requiresModeration: false,
    limits: { perEntityActive: 10 },
    defaultVariant: 'LARGE',
  },
  USER_AVATAR: {
    accessClass: 'private',
    r2KeyPrefix: 'users',
    allowedInputMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    maxRawBytes: 10 * 1024 * 1024,
    maxOutputBytes: MAX_OUTPUT_BYTES,
    variantStrategy: 'face-crop',
    retentionDays: 7 * 365,
    trainingEligibleByDefault: false,
    requiresModeration: true,
    limits: { perEntityActive: 1 },
    defaultVariant: 'THUMBNAIL',
  },
  // ── PUBLIC — marketing / content ─────────────────────────────
  CLINIC_COVER: {
    accessClass: 'public',
    r2KeyPrefix: 'clinics',
    allowedInputMimes: ['image/jpeg', 'image/png', 'image/webp'],
    maxRawBytes: 15 * 1024 * 1024,
    maxOutputBytes: MAX_OUTPUT_BYTES,
    variantStrategy: 'aspect-preserve',
    retentionDays: null,
    trainingEligibleByDefault: false,
    requiresModeration: true,
    limits: { perEntityActive: 1 },
    defaultVariant: 'LARGE',
  },
  CLINIC_GALLERY: {
    accessClass: 'public',
    r2KeyPrefix: 'clinics',
    allowedInputMimes: ['image/jpeg', 'image/png', 'image/webp'],
    maxRawBytes: 15 * 1024 * 1024,
    maxOutputBytes: MAX_OUTPUT_BYTES,
    variantStrategy: 'aspect-preserve',
    retentionDays: null,
    trainingEligibleByDefault: false,
    requiresModeration: true,
    limits: { perEntityActive: 20 },
    defaultVariant: 'MEDIUM',
  },
  DOCTOR_AVATAR: {
    accessClass: 'public',
    r2KeyPrefix: 'doctors',
    allowedInputMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    maxRawBytes: 10 * 1024 * 1024,
    maxOutputBytes: MAX_OUTPUT_BYTES,
    variantStrategy: 'face-crop',
    retentionDays: null,
    trainingEligibleByDefault: false,
    requiresModeration: true,
    limits: { perEntityActive: 1 },
    defaultVariant: 'THUMBNAIL',
  },
  BLOG_IMAGE: {
    accessClass: 'public',
    r2KeyPrefix: 'blog',
    allowedInputMimes: ['image/jpeg', 'image/png', 'image/webp'],
    maxRawBytes: 15 * 1024 * 1024,
    maxOutputBytes: MAX_OUTPUT_BYTES,
    variantStrategy: 'aspect-preserve',
    retentionDays: null,
    trainingEligibleByDefault: false,
    requiresModeration: false, // editorial review covers this
    limits: { perEntityActive: 100 }, // per article
    defaultVariant: 'LARGE',
  },
  OG_IMAGE: {
    accessClass: 'public',
    r2KeyPrefix: 'og',
    allowedInputMimes: ['image/jpeg', 'image/png', 'image/webp'],
    maxRawBytes: 5 * 1024 * 1024,
    maxOutputBytes: MAX_OUTPUT_BYTES,
    variantStrategy: 'aspect-preserve',
    retentionDays: null,
    trainingEligibleByDefault: false,
    requiresModeration: false,
    limits: { perEntityActive: 1 },
    defaultVariant: 'LARGE',
  },
  BRAND_ASSET: {
    accessClass: 'public',
    r2KeyPrefix: 'brand',
    allowedInputMimes: ['image/jpeg', 'image/png', 'image/webp'],
    maxRawBytes: 10 * 1024 * 1024,
    maxOutputBytes: MAX_OUTPUT_BYTES,
    variantStrategy: 'aspect-preserve',
    retentionDays: null,
    trainingEligibleByDefault: false,
    requiresModeration: false, // editorial-only assets
    limits: { perEntityActive: 1_000 },
    defaultVariant: 'LARGE',
  },
} as const;

/**
 * Safe accessor — throws on unknown {@link MediaKind} so refactors that
 * miss a case fail loudly at runtime instead of silently returning undefined.
 */
export function getMediaKindConfig(kind: MediaKind): MediaKindConfig {
  const cfg = MEDIA_KIND_CONFIG[kind];
  if (!cfg) {
    // Exhaustiveness guard — pattern reuses Task #44 lesson on `as` casts.
    throw new Error(`No MediaKindConfig registered for kind: ${kind}`);
  }
  return cfg;
}

// ─── Variant dimensions ────────────────────────────────────────

/**
 * Pixel widths CF Images is configured to render. Heights are derived
 * from the source aspect (because `variantStrategy === 'aspect-preserve'`),
 * except for `face-crop` avatars which square-crop at delivery time.
 *
 * MUST be kept in sync with the variant configuration in the Cloudflare
 * Images dashboard (`docs/runbooks/cloudflare-setup.md` documents the
 * exact dashboard steps).
 */
export const VARIANT_WIDTH_PX: Readonly<Record<MediaVariant, number>> = {
  THUMBNAIL: 200,
  MEDIUM: 640,
  LARGE: 1200,
  ORIGIN: RESIZE_TARGET_PX, // 1568 — only ever signed-URL accessed
} as const;

// ─── Capture-guidance i18n keys ────────────────────────────────

/**
 * Translation keys driving the in-uploader capture-guidance overlay
 * shown when `MediaKind === 'CONSULTATION_PHOTO'`. Improves diagnostic
 * yield far more than any compression tweak (see ADR-0006 §3).
 *
 * Frontend resolves via `next-intl`. See apps/web/messages/<locale>/media.json.
 */
export const CAPTURE_GUIDANCE_KEYS = {
  lighting: 'media.guidance.lighting',
  distance: 'media.guidance.distance',
  angle: 'media.guidance.angle',
  steadiness: 'media.guidance.steadiness',
  mouthOpen: 'media.guidance.mouthOpen',
} as const;
