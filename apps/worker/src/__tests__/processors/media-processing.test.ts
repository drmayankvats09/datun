// ═══════════════════════════════════════════════════════════════
// MEDIA PROCESSING WORKER TESTS — Task #46
//
// Unit tests for the BullMQ processor. We mock every external
// dependency hermetically — no real R2, no real Anthropic, no real
// Cloudflare, no real Postgres.
//
// FAANG-grade mocking discipline:
//   - S3 client is COMMAND-DISPATCH: it inspects the command instance
//     (Get / Put / Head / Delete) and returns an appropriate fake.
//     This handles the variable-length send() sequence (readFromR2 may
//     be followed by writeToR2's head+put when shouldRewriteOrigin
//     triggers, plus safeDeleteR2 on rejection paths). Order-based
//     mockResolvedValueOnce queues are brittle here — command dispatch
//     mirrors production semantics.
//
//   - sharp is a FACTORY: every sharp(buf) call returns a FRESH chain
//     instance. Production makes 3 distinct sharp() calls per happy
//     path (input probe, output verify, blurhash raw-pixel extract).
//     A single shared chain would leak state between them.
//
// Coverage:
//   - Happy path: UPLOADED → READY with cfImageId + variants persisted
//   - Magic-byte refusal: video/zip/unknown MIME → REJECTED + R2 delete
//   - Moderation REJECTED: row → REJECTED + R2 delete + processedAt set
//   - R2 origin missing: final attempt marks FAILED, non-final rethrows
//   - CF Images upload fails: throws (BullMQ retry)
//   - Idempotency: READY/REJECTED/FAILED rows → no-op
//   - DPDP race: row deleted between enqueue and consume → silent skip
//
// CRITICAL hoisting: Vitest hoists vi.mock() factories to file top.
// Any variable referenced inside a factory MUST be declared via
// vi.hoisted() — otherwise: ReferenceError at module load.
//
// Pattern: existing apps/worker/src/__tests__/processors/*.test.ts.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// HOISTED MOCKS — declared via vi.hoisted() so vi.mock() factories
// (which are themselves hoisted) can safely close over them.
// ═══════════════════════════════════════════════════════════════

