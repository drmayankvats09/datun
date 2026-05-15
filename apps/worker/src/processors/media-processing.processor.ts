// ═══════════════════════════════════════════════════════════════
// MEDIA PROCESSING PROCESSOR — Task #46
//
// BullMQ consumer for the media-processing queue. Runs the async
// pipeline a freshly-uploaded MediaAsset needs:
//
//   1. Load MediaAsset row (status: UPLOADED) → mark PROCESSING
//   2. Read raw bytes from R2 origin
//   3. Magic-byte verify (refuses video/zip/exe disguised as image)
//   4. Defensive sharp pass: EXIF strip + dimension probe + q92 re-encode
//   5. (Optional) Rewrite R2 origin with canonical bytes
//   6. Moderation via Claude Vision (per kind config)
//   7. Cloudflare Images upload (variant generation)
//   8. Mark READY + persist variant URLs + blurhash
//
// SELF-CONTAINED policy (FAANG monorepo principle — see
// judge-grading.processor.ts comment). Workers must not import
// apps/api/* directly. Underlying primitives (R2 SDK, sharp, file-type,
// Anthropic API, CF Images REST) are invoked inline here. Shared
// types/constants come from @repo/shared, Prisma from @repo/db.
//
// Idempotency: same mediaId → same jobId (enforced by producer).
// Re-run on a row already READY/REJECTED/FAILED is a no-op.
//
// Pattern: judge-grading.processor.ts — same self-contained shape.
// ═══════════════════════════════════════════════════════════════

import type { Job } from 'bullmq';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  NoSuchKey,
  NotFound,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { encode as encodeBlurhash } from 'blurhash';
import { fileTypeFromBuffer } from 'file-type';
import axios, { type AxiosError } from 'axios';

import { prisma, Prisma } from '@repo/db';
import {
  getMediaKindConfig,
  INPUT_MIME_TYPES,
  JPEG_QUALITY,
  MAX_OUTPUT_BYTES,
  MEDIA_ERROR_KEYS,
  RESIZE_TARGET_PX,
  SIGNED_READ_TTL_SECONDS,
  type MediaKind,
  type MediaProcessingJob,
} from '@repo/shared';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { Sentry } from '../lib/sentry.js';

// ─── R2 client (lazy singleton inside worker process) ──────────

let r2ClientSingleton: S3Client | null = null;

function getR2Client(): S3Client {
  if (r2ClientSingleton) return r2ClientSingleton;
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
    throw new Error('[MediaWorker] R2 credentials not configured');
  }
  r2ClientSingleton = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
  return r2ClientSingleton;
}

function isNotFoundError(err: unknown): boolean {
  if (err instanceof NoSuchKey || err instanceof NotFound) return true;
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === 'NoSuchKey' || e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404;
}

// ─── Main processor ───────────────────────────────────────────

/**
 * BullMQ job handler — invoked once per media-processing job. Receives
 * the job and resolves the rest of the context (kind, storageKey,
 * accessClass, consent) from the database itself.
 */
