// ═══════════════════════════════════════════════════════════════
// GLOBAL TEST SETUP — Mocks for external dependencies
// P6-F1: All Prisma models + $transaction callback
// P6-F2: Redis incr with counter support
// ═══════════════════════════════════════════════════════════════

import { vi, afterEach } from 'vitest';

// ── Mock Sentry ──
vi.mock('../lib/sentry.js', () => ({
  initSentry: vi.fn(),
  Sentry: {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    close: vi.fn().mockResolvedValue(true),
    setupExpressErrorHandler: vi.fn(),
  },
}));

// ── Mock Logger ──
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Mock Security Logger ──
vi.mock('../lib/security-logger.js', () => ({
  logSecurityEvent: vi.fn(),
}));

// ── Mock Redis (P6-F2: incr with real counter) ──
const memoryStore = new Map<string, string>();
const incrCounters = new Map<string, number>();

vi.mock('../lib/redis.js', () => ({
  initRedis: vi.fn(),
  verifyRedis: vi.fn().mockResolvedValue({ ok: true, latencyMs: 1 }),
  cache: {
    get: vi.fn((key: string) => Promise.resolve(memoryStore.get(key) ?? null)),
    set: vi.fn((key: string, value: string) => {
      memoryStore.set(key, value);
      return Promise.resolve();
    }),
    del: vi.fn((key: string) => {
      memoryStore.delete(key);
      incrCounters.delete(key);
      return Promise.resolve();
    }),
    // P6-F2: Real counter — can test rate-limit-exceeded path
    incr: vi.fn((key: string) => {
      const current = incrCounters.get(key) ?? 0;
      const next = current + 1;
      incrCounters.set(key, next);
      return Promise.resolve(next);
    }),
  },
  aiCache: {
    generateKey: vi.fn().mockReturnValue('test-cache-key'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
  blacklist: {
    isBlacklisted: vi.fn().mockResolvedValue(false),
    add: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
  TTL: {
    OTP: 600,
    OTP_HOURLY: 3600,
    COST_DAILY: 86400,
    RESPONSE_CACHE: 86400,
  },
}));

// ── Mock Request Context ──
vi.mock('../lib/request-context.js', () => ({
  requestStore: {
    run: vi.fn((_ctx: unknown, fn: () => void) => fn()),
    getStore: vi.fn().mockReturnValue({ requestId: 'test-req-id', startedAt: Date.now() }),
  },
  getRequestId: vi.fn().mockReturnValue('test-req-id'),
  getRequestDurationMs: vi.fn().mockReturnValue(5),
}));

// ── Mock Prisma (P6-F1: All models + $transaction callback) ──
const mockPrismaModel = () => ({
  findUnique: vi.fn().mockResolvedValue(null),
  findFirst: vi.fn().mockResolvedValue(null),
  findMany: vi.fn().mockResolvedValue([]),
  create: vi
    .fn()
    .mockImplementation((args: { data: unknown }) =>
      Promise.resolve({ id: 'mock-id', ...((args?.data as Record<string, unknown>) ?? {}) }),
    ),
  update: vi
    .fn()
    .mockImplementation((args: { data: unknown }) =>
      Promise.resolve({ id: 'mock-id', ...((args?.data as Record<string, unknown>) ?? {}) }),
    ),
  delete: vi.fn().mockResolvedValue({}),
  count: vi.fn().mockResolvedValue(0),
});

vi.mock('@repo/db', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    // P6-F1: $transaction executes callback with same prisma mock
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      // Pass the same prisma mock as transaction client
      const { prisma } = await import('@repo/db');
      return fn(prisma);
    }),
    user: mockPrismaModel(),
    patient: mockPrismaModel(),
    consultation: mockPrismaModel(),
    userAuthIdentity: mockPrismaModel(),
    userRole: mockPrismaModel(),
    assessment: mockPrismaModel(),
    consultationMessage: mockPrismaModel(),
    whatsAppMessage: mockPrismaModel(),
    clinicOwner: mockPrismaModel(),
  },
  UserPrimaryRole: {
    PATIENT: 'PATIENT',
    CLINIC_OWNER: 'CLINIC_OWNER',
    CLINIC_STAFF: 'CLINIC_STAFF',
    DOCTOR: 'DOCTOR',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
  },
}));

// ── Mock WhatsApp ──
vi.mock('../services/whatsapp/index.js', () => ({
  whatsappHealthCheck: vi.fn().mockResolvedValue({ ok: true, latencyMs: 50 }),
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: true }),
  sendWhatsAppText: vi.fn().mockResolvedValue({ success: true }),
  sendWhatsAppTemplate: vi.fn().mockResolvedValue({ success: true }),
}));

// ── Clean up between tests ──
afterEach(() => {
  memoryStore.clear();
  incrCounters.clear();
});