const h = vi.hoisted(() => {
  // ── Prisma ─────────────────────────────────────────────────
  const mockPrisma = {
    mediaAsset: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  // ── AWS S3 SDK ─────────────────────────────────────────────
  //
  // Each command class is a thin tagged constructor — we identify
  // commands at dispatch time by an injected __op marker.
  class FakeNoSuchKey extends Error {
    override name = 'NoSuchKey';
  }
  class FakeNotFound extends Error {
    override name = 'NotFound';
  }

  // Per-test settable handlers. Tests refine via h.s3.set(...).
  // Defaults model the success case for each command type.
  const s3State = {
    getHandler: async (_cmd: unknown) => ({
      Body: { transformToByteArray: async () => new Uint8Array([0xff, 0xd8, 0xff]) },
    }),
    putHandler: async (_cmd: unknown) => ({}),
    headHandler: async (_cmd: unknown) => ({}),
    deleteHandler: async (_cmd: unknown) => ({}),
    sendCount: 0,
    sendLog: [] as Array<{ op: string; args: unknown }>,
  };

  const mockS3Send = vi.fn(async (cmd: { __op?: string }) => {
    s3State.sendCount += 1;
    s3State.sendLog.push({ op: cmd.__op ?? 'unknown', args: cmd });
    switch (cmd.__op) {
      case 'get':
        return s3State.getHandler(cmd);
      case 'put':
        return s3State.putHandler(cmd);
      case 'head':
        return s3State.headHandler(cmd);
      case 'delete':
        return s3State.deleteHandler(cmd);
      default:
        throw new Error(`Unmocked S3 op: ${String(cmd.__op)}`);
    }
  });

  // ── AWS presigner ──────────────────────────────────────────
  const mockGetSignedUrl = vi.fn().mockResolvedValue('https://r2.example/signed-origin-url');

  // ── sharp factory ──────────────────────────────────────────
  //
  // Each sharp(buf, ...) call constructs a NEW chain. Tests can
  // pre-seed inputs/outputs by pushing into the chain queues.
  type SharpChain = {
    rotate: ReturnType<typeof vi.fn>;
    withMetadata: ReturnType<typeof vi.fn>;
    resize: ReturnType<typeof vi.fn>;
    jpeg: ReturnType<typeof vi.fn>;
    raw: ReturnType<typeof vi.fn>;
    ensureAlpha: ReturnType<typeof vi.fn>;
    metadata: ReturnType<typeof vi.fn>;
    toBuffer: ReturnType<typeof vi.fn>;
  };

  // Tests register “next chain behaviour” per sharp() invocation.
  // sharpQueue is consumed FIFO — the i-th sharp() pops the i-th
  // recipe, defaulting to a benign clean chain if the queue is empty.
  type ChainRecipe = {
    metadata?: Record<string, unknown>;
    toBuffer?: unknown; // can be Buffer or {data, info} for resolveWithObject
    /** Optional second toBuffer call result (rare — only used for
     *  raw-pixel + meta combined chain). */
  };
  const sharpQueue: ChainRecipe[] = [];

  function buildChain(recipe?: ChainRecipe): SharpChain {
    const chain: SharpChain = {
      rotate: vi.fn(),
      withMetadata: vi.fn(),
      resize: vi.fn(),
      jpeg: vi.fn(),
      raw: vi.fn(),
      ensureAlpha: vi.fn(),
      metadata: vi.fn(),
      toBuffer: vi.fn(),
    };
    // Chainable fluent methods return the chain itself.
    chain.rotate.mockReturnValue(chain);
    chain.withMetadata.mockReturnValue(chain);
    chain.resize.mockReturnValue(chain);
    chain.jpeg.mockReturnValue(chain);
    chain.raw.mockReturnValue(chain);
    chain.ensureAlpha.mockReturnValue(chain);

    // Defaults — clean 1568×1045 JPEG, no EXIF.
    chain.metadata.mockResolvedValue(
      recipe?.metadata ?? { width: 1568, height: 1045, format: 'jpeg' as const },
    );
    chain.toBuffer.mockResolvedValue(recipe?.toBuffer ?? Buffer.from([0xff, 0xd8, 0xff, 0x00]));
    return chain;
  }

  const sharpFn = vi.fn((_input?: unknown, _opts?: unknown) => {
    const recipe = sharpQueue.shift();
    return buildChain(recipe);
  });

  // ── blurhash ───────────────────────────────────────────────
  const mockBlurhashEncode = vi.fn(() => 'L6PZfSi_.AyE_3t7t7R**0o#DgR4');

  // ── file-type magic byte detection ─────────────────────────
  const mockFileTypeFromBuffer = vi.fn();

  // ── axios (Anthropic moderation) ───────────────────────────
  const mockAxiosPost = vi.fn();

  // ── fetch (Cloudflare Images REST) ─────────────────────────
  const mockFetch = vi.fn();

  // ── Sentry / logger ────────────────────────────────────────
  const mockSentry = {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
  };
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };

  // ── env ────────────────────────────────────────────────────
  const mockEnv = {
    NODE_ENV: 'test',
    R2_ACCOUNT_ID: 'test-account',
    R2_ACCESS_KEY_ID: 'test-key',
    R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_BUCKET_PRIVATE: 'datun-media-test-private',
    R2_BUCKET_PUBLIC: 'datun-media-test-public',
    R2_PUBLIC_HOSTNAME: 'media.datunai.com',
    CLOUDFLARE_ACCOUNT_ID: 'cf-account-id',
    CLOUDFLARE_ACCOUNT_HASH: 'cf-account-hash',
    CLOUDFLARE_IMAGES_API_TOKEN: 'cf-token',
    ANTHROPIC_API_KEY: 'sk-ant-test',
    MEDIA_SIGNED_READ_TTL_SECONDS: 600,
  };

  return {
    mockPrisma,
    mockS3Send,
    s3State,
    FakeNoSuchKey,
    FakeNotFound,
    mockGetSignedUrl,
    sharpQueue,
    sharpFn,
    buildChain,
    mockBlurhashEncode,
    mockFileTypeFromBuffer,
    mockAxiosPost,
    mockFetch,
    mockSentry,
    mockLogger,
    mockEnv,
  };
});

// ═══════════════════════════════════════════════════════════════
// vi.mock() bindings — each factory references hoisted handles only.
// ═══════════════════════════════════════════════════════════════