export async function processMediaJob(
  job: Job<MediaProcessingJob, { status: string }, string>,
): Promise<{ status: string }> {
  const { mediaId } = job.data;
  logger.info('[MediaWorker] job start', { mediaId, jobId: job.id });

  const row = await prisma.mediaAsset.findUnique({ where: { id: mediaId } });
  if (!row) {
    logger.warn('[MediaWorker] mediaId not found — likely deleted before processing', {
      mediaId,
    });
    return { status: 'SKIPPED' };
  }

  if (row.status === 'READY' || row.status === 'REJECTED' || row.status === 'FAILED') {
    logger.info('[MediaWorker] already terminal — skipping', {
      mediaId,
      status: row.status,
    });
    return { status: row.status };
  }

  await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: { status: 'PROCESSING' },
  });

  try {
    const kind = row.kind as MediaKind;
    const cfg = getMediaKindConfig(kind);

    // ── Step 1: Read origin bytes ────────────────────────────
    const bytes = await readFromR2(row.storageKey);

    // ── Step 2: Magic-byte verification ──────────────────────
    const detected = await fileTypeFromBuffer(bytes);
    if (!detected) {
      await markRejected(mediaId, MEDIA_ERROR_KEYS.cannotProcess, null);
      return { status: 'REJECTED' };
    }
    if (detected.mime.startsWith('video/')) {
      await markRejected(mediaId, MEDIA_ERROR_KEYS.looksLikeVideo, detected.mime);
      await safeDeleteR2(row.storageKey);
      return { status: 'REJECTED' };
    }
    if (!(INPUT_MIME_TYPES as readonly string[]).includes(detected.mime)) {
      await markRejected(mediaId, MEDIA_ERROR_KEYS.notAnImage, detected.mime);
      await safeDeleteR2(row.storageKey);
      return { status: 'REJECTED' };
    }

    // ── Step 3: Defensive sharp pass ─────────────────────────
    const processed = await defensiveImageHygiene(bytes, {
      claimedWidth: row.width ?? 0,
      claimedHeight: row.height ?? 0,
      maxOutputBytes: Math.max(MAX_OUTPUT_BYTES, cfg.maxOutputBytes),
    });

    if (processed.shouldRewriteOrigin) {
      await writeToR2(row.storageKey, processed.bytes, {
        mimeType: processed.mimeType,
        cacheControl:
          cfg.accessClass === 'public' ? 'public, max-age=31536000' : 'private, no-cache',
      });
    }

    // ── Step 4: Moderation (kind-gated) ──────────────────────
    let moderationStatus: 'APPROVED' | 'FLAGGED' | 'REJECTED' = 'APPROVED';
    let moderationScore = 1;
    let moderationFlags: Prisma.InputJsonValue =
      Prisma.JsonNull as unknown as Prisma.InputJsonValue;

    if (cfg.requiresModeration) {
      const moderation = await moderateImageInline({
        kind,
        imageBase64: processed.bytes.toString('base64'),
        mimeType: processed.mimeType,
      });
      moderationStatus = moderation.status;
      moderationScore = moderation.confidence;
      moderationFlags = {
        reasoning: moderation.reasoning,
        category: moderation.category,
        model: moderation.model,
      };
      if (moderation.status === 'REJECTED') {
        await safeDeleteR2(row.storageKey);
        await prisma.mediaAsset.update({
          where: { id: mediaId },
          data: {
            status: 'REJECTED',
            moderationStatus: 'REJECTED',
            moderationScore: moderation.confidence,
            moderationFlags,
            processedAt: new Date(),
          },
        });
        return { status: 'REJECTED' };
      }
    }

    // ── Step 5: Cloudflare Images upload (variant generation) ─
    const originUrl = await buildOriginUrlForCfImages({
      storageKey: row.storageKey,
      accessClass: cfg.accessClass,
    });
    const delivered = await uploadToCloudflareImages({
      mediaId,
      kind,
      originUrl,
      requireSignedDelivery: cfg.accessClass === 'private',
    });

    // ── Step 6: Persist READY state ──────────────────────────
    await prisma.mediaAsset.update({
      where: { id: mediaId },
      data: {
        status: 'READY',
        processedAt: new Date(),
        width: processed.width,
        height: processed.height,
        blurhash: processed.blurhash,
        exifStripped: processed.exifStripped,
        cfImageId: delivered.cfImageId,
        variants: delivered.variants as Prisma.InputJsonValue,
        moderationStatus,
        moderationScore,
        moderationFlags,
        scanStatus: 'CLEAN',
        publicUrl: delivered.variants.large ?? delivered.variants.medium ?? '',
      },
    });

    logger.info('[MediaWorker] job complete', { mediaId, jobId: job.id });
    return { status: 'READY' };
  } catch (err) {
    Sentry.captureException(err, {
      tags: { service: 'media-worker' },
      extra: { mediaId, jobId: job.id },
    });
    logger.error('[MediaWorker] job error', {
      mediaId,
      error: (err as Error).message,
    });

    // Mark FAILED on terminal errors; transient errors get retried by BullMQ.
    // We classify based on attempt count: if this is the final attempt, mark
    // FAILED so the DB row settles. Otherwise rethrow so BullMQ retries.
    const isFinalAttempt = (job.attemptsMade ?? 0) + 1 >= (job.opts.attempts ?? 1);
    if (isFinalAttempt) {
      await prisma.mediaAsset
        .update({
          where: { id: mediaId },
          data: {
            status: 'FAILED',
            processingError: (err as Error).message.slice(0, 500),
            processedAt: new Date(),
          },
        })
        .catch(() => undefined);
    }
    throw err;
  }
}

