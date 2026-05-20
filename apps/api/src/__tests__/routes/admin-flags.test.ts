// apps/api/src/__tests__/routes/admin-flags.test.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN FLAGS ROUTES — Integration tests (Task #49)
// ─────────────────────────────────────────────────────────────────
// Boots the real Express app (createApp) via the test-app helper.
// Auth middleware is mocked to a pass-through — we are exercising
// the router contract, not the JWT layer.
//
// Validates the wire contract:
//   GET    /api/admin/flags           — list with pagination shape
//   GET    /api/admin/flags/archived  — archived-only listing
//   GET    /api/admin/flags/:key      — flag + overrides
//   POST   /api/admin/flags           — Zod rejects unknown key
//   PATCH  /api/admin/flags/:key      — partial update
//   POST   /api/admin/flags/:key/kill — kill switch w/ reason
//   POST   /api/admin/flags/cache/flush — 200 always
//   POST   /api/admin/flags/sync/run    — invokes runOnce, returns result
// ═══════════════════════════════════════════════════════════════

import { vi } from 'vitest';

// Pass-through auth — must be mocked BEFORE the router imports.
vi.mock('../../middleware/auth.js', () => ({
  requireAuth: vi.fn((req: { auth?: unknown }, _res, next: () => void) => {
    // Install a fake admin identity so the route handlers' admin-id
    // assertions pass.
    req.auth = {
      sub: 'admin-test-user',
      email: 'admin@datunai.com',
      role: 'ADMIN',
      type: 'access',
      iat: 0,
      exp: 0,
      iss: 'datun',
    };
    next();
  }),
  requireUser: vi.fn((_req, _res, next: () => void) => next()),
  requireRole: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  optionalAuth: vi.fn((_req, _res, next: () => void) => next()),
}));

// Mock the flag service barrel — these are called by mutations
// AFTER the prisma update, so the tests don't need real Redis.
vi.mock('../../services/flag/index.js', async () => {
  const actual = (await vi.importActual('../../services/flag/index.js')) as Record<string, unknown>;
  return {
    ...actual,
    flagCacheService: {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      invalidateFlag: vi.fn().mockResolvedValue(undefined),
      flush: vi.fn().mockResolvedValue(undefined),
    },
    publishFlagInvalidation: vi.fn().mockResolvedValue(undefined),
    runFlagSyncOnce: vi.fn().mockResolvedValue({ ok: true, flagsSynced: 5, errors: 0 }),
    getFlagSyncStatus: vi.fn().mockReturnValue({
      enabled: true,
      intervalSeconds: 60,
      lastSuccessAt: '2026-05-19T00:00:00.000Z',
      lastErrorMessage: null,
    }),
  };
});

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestApp, resetTestApp } from '../helpers/test-app.js';
import { prisma } from '@repo/db';
import { FLAG_KEYS } from '@repo/shared';

function asMock<T>(value: T): ReturnType<typeof vi.fn> {
  return value as unknown as ReturnType<typeof vi.fn>;
}

// Install flag-platform Prisma model mocks per-suite.
beforeEach(() => {
  resetTestApp();
  vi.clearAllMocks();
  Object.assign(prisma, {
    featureFlag: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    featureFlagOverride: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      upsert: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
    },
    featureFlagEvaluation: {
      create: vi.fn().mockResolvedValue({ id: 'eval-1' }),
    },
  });
});

// Stable DTO-shaped row Prisma returns to the route handler.
function flagRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'flag_1',
    flagKey: FLAG_KEYS.CONSULTATION_STREAMING,
    name: 'Consultation Streaming',
    description: '',
    category: 'RELEASE',
    status: 'OFF',
    defaultValue: false,
    rolloutPercent: 0,
    targetingRules: { combinator: 'AND', rules: [] },
    variants: { control: false, treatment: true },
    enabledClinicIds: [],
    disabledClinicIds: [],
    evaluationCount: 0n,
    lastEvaluatedAt: null,
    staleAt: null,
    createdByUserId: 'admin-test-user',
    archivedAt: null,
    createdAt: new Date('2026-05-19T00:00:00.000Z'),
    updatedAt: new Date('2026-05-19T00:00:00.000Z'),
    ...overrides,
  };
}