vi.mock('@repo/db', () => ({
  prisma: h.mockPrisma,
  Prisma: { JsonNull: 'JSON_NULL_SENTINEL' },
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: h.mockS3Send })),
  GetObjectCommand: vi.fn().mockImplementation((args) => ({ __op: 'get', ...args })),
  PutObjectCommand: vi.fn().mockImplementation((args) => ({ __op: 'put', ...args })),
  HeadObjectCommand: vi.fn().mockImplementation((args) => ({ __op: 'head', ...args })),
  DeleteObjectCommand: vi.fn().mockImplementation((args) => ({ __op: 'delete', ...args })),
  NoSuchKey: h.FakeNoSuchKey,
  NotFound: h.FakeNotFound,
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: h.mockGetSignedUrl,
}));

vi.mock('sharp', () => ({
  default: h.sharpFn,
}));

vi.mock('blurhash', () => ({
  encode: h.mockBlurhashEncode,
}));

vi.mock('file-type', () => ({
  fileTypeFromBuffer: h.mockFileTypeFromBuffer,
}));

vi.mock('axios', () => ({
  default: { post: h.mockAxiosPost },
  post: h.mockAxiosPost,
}));

vi.stubGlobal('fetch', h.mockFetch);

vi.mock('../../config/env.js', () => ({ env: h.mockEnv }));
vi.mock('../../lib/sentry.js', () => ({ Sentry: h.mockSentry }));
vi.mock('../../lib/logger.js', () => ({ logger: h.mockLogger }));

// ═══════════════════════════════════════════════════════════════
// IMPORT UNDER TEST — must come AFTER all vi.mock() declarations
// ═══════════════════════════════════════════════════════════════

import { processMediaJob } from '../../processors/media-processing.processor.js';

// ═══════════════════════════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════════════════════════

function buildJob(mediaId = 'media-1', attempt = 0, maxAttempts = 3) {
  return {
    id: `media-proc:${mediaId}`,
    name: 'process-media',
    data: { mediaId, kind: 'CONSULTATION_PHOTO' as const },
    attemptsMade: attempt,
    opts: { attempts: maxAttempts },
  } as never;
}

const UPLOADED_ROW = {
  id: 'media-1',
  kind: 'CONSULTATION_PHOTO' as const,
  storageKey: 'consultations/cons-1/media-1.jpg',
  mimeType: 'image/jpeg',
  width: 1568,
  height: 1045,
  sizeBytes: 600_000,
  blurhash: null,
  status: 'UPLOADED' as const,
  moderationStatus: 'PENDING' as const,
  processedAt: null,
  processingError: null,
  cfImageId: null,
  variants: null,
  publicUrl: '',
};

const VALID_JPEG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
]);

const RAW_RGBA_32x32 = Buffer.from(new Uint8Array(32 * 32 * 4).fill(0xff));

// ─── Sharp recipe primers ─────────────────────────────────────
//
// Production code calls sharp() three times in the happy path:
//   1. sharp(input).metadata()           — input dims/EXIF probe
//      (same chain → .jpeg().toBuffer()  — re-encode)
//   2. sharp(outBuffer).metadata()       — final dims verify
//   3. sharp(buffer).resize()...raw()
//      .toBuffer({resolveWithObject})    — blurhash raw-pixel extract
//
// Each call pops the next recipe off h.sharpQueue.

function primeSharpHappyPath(opts: { hasExif?: boolean } = {}): void {
  // Call #1 — input probe + re-encode
  h.sharpQueue.push({
    metadata: opts.hasExif
      ? {
          width: 1568,
          height: 1045,
          format: 'jpeg',
          exif: Buffer.from([0xff, 0xe1, 0x00, 0x00]),
        }
      : { width: 1568, height: 1045, format: 'jpeg' },
    toBuffer: Buffer.from(VALID_JPEG_BYTES),
  });
  // Call #2 — final-dims verify on output buffer
  h.sharpQueue.push({
    metadata: { width: 1568, height: 1045, format: 'jpeg' },
  });
  // Call #3 — blurhash raw-pixel extract (resolveWithObject)
  h.sharpQueue.push({
    toBuffer: {
      data: RAW_RGBA_32x32,
      info: { width: 32, height: 32, channels: 4, size: RAW_RGBA_32x32.length },
    },
  });
}

// ─── R2 dispatch helpers ──────────────────────────────────────

function primeR2ReadBytes(bytes: Uint8Array = VALID_JPEG_BYTES): void {
  h.s3State.getHandler = async () => ({
    Body: { transformToByteArray: async () => bytes as Uint8Array<ArrayBuffer> },
  });
}