// ─── R2 helpers (inlined adapter — no apps/api import) ─────────

async function readFromR2(storageKey: string): Promise<Buffer> {
  const buckets = [env.R2_BUCKET_PRIVATE, env.R2_BUCKET_PUBLIC];
  const client = getR2Client();
  let lastErr: unknown;
  for (const bucket of buckets) {
    try {
      const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: storageKey }));
      const body = response.Body;
      if (!body) throw new Error('R2 returned empty body');
      const bytes = await (
        body as { transformToByteArray: () => Promise<Uint8Array> }
      ).transformToByteArray();
      return Buffer.from(bytes);
    } catch (err) {
      if (isNotFoundError(err)) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw new Error(
    `R2 object not found in any bucket: ${storageKey} (${(lastErr as Error)?.message ?? ''})`,
  );
}

async function writeToR2(
  storageKey: string,
  body: Buffer,
  options: { mimeType: string; cacheControl?: string },
): Promise<void> {
  const client = getR2Client();
  // Discover which bucket the object lives in (defensive against bucket
  // mismatch on reprocessing) — fall back to private bucket on no match.
  let bucket = env.R2_BUCKET_PRIVATE;
  for (const candidate of [env.R2_BUCKET_PRIVATE, env.R2_BUCKET_PUBLIC]) {
    try {
      await client.send(new HeadObjectCommand({ Bucket: candidate, Key: storageKey }));
      bucket = candidate;
      break;
    } catch (err) {
      if (!isNotFoundError(err)) throw err;
    }
  }
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: body,
      ContentType: options.mimeType,
      CacheControl: options.cacheControl,
    }),
  );
}

async function safeDeleteR2(storageKey: string): Promise<void> {
  const client = getR2Client();
  for (const bucket of [env.R2_BUCKET_PRIVATE, env.R2_BUCKET_PUBLIC]) {
    await client
      .send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey }))
      .catch(() => undefined);
  }
}

async function buildOriginUrlForCfImages(args: {
  storageKey: string;
  accessClass: 'private' | 'public';
}): Promise<string> {
  if (args.accessClass === 'public' && env.R2_PUBLIC_HOSTNAME) {
    return `https://${env.R2_PUBLIC_HOSTNAME}/${args.storageKey}`;
  }
  // Private bucket — signed read URL valid long enough for CF to fetch.
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_PRIVATE,
    Key: args.storageKey,
  });
  // S3Client → presigner type bridge. The two packages declare a private
  // `handlers` field separately, so TypeScript treats their Client interfaces
  // as nominally distinct even when the runtime instance is identical.
  // AWS SDK quirk: S3Client's nominal type differs from what getSignedUrl
  // expects, even after pnpm dedupe. Extract the exact expected type from
  // getSignedUrl's signature itself — no `any`, auto-tracks SDK changes.
  type PresignerClient = Parameters<typeof getSignedUrl>[0];
  return await getSignedUrl(client as unknown as PresignerClient, command, {
    expiresIn: Math.max(600, env.MEDIA_SIGNED_READ_TTL_SECONDS ?? SIGNED_READ_TTL_SECONDS),
  });
}

// ─── Sharp defensive hygiene ──────────────────────────────────

interface DefensiveOutput {
  shouldRewriteOrigin: boolean;
  bytes: Buffer;
  mimeType: string;
  width: number;
  height: number;
  exifStripped: boolean;
  blurhash: string;
}