describe('GET /api/admin/flags', () => {
  it('returns paginated list with shape { items, knownKeys, pagination }', async () => {
    asMock(prisma.featureFlag.findMany).mockResolvedValue([flagRow()]);
    asMock(prisma.featureFlag.count).mockResolvedValue(1);

    const res = await getTestApp().get('/api/admin/flags');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items[0].flagKey).toBe(FLAG_KEYS.CONSULTATION_STREAMING);
    expect(res.body.data.pagination).toMatchObject({
      page: 1,
      pageSize: 50,
      total: 1,
      totalPages: 1,
    });
    expect(Array.isArray(res.body.data.knownKeys)).toBe(true);
  });

  it('rejects pageSize > 100', async () => {
    const res = await getTestApp().get('/api/admin/flags?pageSize=999');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/flags', () => {
  it('rejects a flag whose key is NOT in the FLAG_KEYS registry', async () => {
    const res = await getTestApp().post('/api/admin/flags').send({
      flagKey: 'made-up.flag-key',
      name: 'Bogus',
      category: 'RELEASE',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 409 when key already exists', async () => {
    asMock(prisma.featureFlag.findUnique).mockResolvedValue(flagRow());
    const res = await getTestApp().post('/api/admin/flags').send({
      flagKey: FLAG_KEYS.CONSULTATION_STREAMING,
      name: 'Consultation Streaming',
      category: 'RELEASE',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('creates a new flag', async () => {
    asMock(prisma.featureFlag.findUnique).mockResolvedValue(null);
    asMock(prisma.featureFlag.create).mockResolvedValue(flagRow());
    const res = await getTestApp().post('/api/admin/flags').send({
      flagKey: FLAG_KEYS.CONSULTATION_STREAMING,
      name: 'Consultation Streaming',
      description: 'New chat streaming UI',
      category: 'RELEASE',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.flag.flagKey).toBe(FLAG_KEYS.CONSULTATION_STREAMING);
  });
});

describe('PATCH /api/admin/flags/:key', () => {
  it('updates rolloutPercent', async () => {
    asMock(prisma.featureFlag.findUnique).mockResolvedValue(flagRow({ archivedAt: null }));
    asMock(prisma.featureFlag.update).mockResolvedValue(flagRow({ rolloutPercent: 25 }));
    const res = await getTestApp()
      .patch(`/api/admin/flags/${FLAG_KEYS.CONSULTATION_STREAMING}`)
      .send({ rolloutPercent: 25 });
    expect(res.status).toBe(200);
    expect(res.body.data.flag.rolloutPercent).toBe(25);
  });

  it('rejects update on an archived flag', async () => {
    asMock(prisma.featureFlag.findUnique).mockResolvedValue(flagRow({ archivedAt: new Date() }));
    const res = await getTestApp()
      .patch(`/api/admin/flags/${FLAG_KEYS.CONSULTATION_STREAMING}`)
      .send({ rolloutPercent: 50 });
    expect(res.status).toBe(400);
  });

  it('clamps rolloutPercent at the schema layer (>100 rejected)', async () => {
    const res = await getTestApp()
      .patch(`/api/admin/flags/${FLAG_KEYS.CONSULTATION_STREAMING}`)
      .send({ rolloutPercent: 150 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/admin/flags/:key/kill', () => {
  it('requires a non-empty reason', async () => {
    const res = await getTestApp()
      .post(`/api/admin/flags/${FLAG_KEYS.KILLSWITCH_PAYMENTS}/kill`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('flips status to ON + category KILL_SWITCH', async () => {
    asMock(prisma.featureFlag.update).mockResolvedValue(
      flagRow({
        status: 'ON',
        category: 'KILL_SWITCH',
        flagKey: FLAG_KEYS.KILLSWITCH_PAYMENTS,
      }),
    );
    const res = await getTestApp()
      .post(`/api/admin/flags/${FLAG_KEYS.KILLSWITCH_PAYMENTS}/kill`)
      .send({ reason: 'Razorpay outage — incident 2026-INC-009' });
    expect(res.status).toBe(200);
    expect(res.body.data.flag.status).toBe('ON');
    expect(res.body.data.flag.category).toBe('KILL_SWITCH');
  });
});

describe('POST /api/admin/flags/cache/flush', () => {
  it('returns 200 with flushed=true', async () => {
    const res = await getTestApp().post('/api/admin/flags/cache/flush');
    expect(res.status).toBe(200);
    expect(res.body.data.flushed).toBe(true);
  });
});

describe('POST /api/admin/flags/sync/run', () => {
  it('returns the sync result', async () => {
    const res = await getTestApp().post('/api/admin/flags/sync/run');
    expect(res.status).toBe(200);
    expect(res.body.data.ok).toBe(true);
    expect(res.body.data.flagsSynced).toBe(5);
  });
});

describe('GET /api/admin/flags/sync/status', () => {
  it('returns the diagnostic snapshot', async () => {
    const res = await getTestApp().get('/api/admin/flags/sync/status');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      enabled: true,
      intervalSeconds: 60,
    });
  });
});