function primeR2ReadNotFound(): void {
  h.s3State.getHandler = async () => {
    throw new h.FakeNoSuchKey();
  };
}

function primeR2WriteOk(): void {
  // writeToR2 first sends Head (404 → fall back to private), then Put.
  h.s3State.headHandler = async () => ({});
  h.s3State.putHandler = async () => ({});
}

// ─── Anthropic moderation helpers ─────────────────────────────

function primeModerationApproved(): void {
  h.mockAxiosPost.mockResolvedValueOnce({
    data: {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'APPROVED',
            confidence: 0.95,
            reasoning: 'on-topic dental photo',
            category: 'dental',
          }),
        },
      ],
    },
  });
}

function primeModerationRejected(): void {
  h.mockAxiosPost.mockResolvedValueOnce({
    data: {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'REJECTED',
            confidence: 0.99,
            reasoning: 'off-topic / unrelated',
            category: 'off_topic',
          }),
        },
      ],
    },
  });
}

// ─── CF Images helpers ────────────────────────────────────────

function primeCfImagesUploadOk(): void {
  h.mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      result: {
        id: 'cf-img-id-xyz',
        variants: [
          'https://imagedelivery.net/hash/cf-img-id-xyz/thumbnail',
          'https://imagedelivery.net/hash/cf-img-id-xyz/medium',
          'https://imagedelivery.net/hash/cf-img-id-xyz/large',
        ],
      },
    }),
    text: async () => '',
  });
}

function primeCfImagesUploadFail(): void {
  h.mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 503,
    json: async () => ({
      success: false,
      errors: [{ message: 'service unavailable' }],
    }),
    text: async () => 'service unavailable',
  });
}

// ═══════════════════════════════════════════════════════════════
// Setup — reset all mocks + safe defaults per test
// ═══════════════════════════════════════════════════════════════

beforeEach(() => {
  vi.clearAllMocks();
  // Drain any leftover recipes from previous tests.
  h.sharpQueue.length = 0;
  // Reset S3 state.
  h.s3State.sendCount = 0;
  h.s3State.sendLog.length = 0;
  h.s3State.getHandler = async () => ({
    Body: { transformToByteArray: async () => VALID_JPEG_BYTES },
  });
  h.s3State.putHandler = async () => ({});
  h.s3State.headHandler = async () => ({});
  h.s3State.deleteHandler = async () => ({});
  // file-type default — clean JPEG.
  h.mockFileTypeFromBuffer.mockResolvedValue({ mime: 'image/jpeg', ext: 'jpg' });
  // mediaAsset.update resolves benignly.
  h.mockPrisma.mediaAsset.update.mockResolvedValue({});
});

// ═══════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════