async function defensiveImageHygiene(
  input: Buffer,
  options: { claimedWidth: number; claimedHeight: number; maxOutputBytes: number },
): Promise<DefensiveOutput> {
  let image = sharp(input, { failOn: 'error' });
  const metadata = await image.metadata();

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) throw new Error('Image metadata missing width/height');

  const widthMismatch = Math.abs(width - options.claimedWidth) > 2;
  const heightMismatch = Math.abs(height - options.claimedHeight) > 2;
  if (widthMismatch || heightMismatch) {
    Sentry.captureMessage('Media dimension mismatch (worker)', {
      level: 'warning',
      extra: {
        claimed: { w: options.claimedWidth, h: options.claimedHeight },
        actual: { w: width, h: height },
      },
    });
  }

  const longestEdge = Math.max(width, height);
  const needsResize = longestEdge > RESIZE_TARGET_PX;
  if (needsResize) {
    image = image.resize({
      width: width >= height ? RESIZE_TARGET_PX : undefined,
      height: height > width ? RESIZE_TARGET_PX : undefined,
      withoutEnlargement: true,
      fit: 'inside',
    });
  }

  // ── EXIF / PHI hygiene ──────────────────────────────────────
  //
  // DPDP-grade contract: every byte we write to R2 origin (and
  // therefore every byte CF Images later fetches) MUST be free of
  // GPS coordinates, camera serials, timestamps, and any XMP/IPTC
  // metadata blocks. The browser-side pipeline already strips most
  // of this, but we treat the client as untrusted — defense in depth.
  //
  // sharp's default `.toBuffer()` drops metadata unless `.withMetadata()`
  // is called explicitly. We make that intent unmistakable here AND
  // verify the output by re-parsing it: a non-empty exif/xmp/iptc on
  // the OUTPUT is a hard failure (we'd rather reject the upload than
  // ship PHI through the CDN).
  const inputHadMetadata = Boolean(metadata.exif || metadata.xmp || metadata.iptc || metadata.icc);

  const outBuffer = await image
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true, chromaSubsampling: '4:4:4' })
    // Empty withMetadata() = strip everything except orientation
    // (orientation is harmless display-rotation info; AI is
    // orientation-agnostic per ADR-0006 §4.3).
    .withMetadata({})
    .toBuffer();

  if (outBuffer.length > options.maxOutputBytes) {
    throw new Error(`Encoded output exceeds ceiling ${options.maxOutputBytes}`);
  }

  // ── Verify: output MUST be metadata-free ────────────────────
  const verifyMeta = await sharp(outBuffer).metadata();
  const outputHasPhi = Boolean(verifyMeta.exif || verifyMeta.xmp || verifyMeta.iptc);
  if (outputHasPhi) {
    // This is a contract violation — fail loudly so we never silently
    // ship PHI. Sentry will alert; the job will retry and ultimately
    // mark the row FAILED.
    Sentry.captureMessage('[MediaWorker] EXIF leak detected in output buffer', {
      level: 'error',
      extra: {
        inputHadMetadata,
        outputMetaKeys: Object.keys(verifyMeta).filter((k) => ['exif', 'xmp', 'iptc'].includes(k)),
      },
    });
    throw new Error('EXIF leak: output buffer still contains PHI metadata');
  }

  const blurhash = await computeBlurhash(outBuffer);

  return {
    // Rewrite origin if input had any metadata (PHI cleanup) OR if
    // we resized (canonical bytes for CF Images to fetch).
    shouldRewriteOrigin: inputHadMetadata || needsResize,
    bytes: outBuffer,
    mimeType: 'image/jpeg',
    width: verifyMeta.width ?? width,
    height: verifyMeta.height ?? height,
    // True semantic: we always emit metadata-free bytes, verified
    // post-encode. The field name is now accurate — the output IS
    // EXIF-stripped, regardless of input state.
    exifStripped: true,
    blurhash,
  };
}

