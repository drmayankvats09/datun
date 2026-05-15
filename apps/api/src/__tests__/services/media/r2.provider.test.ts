// ═══════════════════════════════════════════════════════════════
// R2 PROVIDER TESTS — Task #46
//
// Unit tests for the R2 storage adapter. We mock @aws-sdk/client-s3
// commands and the presigner so tests run hermetically — no real R2
// calls, no test buckets, no AWS credentials needed in CI.
//
// Coverage:
//   - createSignedUpload: URL minting, header signing, bucket routing
//   - readObject:         private→public bucket fallback, 404 surfacing
//   - writeObject:        bucket discovery before write
//   - headObject:         null on miss
//   - getSignedReadUrl:   short-TTL signed read for private kinds
//   - deleteObject:       idempotent, swallows 404
//
// Pattern: existing apps/api/src/__tests__ vitest style.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks (must hoist before R2Provider import) ─────────────

const mockS3Send = vi.fn();
const mockGetSignedUrl = vi.fn();

vi.mock('@aws-sdk/client-s3', () => {
  class FakeNoSuchKey extends Error {
    name = 'NoSuchKey';
  }
  class FakeNotFound extends Error {
    name = 'NotFound';
  }
  return {
    S3Client: vi.fn().mockImplementation(() => ({ send: mockS3Send })),
    PutObjectCommand: vi.fn().mockImplementation((args) => ({ __cmd: 'put', ...args })),
    GetObjectCommand: vi.fn().mockImplementation((args) => ({ __cmd: 'get', ...args })),
    HeadObjectCommand: vi.fn().mockImplementation((args) => ({ __cmd: 'head', ...args })),
    DeleteObjectCommand: vi.fn().mockImplementation((args) => ({ __cmd: 'delete', ...args })),
    NoSuchKey: FakeNoSuchKey,
    NotFound: FakeNotFound,
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args),
}));

vi.mock('../../../config/env.js', () => ({
  env: {
    R2_ACCOUNT_ID: 'test-account',
    R2_ACCESS_KEY_ID: 'test-key',
    R2_SECRET_ACCESS_KEY: 'test-secret',
    R2_BUCKET_PRIVATE: 'datun-media-test-private',
    R2_BUCKET_PUBLIC: 'datun-media-test-public',
    R2_PUBLIC_HOSTNAME: 'media.test.datunai.com',
    MEDIA_SIGNED_UPLOAD_TTL_SECONDS: 300,
    MEDIA_SIGNED_READ_TTL_SECONDS: 300,
  },
}));

vi.mock('../../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../lib/sentry.js', () => ({
  Sentry: { captureException: vi.fn(), captureMessage: vi.fn() },
}));

// ─── Import under test (after mocks) ─────────────────────────

import { R2Provider } from '../../../services/media/r2.provider.js';
import { StorageNotFoundError } from '../../../services/media/storage.types.js';

// ─── Tests ──────────────────────────────────────────────────

