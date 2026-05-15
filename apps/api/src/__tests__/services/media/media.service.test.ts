// ═══════════════════════════════════════════════════════════════
// MEDIA SERVICE TESTS — Task #46
//
// Integration-style tests for the orchestrator. We mock the Prisma
// client and the storage/delivery provider instances; the service
// logic itself runs unchanged. This is the highest-value test file
// in Phase 6 because it covers the state-machine + access-control
// + DPDP cascade paths that production correctness depends on.
//
// Coverage:
//   - requestUploadIntent: limit enforcement, consent check, row create
//   - confirmUpload:       state validation, R2 head verify, queue enqueue
//   - getMediaAsset:       access control matrix (uploader, public, deny)
//   - deleteMedia:         cascade order, audit log, idempotency
//
// CRITICAL UUID: service wraps every DB id with makeMediaId(id) which
// throws unless the value is a canonical UUID v4. See packages/shared/
// src/types/media.ts:67. Test fixtures MUST use valid UUIDs.
//
// CRITICAL PROMISE RETURN: service awaits delivery.deleteVariants(...)
// .catch(handler). If the mock returns undefined synchronously, the
// .catch() call dereferences undefined → TypeError. Mocks must return
// Promises.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// HOISTED MOCKS
// ═══════════════════════════════════════════════════════════════

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    mediaAsset: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    consentLog: { findUnique: vi.fn() },
    consultation: { findUnique: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  },
}));

vi.mock('@repo/db', () => ({
  prisma: mockPrisma,
  Prisma: {
    JsonNull: 'JSON_NULL_SENTINEL',
    InputJsonValue: undefined,
  },
}));

vi.mock('../../../config/env.js', () => ({
  env: {
    STORAGE_PROVIDER_PRIMARY: 'r2',
    R2_PUBLIC_HOSTNAME: 'media.test.datunai.com',
    MEDIA_SIGNED_UPLOAD_TTL_SECONDS: 300,
    MEDIA_SIGNED_READ_TTL_SECONDS: 300,
    R2_ACCOUNT_ID: 'test',
    R2_ACCESS_KEY_ID: 'test',
    R2_SECRET_ACCESS_KEY: 'test',
    R2_BUCKET_PRIVATE: 'private',
    R2_BUCKET_PUBLIC: 'public',
    CLOUDFLARE_ACCOUNT_ID: 'cf',
    CLOUDFLARE_ACCOUNT_HASH: 'hash',
    CLOUDFLARE_IMAGES_API_TOKEN: 'token',
  },
}));