async function computeBlurhash(buffer: Buffer): Promise<string> {
  const { data, info } = await sharp(buffer)
    .resize(32, 32, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  return encodeBlurhash(pixels, info.width, info.height, 4, 3);
}

// ─── Moderation (inline — calls Anthropic directly) ────────────

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODERATION_MODEL = 'claude-haiku-4-5-20251001';

interface ModerationOutcome {
  status: 'APPROVED' | 'FLAGGED' | 'REJECTED';
  confidence: number;
  reasoning: string;
  category: string | null;
  model: string;
}

async function moderateImageInline(args: {
  kind: MediaKind;
  imageBase64: string;
  mimeType: string;
}): Promise<ModerationOutcome> {
  const systemPrompt = buildModerationPrompt(args.kind);
  try {
    const response = await axios.post(
      ANTHROPIC_URL,
      {
        model: MODERATION_MODEL,
        max_tokens: 300,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: args.mimeType, data: args.imageBase64 },
              },
              { type: 'text', text: 'Classify per the system prompt. JSON only.' },
            ],
          },
        ],
      },
      {
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        timeout: 30_000,
      },
    );
    const text = (response.data?.content?.[0]?.text as string | undefined) ?? '';
    const parsed = parseModerationJson(text);
    return parsed
      ? { ...parsed, model: MODERATION_MODEL }
      : {
          status: 'FLAGGED',
          confidence: 0.5,
          reasoning: `Unparseable AI response: ${text.slice(0, 200)}`,
          category: 'parse_failure',
          model: MODERATION_MODEL,
        };
  } catch (err) {
    const axiosErr = err as AxiosError;
    logger.error('[MediaWorker] moderation call failed', {
      kind: args.kind,
      status: axiosErr.response?.status,
      error: (err as Error).message,
    });
    Sentry.captureException(err, { tags: { service: 'media-worker', op: 'moderation' } });
    return {
      status: 'FLAGGED',
      confidence: 0,
      reasoning: `AI moderation failure: ${(err as Error).message}`,
      category: 'ai_failure',
      model: MODERATION_MODEL,
    };
  }
}

function buildModerationPrompt(kind: MediaKind): string {
  switch (kind) {
    case 'CONSULTATION_PHOTO':
      return CLINICAL_PROMPT;
    case 'PRESCRIPTION_DOC':
      return RX_PROMPT;
    case 'USER_AVATAR':
    case 'DOCTOR_AVATAR':
      return AVATAR_PROMPT;
    case 'CLINIC_COVER':
    case 'CLINIC_GALLERY':
      return CLINIC_PROMPT;
    default:
      return GENERIC_PROMPT;
  }
}

const CLINICAL_PROMPT = `You are a content-safety classifier for a dental triage platform.
Expected subject matter: teeth, gums, oral cavity, dental X-ray, mouth area.
Classify into one of: APPROVED (dental/oral OK), FLAGGED (not dental, otherwise benign),
REJECTED (explicit/violent/abusive or appears to involve a minor inappropriately).
Respond with JSON only:
{ "status": "APPROVED"|"FLAGGED"|"REJECTED", "confidence": 0.0-1.0,
  "category": "dental"|"face_only"|"unrelated"|"screenshot"|"explicit"|"violence"|"other",
  "reasoning": "<one short sentence>" }`;

const RX_PROMPT = `You are a content-safety classifier for medical prescription documents.
Classify into: APPROVED (Rx, treatment plan, X-ray report, lab report), FLAGGED (other docs),
REJECTED (explicit/violent).
Respond with JSON only:
{ "status": "APPROVED"|"FLAGGED"|"REJECTED", "confidence": 0.0-1.0,
  "category": "rx"|"report"|"unrelated_document"|"non_document"|"explicit"|"other",
  "reasoning": "<one short sentence>" }`;

const AVATAR_PROMPT = `You are a content-safety classifier for profile avatars.
Classify into: APPROVED (appropriate person photo), FLAGGED (not a person — logo, scenery),
REJECTED (explicit/violent or appears to depict a minor inappropriately).
Respond with JSON only:
{ "status": "APPROVED"|"FLAGGED"|"REJECTED", "confidence": 0.0-1.0,
  "category": "person"|"logo"|"scenery"|"explicit"|"violence"|"other",
  "reasoning": "<one short sentence>" }`;

const CLINIC_PROMPT = `You are a content-safety classifier for partner clinic photos.
Classify into: APPROVED (interior/exterior/equipment/staff/signage), FLAGGED (unrelated or
prominent patient face), REJECTED (explicit/violent).
Respond with JSON only:
{ "status": "APPROVED"|"FLAGGED"|"REJECTED", "confidence": 0.0-1.0,
  "category": "interior"|"exterior"|"staff"|"equipment"|"patient_face"|"unrelated"|"explicit"|"other",
  "reasoning": "<one short sentence>" }`;