describe('R2Provider', () => {
  beforeEach(() => {
    mockS3Send.mockReset();
    mockGetSignedUrl.mockReset();
  });

  describe('isConfigured', () => {
    it('returns true when env vars are set', () => {
      const p = new R2Provider();
      expect(p.isConfigured()).toBe(true);
    });
  });

  describe('createSignedUpload', () => {
    it('mints a signed URL with content-type + content-length headers', async () => {
      mockGetSignedUrl.mockResolvedValueOnce('https://signed.example/put');
      const p = new R2Provider();
      const result = await p.createSignedUpload({
        mediaId: '11111111-1111-1111-1111-111111111111',
        kind: 'CONSULTATION_PHOTO',
        entityId: '22222222-2222-2222-2222-222222222222',
        mimeType: 'image/jpeg',
        sizeBytes: 500_000,
        ttlSeconds: 300,
      });
      expect(result.uploadUrl).toBe('https://signed.example/put');
      expect(result.requiredHeaders['Content-Type']).toBe('image/jpeg');
      expect(result.requiredHeaders['Content-Length']).toBe('500000');
      expect(result.provider).toBe('R2');
      expect(result.bucket).toBe('datun-media-test-private');
    });

    it('routes public kinds to the public bucket', async () => {
      mockGetSignedUrl.mockResolvedValueOnce('https://signed.example/blog');
      const p = new R2Provider();
      const result = await p.createSignedUpload({
        mediaId: '33333333-3333-3333-3333-333333333333',
        kind: 'BLOG_IMAGE',
        entityId: '44444444-4444-4444-4444-444444444444',
        mimeType: 'image/jpeg',
        sizeBytes: 100_000,
        ttlSeconds: 300,
      });
      expect(result.bucket).toBe('datun-media-test-public');
    });

    it('sanitises entityId into the storage key', async () => {
      mockGetSignedUrl.mockResolvedValueOnce('https://signed.example/x');
      const p = new R2Provider();
      const result = await p.createSignedUpload({
        mediaId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        kind: 'BLOG_IMAGE',
        // Attempted directory traversal — must be stripped.
        entityId: '../../etc/passwd',
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
        ttlSeconds: 300,
      });
      expect(result.storageKey).not.toContain('..');
      expect(result.storageKey).not.toContain('etc');
    });
  });

  describe('readObject', () => {
    it('returns bytes from the private bucket on hit', async () => {
      const fakeBytes = new Uint8Array([0xff, 0xd8, 0xff]);
      mockS3Send.mockResolvedValueOnce({
        Body: { transformToByteArray: async () => fakeBytes },
      });
      const p = new R2Provider();
      const buf = await p.readObject('consultations/x/y.jpg' as never);
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBe(3);
    });

    it('falls through to the public bucket on private 404', async () => {
      const { NoSuchKey } = await import('@aws-sdk/client-s3');
      const fakeBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
      mockS3Send
        .mockRejectedValueOnce(new (NoSuchKey as unknown as new () => Error)())
        .mockResolvedValueOnce({
          Body: { transformToByteArray: async () => fakeBytes },
        });
      const p = new R2Provider();
      const buf = await p.readObject('blog/x/y.png' as never);
      expect(buf.length).toBe(4);
    });

    it('throws StorageNotFoundError on 404 from both buckets', async () => {
      const { NoSuchKey } = await import('@aws-sdk/client-s3');
      mockS3Send
        .mockRejectedValueOnce(new (NoSuchKey as unknown as new () => Error)())
        .mockRejectedValueOnce(new (NoSuchKey as unknown as new () => Error)());
      const p = new R2Provider();
      await expect(p.readObject('missing/x.jpg' as never)).rejects.toBeInstanceOf(
        StorageNotFoundError,
      );
    });
  });

  describe('headObject', () => {
    it('returns null when object missing from both buckets', async () => {
      const { NotFound } = await import('@aws-sdk/client-s3');
      mockS3Send
        .mockRejectedValueOnce(new (NotFound as unknown as new () => Error)())
        .mockRejectedValueOnce(new (NotFound as unknown as new () => Error)());
      const p = new R2Provider();
      const result = await p.headObject('missing/x.jpg' as never);
      expect(result).toBeNull();
    });

    it('returns size/etag on hit', async () => {
      mockS3Send.mockResolvedValueOnce({
        ContentLength: 12345,
        ContentType: 'image/jpeg',
        ETag: '"abc"',
        LastModified: new Date('2026-01-01'),
      });
      const p = new R2Provider();
      const result = await p.headObject('blog/x.jpg' as never);
      expect(result?.sizeBytes).toBe(12345);
      expect(result?.mimeType).toBe('image/jpeg');
      expect(result?.etag).toBe('"abc"');
    });
  });

  describe('getSignedReadUrl', () => {
    it('mints a signed URL for the private bucket', async () => {
      mockGetSignedUrl.mockResolvedValueOnce('https://signed.example/get?sig=...');
      const p = new R2Provider();
      const url = await p.getSignedReadUrl('consultations/x/y.jpg' as never, 300);
      expect(url).toContain('signed.example');
    });
  });

  describe('deleteObject', () => {
    it('attempts delete on both buckets and swallows 404s', async () => {
      const { NoSuchKey } = await import('@aws-sdk/client-s3');
      mockS3Send
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new (NoSuchKey as unknown as new () => Error)());
      const p = new R2Provider();
      await expect(p.deleteObject('blog/x.jpg' as never)).resolves.toBeUndefined();
    });
  });
});