describe('processMediaJob', () => {
  // ─── Happy path ───────────────────────────────────────────
  describe('happy path', () => {
    it('transitions UPLOADED → READY and persists variant URLs + cfImageId', async () => {
      h.mockPrisma.mediaAsset.findUnique.mockResolvedValue(UPLOADED_ROW);
      primeR2ReadBytes();
      primeSharpHappyPath({ hasExif: false });
      primeModerationApproved();
      primeCfImagesUploadOk();

      const result = await processMediaJob(buildJob());

      expect(result.status).toBe('READY');

      const updateCalls = h.mockPrisma.mediaAsset.update.mock.calls;

      // PROCESSING transition.
      const processingUpdate = updateCalls.find((c) => {
        const data = (c[0] as { data?: Record<string, unknown> })?.data;
        return data?.status === 'PROCESSING';
      });
      expect(processingUpdate).toBeDefined();

      // READY final update — cfImageId + blurhash + moderation persisted.
      const readyUpdate = updateCalls.find((c) => {
        const data = (c[0] as { data?: Record<string, unknown> })?.data;
        return data?.status === 'READY';
      });
      expect(readyUpdate).toBeDefined();

      const readyData = (readyUpdate![0] as { data: Record<string, unknown> }).data;
      expect(readyData.cfImageId).toBe('cf-img-id-xyz');
      expect(readyData.blurhash).toBe('L6PZfSi_.AyE_3t7t7R**0o#DgR4');
      expect(readyData.moderationStatus).toBe('APPROVED');
      // Hardened processor always strips metadata (.withMetadata({})) and
      // verifies the output is PHI-free before persisting. So exifStripped
      // is the GUARANTEE the worker emitted clean bytes, NOT whether the
      // input happened to carry EXIF. DPDP audit-defensible — see ADR-0006 §4.4.
      expect(readyData.exifStripped).toBe(true);
    });

    it('rewrites R2 origin when input had EXIF (PHI cleanup)', async () => {
      h.mockPrisma.mediaAsset.findUnique.mockResolvedValue(UPLOADED_ROW);
      primeR2ReadBytes();
      primeSharpHappyPath({ hasExif: true }); // input has EXIF
      primeR2WriteOk(); // shouldRewriteOrigin → Head + Put
      primeModerationApproved();
      primeCfImagesUploadOk();

      const result = await processMediaJob(buildJob());
      expect(result.status).toBe('READY');

      // Confirm we issued a PutObject to overwrite the origin.
      const puts = h.s3State.sendLog.filter((e) => e.op === 'put');
      expect(puts.length).toBeGreaterThanOrEqual(1);

      const updateCalls = h.mockPrisma.mediaAsset.update.mock.calls;
      const readyUpdate = updateCalls.find((c) => {
        const data = (c[0] as { data?: Record<string, unknown> })?.data;
        return data?.status === 'READY';
      });
      expect(readyUpdate).toBeDefined();
      const readyData = (readyUpdate![0] as { data: Record<string, unknown> }).data;
      expect(readyData.exifStripped).toBe(true); // hadExif true path
    });
  });

  // ─── Magic-byte refusal ───────────────────────────────────
  describe('magic-byte refusal', () => {
    it('REJECTS + deletes from R2 when bytes look like video', async () => {
      h.mockPrisma.mediaAsset.findUnique.mockResolvedValue(UPLOADED_ROW);
      primeR2ReadBytes();
      h.mockFileTypeFromBuffer.mockResolvedValueOnce({ mime: 'video/mp4', ext: 'mp4' });

      const result = await processMediaJob(buildJob());
      expect(result.status).toBe('REJECTED');

      // Two deletes — private + public bucket cascade.
      const deletes = h.s3State.sendLog.filter((e) => e.op === 'delete');
      expect(deletes.length).toBe(2);

      const rejectedUpdate = h.mockPrisma.mediaAsset.update.mock.calls.find((c) => {
        const data = (c[0] as { data?: Record<string, unknown> })?.data;
        return data?.status === 'REJECTED';
      });
      expect(rejectedUpdate).toBeDefined();
    });

    it('REJECTS when bytes do not match any allowed image MIME', async () => {
      h.mockPrisma.mediaAsset.findUnique.mockResolvedValue(UPLOADED_ROW);
      primeR2ReadBytes();
      h.mockFileTypeFromBuffer.mockResolvedValueOnce({ mime: 'application/zip', ext: 'zip' });

      const result = await processMediaJob(buildJob());
      expect(result.status).toBe('REJECTED');
    });

    it('REJECTS when file-type cannot identify the bytes at all', async () => {
      h.mockPrisma.mediaAsset.findUnique.mockResolvedValue(UPLOADED_ROW);
      primeR2ReadBytes();
      h.mockFileTypeFromBuffer.mockResolvedValueOnce(undefined);

      const result = await processMediaJob(buildJob());
      expect(result.status).toBe('REJECTED');
    });
  });

  // ─── AI moderation ────────────────────────────────────────
  describe('moderation REJECTED', () => {
    it('marks REJECTED + deletes from R2 origin + sets processedAt', async () => {
      h.mockPrisma.mediaAsset.findUnique.mockResolvedValue(UPLOADED_ROW);
      primeR2ReadBytes();
      // Clean input — no rewrite path triggered → no Head/Put needed.
      primeSharpHappyPath({ hasExif: false });
      primeModerationRejected();

      const result = await processMediaJob(buildJob());
      expect(result.status).toBe('REJECTED');

      const rejectedUpdate = h.mockPrisma.mediaAsset.update.mock.calls.find((c) => {
        const data = (c[0] as { data?: Record<string, unknown> })?.data;
        return data?.status === 'REJECTED' && data?.processedAt;
      });
      expect(rejectedUpdate).toBeDefined();

      // R2 delete cascade fired (private + public).
      const deletes = h.s3State.sendLog.filter((e) => e.op === 'delete');
      expect(deletes.length).toBe(2);

      // CF Images upload MUST NOT have been attempted.
      expect(h.mockFetch).not.toHaveBeenCalled();
    });
  });

  // ─── R2 origin missing ────────────────────────────────────
  describe('R2 origin missing', () => {
    it('marks FAILED with processingError on final attempt + rethrows', async () => {
      h.mockPrisma.mediaAsset.findUnique.mockResolvedValue(UPLOADED_ROW);
      primeR2ReadNotFound(); // BOTH buckets fail with NoSuchKey

      // attempt 2 of 3 = final → MUST mark FAILED before rethrowing.
      await expect(processMediaJob(buildJob('media-1', 2, 3))).rejects.toBeDefined();

      const failedUpdate = h.mockPrisma.mediaAsset.update.mock.calls.find((c) => {
        const data = (c[0] as { data?: Record<string, unknown> })?.data;
        return data?.status === 'FAILED' && typeof data?.processingError === 'string';
      });
      expect(failedUpdate).toBeDefined();
    });

    it('rethrows WITHOUT terminal marking on non-final attempt (BullMQ retry)', async () => {
      h.mockPrisma.mediaAsset.findUnique.mockResolvedValue(UPLOADED_ROW);
      primeR2ReadNotFound();

      // attempt 0 of 3 → transient, must NOT mark FAILED.
      await expect(processMediaJob(buildJob('media-1', 0, 3))).rejects.toBeDefined();

      const failedUpdate = h.mockPrisma.mediaAsset.update.mock.calls.find((c) => {
        const data = (c[0] as { data?: Record<string, unknown> })?.data;
        return data?.status === 'FAILED';
      });
      expect(failedUpdate).toBeUndefined();
    });
  });

  // ─── Cloudflare Images failure ────────────────────────────
  describe('CF Images upload failure', () => {
    it('rethrows for BullMQ retry on non-final attempt', async () => {
      h.mockPrisma.mediaAsset.findUnique.mockResolvedValue(UPLOADED_ROW);
      primeR2ReadBytes();
      primeSharpHappyPath({ hasExif: false });
      primeModerationApproved();
      primeCfImagesUploadFail();

      await expect(processMediaJob(buildJob('media-1', 0, 3))).rejects.toBeDefined();

      // No READY update happened.
      const readyUpdate = h.mockPrisma.mediaAsset.update.mock.calls.find((c) => {
        const data = (c[0] as { data?: Record<string, unknown> })?.data;
        return data?.status === 'READY';
      });
      expect(readyUpdate).toBeUndefined();
    });
  });

  // ─── Idempotency ──────────────────────────────────────────
  describe('idempotency', () => {
    it('no-ops when row already in READY status', async () => {
      h.mockPrisma.mediaAsset.findUnique.mockResolvedValue({
        ...UPLOADED_ROW,
        status: 'READY' as const,
        processedAt: new Date('2026-05-15'),
      });

      const result = await processMediaJob(buildJob());
      expect(result.status).toBe('READY');

      // Zero side effects.
      expect(h.s3State.sendCount).toBe(0);
      expect(h.mockFetch).not.toHaveBeenCalled();
      expect(h.mockAxiosPost).not.toHaveBeenCalled();
      expect(h.mockPrisma.mediaAsset.update).not.toHaveBeenCalled();
    });

    it('no-ops when row was REJECTED earlier', async () => {
      h.mockPrisma.mediaAsset.findUnique.mockResolvedValue({
        ...UPLOADED_ROW,
        status: 'REJECTED' as const,
      });
      const result = await processMediaJob(buildJob());
      expect(result.status).toBe('REJECTED');
      expect(h.mockPrisma.mediaAsset.update).not.toHaveBeenCalled();
    });

    it('no-ops when row was FAILED earlier', async () => {
      h.mockPrisma.mediaAsset.findUnique.mockResolvedValue({
        ...UPLOADED_ROW,
        status: 'FAILED' as const,
      });
      const result = await processMediaJob(buildJob());
      expect(result.status).toBe('FAILED');
      expect(h.mockPrisma.mediaAsset.update).not.toHaveBeenCalled();
    });

    it('returns SKIPPED silently when row was hard-deleted before consume (DPDP race)', async () => {
      h.mockPrisma.mediaAsset.findUnique.mockResolvedValue(null);
      const result = await processMediaJob(buildJob());
      expect(result.status).toBe('SKIPPED');
      expect(h.mockPrisma.mediaAsset.update).not.toHaveBeenCalled();
    });
  });
});