const GENERIC_PROMPT = `You are a content-safety classifier.
Classify into: APPROVED, FLAGGED (unclear/off-topic), REJECTED (explicit/violent).
Respond with JSON only:
{ "status": "APPROVED"|"FLAGGED"|"REJECTED", "confidence": 0.0-1.0,
  "category": "<one-word>", "reasoning": "<one short sentence>" }`;

interface ParsedModeration {
  status: 'APPROVED' | 'FLAGGED' | 'REJECTED';
  confidence: number;
  reasoning: string;
  category: string | null;
}

function parseModerationJson(text: string): ParsedModeration | null {
  const noFences = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim();
  let raw: unknown;
  try {
    raw = JSON.parse(noFences);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Record<string, unknown>;
  const statusUpper = String(obj.status ?? '').toUpperCase();
  if (statusUpper !== 'APPROVED' && statusUpper !== 'FLAGGED' && statusUpper !== 'REJECTED') {
    return null;
  }
  const conf = typeof obj.confidence === 'number' ? Math.max(0, Math.min(1, obj.confidence)) : 0.5;
  return {
    status: statusUpper as ParsedModeration['status'],
    confidence: conf,
    reasoning: typeof obj.reasoning === 'string' ? obj.reasoning.slice(0, 500) : '',
    category: typeof obj.category === 'string' ? obj.category.slice(0, 100) : null,
  };
}

// ─── Cloudflare Images upload (inline REST call) ───────────────

interface CfUploadResult {
  cfImageId: string;
  variants: Record<string, string>;
}

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
const CF_DELIVERY_HOST = 'imagedelivery.net';

async function uploadToCloudflareImages(args: {
  mediaId: string;
  kind: MediaKind;
  originUrl: string;
  requireSignedDelivery: boolean;
}): Promise<CfUploadResult> {
  if (
    !env.CLOUDFLARE_ACCOUNT_ID ||
    !env.CLOUDFLARE_ACCOUNT_HASH ||
    !env.CLOUDFLARE_IMAGES_API_TOKEN
  ) {
    throw new Error('[MediaWorker] Cloudflare Images not configured');
  }
  const url = `${CF_API_BASE}/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;
  const form = new FormData();
  form.append('url', args.originUrl);
  form.append('id', args.mediaId);
  form.append('requireSignedURLs', String(args.requireSignedDelivery));
  form.append(
    'metadata',
    JSON.stringify({
      kind: args.kind,
      mediaId: args.mediaId,
      uploadedAt: new Date().toISOString(),
    }),
  );

  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.CLOUDFLARE_IMAGES_API_TOKEN}` },
    // FormData is a valid runtime body for fetch in Node 22+. The
    // `BodyInit` DOM type isn't in scope (worker tsconfig lib = ES2022),
    // so we narrow through the parent `RequestInit['body']` shape which
    // IS in @types/node v20+. Zero `any`, zero DOM-lib pollution.
    body: form as unknown as RequestInit['body'],
  });

  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    errors?: Array<{ code: number; message: string }>;
    result?: { id: string };
  } | null;
  if (!response.ok || !payload?.success || !payload.result) {
    const summary = (payload?.errors ?? []).map((e) => `${e.code}: ${e.message}`).join('; ');
    throw new Error(`Cloudflare Images upload failed: ${summary || `HTTP ${response.status}`}`);
  }

  const cfImageId = payload.result.id;
  const accountHash = env.CLOUDFLARE_ACCOUNT_HASH;
  const variants: Record<string, string> = {
    thumbnail: `https://${CF_DELIVERY_HOST}/${accountHash}/${cfImageId}/thumbnail`,
    medium: `https://${CF_DELIVERY_HOST}/${accountHash}/${cfImageId}/medium`,
    large: `https://${CF_DELIVERY_HOST}/${accountHash}/${cfImageId}/large`,
  };
  return { cfImageId, variants };
}

// ─── DB helpers ───────────────────────────────────────────────

async function markRejected(
  mediaId: string,
  errorKey: string,
  detected: string | null,
): Promise<void> {
  await prisma.mediaAsset.update({
    where: { id: mediaId },
    data: {
      status: 'REJECTED',
      moderationStatus: 'REJECTED',
      moderationFlags: { errorKey, detected } as Prisma.InputJsonValue,
      processedAt: new Date(),
    },
  });
}
