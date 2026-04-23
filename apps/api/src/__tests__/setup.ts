// ═══════════════════════════════════════════════════════════════
// GLOBAL TEST SETUP — Mocks for external dependencies
// Sentry, Logger, Redis, Prisma — all mocked to prevent
// real API calls, DB connections, and external service hits.
// Pattern: Stripe, GitHub — mock external deps, test logic.
// ═══════════════════════════════════════════════════════════════

import { vi } from 'vitest';

// ── Mock Sentry (prevents real error reporting in tests) ──
vi.mock('../lib/sentry.js', () => ({
  initSentry: vi.fn(),
  Sentry: {
    captureException: vi.fn(),
    captureMessage: vi.fn(),
    close: vi.fn().mockResolvedValue(true),
    setupExpressErrorHandler: vi.fn(),
  },
}));

// ── Mock Logger (silent tests — no console noise) ──
vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Mock Redis (in-memory behavior — no real Upstash calls) ──
const memoryStore = new Map<string, string>();
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
      return Promise.resolve();
    }),
    incr: vi.fn().mockResolvedValue(1),
  },
  aiCache: {
    generateKey: vi.fn().mockReturnValue('test-cache-key'),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
  },
  blacklist: {
    isBlacklisted: vi.fn().mockResolvedValue(false),
    add: vi.fn().mockResolvedValue(undefined),
  },
  TTL: {
    OTP: 600,
    OTP_HOURLY: 3600,
    COST_DAILY: 86400,
    RESPONSE_CACHE: 86400,
  },
}));

// ── Mock Request Context (for error handler request ID) ──
vi.mock('../lib/request-context.js', () => ({
  requestStore: {
    run: vi.fn((_ctx: unknown, fn: () => void) => fn()),
    getStore: vi.fn().mockReturnValue({ requestId: 'test-req-id', startedAt: Date.now() }),
  },
  getRequestId: vi.fn().mockReturnValue('test-req-id'),
  getRequestDurationMs: vi.fn().mockReturnValue(5),
}));

// ── Mock Prisma (no real DB connection in tests) ──
vi.mock('@repo/db', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
    consultation: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  // Re-export enums that might be used in type checks
  UserPrimaryRole: {
    PATIENT: 'PATIENT',
    CLINIC_OWNER: 'CLINIC_OWNER',
    CLINIC_STAFF: 'CLINIC_STAFF',
    DOCTOR: 'DOCTOR',
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
  },
}));

// ── Mock WhatsApp (prevent real Meta API calls) ──
vi.mock('../services/whatsapp/index.js', () => ({
  whatsappHealthCheck: vi.fn().mockResolvedValue({ ok: true, latencyMs: 50 }),
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: true }),
}));

// ── Clean up between tests ──
afterEach(() => {
  memoryStore.clear();
});