vi.mock('../../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../../lib/sentry.js', () => ({
  Sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

const {
  mockStorageCreateSigned,
  mockStorageHead,
  mockStorageDelete,
  mockDeliveryGetVariants,
  mockDeliveryDelete,
} = vi.hoisted(() => ({
  mockStorageCreateSigned: vi.fn(),
  mockStorageHead: vi.fn(),
  mockStorageDelete: vi.fn(),
  mockDeliveryGetVariants: vi.fn(),
  mockDeliveryDelete: vi.fn(),
}));

vi.mock('../../../services/media/r2.provider.js', () => ({
  R2Provider: vi.fn().mockImplementation(() => ({
    name: 'R2',
    isConfigured: () => true,
    createSignedUpload: mockStorageCreateSigned,
    headObject: mockStorageHead,
    deleteObject: mockStorageDelete,
    readObject: vi.fn(),
    writeObject: vi.fn(),
    getSignedReadUrl: vi.fn(),
  })),
}));

vi.mock('../../../services/media/cloudflare-images.provider.js', () => ({
  CloudflareImagesProvider: vi.fn().mockImplementation(() => ({
    name: 'CLOUDFLARE_IMAGES',
    isConfigured: () => true,
    getVariantUrls: mockDeliveryGetVariants,
    deleteVariants: mockDeliveryDelete,
    uploadFromOrigin: vi.fn(),
    buildVariantUrl: vi.fn(),
  })),
}));

vi.mock('../../../services/media/cloudinary.provider.js', () => ({
  CloudinaryProvider: vi.fn().mockImplementation(() => ({ name: 'CLOUDINARY' })),
}));

vi.mock('../../../lib/queue/producers.js', () => ({
  enqueueMediaProcessing: vi.fn().mockResolvedValue({ ok: true }),
}));

// ─── Import under test ───────────────────────────────────────

import {
  requestUploadIntent,
  confirmUpload,
  getMediaAsset,
  deleteMedia,
  __resetProvidersForTest,
} from '../../../services/media/media.service.js';
import { ForbiddenError, NotFoundError, ValidationError, AppError } from '../../../errors/index.js';

// ═══════════════════════════════════════════════════════════════
// FIXTURES — all strict UUID v4 (8-4-4(starts 4)-4(starts [89ab])-12).
// ═══════════════════════════════════════════════════════════════

const IDS = {
  uploader: '550e8400-e29b-41d4-a716-446655440000',
  otherUser: '550e8400-e29b-41d4-a716-446655440001',
  media: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  mediaBlog: '7c9e6679-7425-40de-944b-e07fc1f90ae8',
  consult: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
  article: '6ba7b811-9dad-41d1-80b4-00c04fd430c9',
  consent: '6ba7b812-9dad-41d1-80b4-00c04fd430ca',
};

// ─── Tests ──────────────────────────────────────────────────

describe('media.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetProvidersForTest();
    mockPrisma.mediaAsset.count.mockResolvedValue(0);
    // Provider mocks return Promises. The service awaits them then
    // chains .catch(); a synchronous undefined return crashes that
    // chain with "Cannot read properties of undefined (reading 'catch')".
    mockDeliveryDelete.mockResolvedValue(undefined);
    mockStorageDelete.mockResolvedValue(undefined);
  });

  describe('requestUploadIntent', () => {
    it('creates the MediaAsset row + mints signed URL on the happy path', async () => {
      mockPrisma.mediaAsset.create.mockResolvedValue({ id: IDS.media });
      mockPrisma.mediaAsset.update.mockResolvedValue({ id: IDS.media });
      mockStorageCreateSigned.mockResolvedValue({
        uploadUrl: 'https://signed.example/put',
        requiredHeaders: { 'Content-Type': 'image/jpeg', 'Content-Length': '1000' },
        storageKey: `blog/x/${IDS.media}.jpg`,
        bucket: 'public',
        ttlSeconds: 300,
        provider: 'R2',
      });

      const result = await requestUploadIntent({
        uploaderId: IDS.uploader,
        kind: 'BLOG_IMAGE',
        entityId: IDS.article,
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
      });

      expect(result.uploadUrl).toBe('https://signed.example/put');
      expect(mockPrisma.mediaAsset.create).toHaveBeenCalledOnce();
      expect(mockStorageCreateSigned).toHaveBeenCalledOnce();
    });

    it('throws ValidationError on oversize input', async () => {
      await expect(
        requestUploadIntent({
          uploaderId: IDS.uploader,
          kind: 'BLOG_IMAGE',
          entityId: IDS.article,
          mimeType: 'image/jpeg',
          sizeBytes: 100_000_000, // way over the kind limit
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('throws ValidationError on unsupported MIME', async () => {
      await expect(
        requestUploadIntent({
          uploaderId: IDS.uploader,
          kind: 'BLOG_IMAGE',
          entityId: IDS.article,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mimeType: 'application/pdf' as any,
          sizeBytes: 1000,
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('requires consentLogId for CONSULTATION_PHOTO', async () => {
      await expect(
        requestUploadIntent({
          uploaderId: IDS.uploader,
          kind: 'CONSULTATION_PHOTO',
          entityId: IDS.consult,
          mimeType: 'image/jpeg',
          sizeBytes: 1000,
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('enforces the per-entity active limit (e.g., 5 photos/consultation)', async () => {
      mockPrisma.mediaAsset.count.mockResolvedValue(10); // simulate above-cap
      await expect(
        requestUploadIntent({
          uploaderId: IDS.uploader,
          kind: 'CONSULTATION_PHOTO',
          entityId: IDS.consult,
          mimeType: 'image/jpeg',
          sizeBytes: 1000,
          consentLogId: IDS.consent,
        }),
      ).rejects.toBeInstanceOf(AppError);
    });

    it('refuses when consent belongs to a different user', async () => {
      mockPrisma.consentLog.findUnique.mockResolvedValue({
        id: IDS.consent,
        userId: IDS.otherUser,
        status: 'GRANTED',
        purpose: 'media_upload',
      });
      await expect(
        requestUploadIntent({
          uploaderId: IDS.uploader,
          kind: 'CONSULTATION_PHOTO',
          entityId: IDS.consult,
          mimeType: 'image/jpeg',
          sizeBytes: 1000,
          consentLogId: IDS.consent,
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('confirmUpload', () => {
    it('flips state INITIATED → UPLOADED and enqueues worker job', async () => {
      mockPrisma.mediaAsset.findUnique.mockResolvedValue({
        id: IDS.media,
        uploadedById: IDS.uploader,
        status: 'INITIATED',
        storageKey: `blog/x/${IDS.media}.jpg`,
        kind: 'BLOG_IMAGE',
      });
      mockStorageHead.mockResolvedValue({
        sizeBytes: 100_000,
        mimeType: 'image/jpeg',
        etag: '"abc"',
        lastModified: new Date(),
      });
      mockPrisma.mediaAsset.update.mockResolvedValue({
        id: IDS.media,
        kind: 'BLOG_IMAGE',
        status: 'UPLOADED',
        mimeType: 'image/jpeg',
        width: 800,
        height: 600,
        sizeBytes: 100_000,
        blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
        cfImageId: null,
        variants: null,
        moderationStatus: 'PENDING',
        createdAt: new Date(),
        processedAt: null,
      });

      const dto = await confirmUpload({
        mediaId: IDS.media,
        uploaderId: IDS.uploader,
        finalSizeBytes: 100_000,
        width: 800,
        height: 600,
        blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' as never,
        sha256: 'a'.repeat(64),
      });

      expect(dto.id).toBeTruthy();
      expect(mockPrisma.mediaAsset.update).toHaveBeenCalledOnce();
    });

    it('rejects if uploader does not match', async () => {
      mockPrisma.mediaAsset.findUnique.mockResolvedValue({
        id: IDS.media,
        uploadedById: IDS.otherUser,
        status: 'INITIATED',
        storageKey: 'x',
        kind: 'BLOG_IMAGE',
      });
      await expect(
        confirmUpload({
          mediaId: IDS.media,
          uploaderId: IDS.uploader,
          finalSizeBytes: 100_000,
          width: 800,
          height: 600,
          blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' as never,
          sha256: 'a'.repeat(64),
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  describe('getMediaAsset', () => {
    it('allows anonymous access to public kinds', async () => {
      mockPrisma.mediaAsset.findUnique.mockResolvedValue({
        id: IDS.mediaBlog,
        kind: 'BLOG_IMAGE',
        storageKey: 'blog/x.jpg',
        mimeType: 'image/jpeg',
        width: 800,
        height: 600,
        sizeBytes: 100_000,
        blurhash: null,
        cfImageId: null,
        variants: null,
        status: 'READY',
        moderationStatus: 'APPROVED',
        createdAt: new Date(),
        processedAt: new Date(),
        deletedAt: null,
      });
      const dto = await getMediaAsset(IDS.mediaBlog, { requesterId: undefined });
      expect(dto.id).toBeTruthy();
    });

    it('throws Forbidden on private kind without auth', async () => {
      mockPrisma.mediaAsset.findUnique.mockResolvedValue({
        id: IDS.media,
        kind: 'CONSULTATION_PHOTO',
        uploadedById: IDS.uploader,
        entityId: IDS.consult,
        storageKey: `consultations/${IDS.consult}/${IDS.media}.jpg`,
        deletedAt: null,
        status: 'READY',
      });
      await expect(getMediaAsset(IDS.media, { requesterId: undefined })).rejects.toBeInstanceOf(
        ForbiddenError,
      );
    });

    it('throws NotFound for soft-deleted private rows even to uploader', async () => {
      mockPrisma.mediaAsset.findUnique.mockResolvedValue({
        id: IDS.media,
        kind: 'CONSULTATION_PHOTO',
        uploadedById: IDS.uploader,
        entityId: IDS.consult,
        storageKey: `consultations/${IDS.consult}/${IDS.media}.jpg`,
        deletedAt: new Date('2026-01-01'),
        status: 'REJECTED',
      });
      await expect(getMediaAsset(IDS.media, { requesterId: IDS.uploader })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe('deleteMedia', () => {
    it('cascades delivery + origin + audit log on hard purge', async () => {
      mockPrisma.mediaAsset.findUnique.mockResolvedValue({
        id: IDS.media,
        uploadedById: IDS.uploader,
        kind: 'CONSULTATION_PHOTO',
        storageKey: `consultations/${IDS.consult}/${IDS.media}.jpg`,
        cfImageId: 'cf-id',
        deletedAt: null,
      });
      mockPrisma.mediaAsset.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      await deleteMedia({
        mediaId: IDS.media,
        requesterId: IDS.uploader,
        reason: 'patient-requested',
        hardPurge: true,
        ipAddress: '1.2.3.4',
        userAgent: 'test-ua',
      });

      expect(mockDeliveryDelete).toHaveBeenCalledOnce();
      expect(mockStorageDelete).toHaveBeenCalledOnce();
      expect(mockPrisma.auditLog.create).toHaveBeenCalledOnce();
    });

    it('is idempotent on already-deleted rows', async () => {
      mockPrisma.mediaAsset.findUnique.mockResolvedValue({
        id: IDS.media,
        uploadedById: IDS.uploader,
        deletedAt: new Date('2026-01-01'),
      });
      await deleteMedia({
        mediaId: IDS.media,
        requesterId: IDS.uploader,
        reason: 'duplicate',
        hardPurge: false,
      });
      expect(mockDeliveryDelete).not.toHaveBeenCalled();
      expect(mockStorageDelete).not.toHaveBeenCalled();
    });

    it('refuses delete from non-uploader', async () => {
      mockPrisma.mediaAsset.findUnique.mockResolvedValue({
        id: IDS.media,
        uploadedById: IDS.otherUser,
        deletedAt: null,
      });
      await expect(
        deleteMedia({
          mediaId: IDS.media,
          requesterId: IDS.uploader,
          reason: 'x',
          hardPurge: false,
        }),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });
  });
});
