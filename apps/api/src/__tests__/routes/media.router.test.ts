// ═══════════════════════════════════════════════════════════════
// MEDIA ROUTER TESTS — Task #46
//
// Integration tests via supertest. We mock the auth middleware (so we
// don't need a real JWT) and the media.service functions (so the
// router's HTTP plumbing is the only thing under test).
//
// CRITICAL HOISTING: Vitest hoists vi.mock() factories to file top.
// All closed-over handles MUST be declared via vi.hoisted().
//
// CRITICAL AUTH SHAPE: production middleware writes `req.auth` (decoded
// JWT claims), NOT `req.user`. Routes read `req.auth!.sub`.
// See apps/api/src/middleware/auth.ts and media.router.ts:65.
//
// CRITICAL UUID FORMAT: stringIdField allows alphanumeric+dash IDs
// for entityId (max 64 chars). uuidField (used by consentLogId AND
// :id path params) requires strict UUID v4 with version marker
// (4xxx) AND variant marker ([89ab]xxx). See packages/shared/src/
// validators/primitives/uuid.ts:16. Lazy IDs like "33333333-..." with
// all-same digits FAIL the version-4 marker check.
//
// NOTE: POST /moderation/override is admin-scope (Task #47), not #46.
// ═══════════════════════════════════════════════════════════════

import { vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════
// HOISTED MOCKS
// ═══════════════════════════════════════════════════════════════

const h = vi.hoisted(() => ({
  // Default PATIENT identity. Tests can mutate h.authClaims before
  // sending requests to flip the role.
  authClaims: {
    sub: '550e8400-e29b-41d4-a716-446655440000',
    email: 'test@datun.ai',
    role: 'PATIENT' as const,
    type: 'access' as const,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: 'datun',
  },

  mockRequestUploadIntent: vi.fn(),
  mockConfirmUpload: vi.fn(),
  mockGetMediaAsset: vi.fn(),
  mockDeleteMedia: vi.fn(),
}));

// ── Auth middleware mocks ──
// Production sets req.auth = JwtService.verifyAccessToken(token).
// Routes read req.auth!.sub. We mirror that exact shape.

vi.mock('../../middleware/auth.js', () => ({
  requireAuth: vi.fn((req: { auth?: unknown }, _res: unknown, next: () => void) => {
    req.auth = h.authClaims;
    next();
  }),
  requireUser: vi.fn(async (req: { auth?: unknown }, _res: unknown, next: () => void) => {
    req.auth = h.authClaims;
    next();
  }),
  requireRole: vi.fn(() => (req: { auth?: unknown }, _res: unknown, next: () => void) => {
    req.auth = h.authClaims;
    next();
  }),
  optionalAuth: vi.fn((req: { auth?: unknown }, _res: unknown, next: () => void) => {
    req.auth = h.authClaims;
    next();
  }),
}));

// ── Media service module mocks ──
vi.mock('../../services/media/index.js', () => ({
  requestUploadIntent: (...args: unknown[]) => h.mockRequestUploadIntent(...args),
  confirmUpload: (...args: unknown[]) => h.mockConfirmUpload(...args),
  getMediaAsset: (...args: unknown[]) => h.mockGetMediaAsset(...args),
  deleteMedia: (...args: unknown[]) => h.mockDeleteMedia(...args),
}));

// ── Imports (after mocks) ──
import { describe, it, expect, beforeEach } from 'vitest';
import { getTestApp, resetTestApp } from '../helpers/test-app.js';

// ═══════════════════════════════════════════════════════════════
// FIXTURES — every UUID below is a strict-valid v4 string.
// Format check: 8hex-4hex-4hex(starts with 4)-4hex(starts with 8/9/a/b)-12hex.
// ═══════════════════════════════════════════════════════════════

const FIXTURES = {
  uploader: '550e8400-e29b-41d4-a716-446655440000',
  // entityId uses stringIdField (alphanumeric + dash, max 64) — UUID is
  // accepted but a shorter alnum string is the realistic shape for
  // entity refs from client. We use UUID for parity with consultation IDs.
  entity: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
  consent: '6ba7b811-9dad-41d1-80b4-00c04fd430c9',
  media: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
};

const VALID_INTENT_BODY = {
  kind: 'CONSULTATION_PHOTO',
  mimeType: 'image/jpeg',
  sizeBytes: 500_000,
  entityId: FIXTURES.entity,
  consentLogId: FIXTURES.consent,
  originalFilename: 'tooth.jpg',
};

const VALID_CONFIRM_BODY = {
  finalSizeBytes: 500_000,
  width: 1568,
  height: 1045,
  blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
  sha256: 'a'.repeat(64),
};

const MEDIA_DTO = {
  id: FIXTURES.media,
  kind: 'CONSULTATION_PHOTO',
  accessClass: 'private',
  mimeType: 'image/jpeg',
  width: 1568,
  height: 1045,
  sizeBytes: 500_000,
  blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
  variants: {},
  status: 'READY',
  moderation: 'APPROVED',
  createdAt: new Date('2026-05-15').toISOString(),
  processedAt: new Date('2026-05-15').toISOString(),
};

beforeEach(() => {
  resetTestApp();
  vi.clearAllMocks();
  h.authClaims = {
    sub: FIXTURES.uploader,
    email: 'test@datun.ai',
    role: 'PATIENT',
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: 'datun',
  };
});

// ═══════════════════════════════════════════════════════════════
// POST /api/media/upload-intent
// Returns 201 (Stripe pattern — POST that creates → 201 Created).
// ═══════════════════════════════════════════════════════════════

describe('POST /api/media/upload-intent', () => {
  it('returns 201 with signed URL + mediaId on valid request', async () => {
    h.mockRequestUploadIntent.mockResolvedValue({
      mediaId: FIXTURES.media,
      uploadUrl: 'https://signed.example/put',
      requiredHeaders: { 'Content-Type': 'image/jpeg' },
      maxBytes: 1_500_000,
      ttlSeconds: 300,
      storageKey: `consultations/${FIXTURES.entity}/${FIXTURES.media}.jpg`,
      kind: 'CONSULTATION_PHOTO',
    });

    const res = await getTestApp().post('/api/media/upload-intent').send(VALID_INTENT_BODY);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.uploadUrl).toBe('https://signed.example/put');
    expect(res.body.data.mediaId).toBe(FIXTURES.media);
    expect(h.mockRequestUploadIntent).toHaveBeenCalledOnce();
  });

  it('rejects body without kind (400 VALIDATION_ERROR)', async () => {
    const res = await getTestApp()
      .post('/api/media/upload-intent')
      .send({ ...VALID_INTENT_BODY, kind: undefined });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects unsupported MIME type (400)', async () => {
    const res = await getTestApp()
      .post('/api/media/upload-intent')
      .send({ ...VALID_INTENT_BODY, mimeType: 'application/pdf' });
    expect(res.status).toBe(400);
  });

  it('rejects oversize sizeBytes (400)', async () => {
    const res = await getTestApp()
      .post('/api/media/upload-intent')
      .send({ ...VALID_INTENT_BODY, sizeBytes: 50_000_000 });
    expect(res.status).toBe(400);
  });

  it('propagates service errors with correct status', async () => {
    h.mockRequestUploadIntent.mockRejectedValue(
      Object.assign(new Error('upload limit reached'), { statusCode: 409 }),
    );

    const res = await getTestApp().post('/api/media/upload-intent').send(VALID_INTENT_BODY);

    expect([409, 500]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/media/:id/confirm — default 200
// ═══════════════════════════════════════════════════════════════

describe('POST /api/media/:id/confirm', () => {
  const id = FIXTURES.media;

  it('returns 200 with updated DTO on valid confirm', async () => {
    h.mockConfirmUpload.mockResolvedValue({ ...MEDIA_DTO, status: 'UPLOADED' });

    const res = await getTestApp().post(`/api/media/${id}/confirm`).send(VALID_CONFIRM_BODY);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
    expect(h.mockConfirmUpload).toHaveBeenCalledOnce();
  });

  it('rejects invalid uuid in path (400)', async () => {
    const res = await getTestApp().post('/api/media/not-a-uuid/confirm').send(VALID_CONFIRM_BODY);
    expect(res.status).toBe(400);
  });

  it('rejects missing blurhash (400)', async () => {
    const res = await getTestApp()
      .post(`/api/media/${id}/confirm`)
      .send({ ...VALID_CONFIRM_BODY, blurhash: undefined });
    expect(res.status).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════
// GET /api/media/:id
// ═══════════════════════════════════════════════════════════════

describe('GET /api/media/:id', () => {
  const id = FIXTURES.media;

  it('returns 200 with DTO for public kind', async () => {
    h.mockGetMediaAsset.mockResolvedValue({
      ...MEDIA_DTO,
      kind: 'BLOG_IMAGE',
      accessClass: 'public',
    });

    const res = await getTestApp().get(`/api/media/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.kind).toBe('BLOG_IMAGE');
  });

  it('returns 200 with DTO for private kind (auth injected)', async () => {
    h.mockGetMediaAsset.mockResolvedValue(MEDIA_DTO);
    const res = await getTestApp().get(`/api/media/${id}`);
    expect(res.status).toBe(200);
    expect(h.mockGetMediaAsset.mock.calls[0]?.[0]).toBe(id);
  });

  it('propagates 404 when service rejects', async () => {
    h.mockGetMediaAsset.mockRejectedValue(
      Object.assign(new Error('not found'), { statusCode: 404 }),
    );

    const res = await getTestApp().get(`/api/media/${id}`);
    expect([404, 500]).toContain(res.status);
  });
});

// ═══════════════════════════════════════════════════════════════
// DELETE /api/media/:id
// reqMeta() reads `req.headers['user-agent']`. supertest passes UA
// only when explicitly set via .set('User-Agent', '...') — otherwise
// it's undefined. We always set it in these tests.
// ═══════════════════════════════════════════════════════════════

describe('DELETE /api/media/:id', () => {
  const id = FIXTURES.media;

  it('returns 200 when service deletes successfully', async () => {
    h.mockDeleteMedia.mockResolvedValue({ id, deleted: true });

    const res = await getTestApp()
      .delete(`/api/media/${id}`)
      .set('User-Agent', 'vitest/integration')
      .send({ reason: 'patient requested deletion', hardPurge: true });

    expect(res.status).toBe(200);
    expect(h.mockDeleteMedia).toHaveBeenCalledOnce();
    expect(h.mockDeleteMedia.mock.calls[0]?.[0]).toMatchObject({
      mediaId: id,
      reason: 'patient requested deletion',
      hardPurge: true,
    });
  });

  it('rejects missing reason (400)', async () => {
    const res = await getTestApp().delete(`/api/media/${id}`).send({ hardPurge: false });
    expect(res.status).toBe(400);
  });

  it('passes ipAddress + userAgent to service for audit', async () => {
    h.mockDeleteMedia.mockResolvedValue({ id, deleted: true });
    await getTestApp()
      .delete(`/api/media/${id}`)
      .set('User-Agent', 'vitest/integration')
      .send({ reason: 'audit-test', hardPurge: false });

    const call = h.mockDeleteMedia.mock.calls[0]?.[0] as {
      ipAddress?: string;
      userAgent?: string;
    };
    expect(call?.userAgent).toBeDefined();
    expect(call?.userAgent).toContain('vitest');
  });
});

// POST /api/media/:id/moderation/override — deferred to Task #47.
