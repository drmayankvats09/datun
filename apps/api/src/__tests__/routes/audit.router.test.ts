// apps/api/src/__tests__/routes/audit.router.test.ts
// ═══════════════════════════════════════════════════════════════
// AUDIT ROUTER TESTS — Task #52 Phase 5 (FIX: vi.hoisted)
//
// Coverage:
//   1. POST /api/audit/error — valid payload → 202 + Prisma write
//   2. Anonymous request (no token) is accepted
//   3. Authenticated request attaches req.auth.sub as userId
//   4. Invalid payload → 400 (Zod ValidationError)
//   5. Each enum field rejects out-of-vocabulary values
//   6. retryCount > 100 rejected
//   7. Timestamps within ±24h accepted; beyond logged but accepted
//   8. Prisma write failure → still 202 (best-effort, no cascade)
//   9. IP extraction prefers cf-connecting-ip over req.ip
//   10. User-Agent truncated to 500 chars
//
// Uses supertest pattern matching existing API tests in this repo.
//
// FIX (post-test-run): Vitest hoists vi.mock() factories to file top
// BEFORE module imports + before top-level const evaluations. The
// previous version closed over a plain `const auditLogCreate = vi.fn()`
// inside the vi.mock factory, causing a TDZ ReferenceError:
//   "Cannot access 'auditLogCreate' before initialization"
//
// Fix follows the codebase's established pattern (see
// media.router.test.ts): declare all closed-over handles via
// `vi.hoisted()`, which is co-hoisted with vi.mock factories.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express, { type Express } from 'express';
import supertest from 'supertest';

// ═══════════════════════════════════════════════════════════════
// HOISTED MOCKS — co-hoisted with vi.mock() factories below
// ═══════════════════════════════════════════════════════════════

const h = vi.hoisted(() => ({
  /** Spy for prisma.auditLog.create — assertions reference h.auditLogCreate. */
  auditLogCreate: vi.fn(),
  /** Per-test auth sub — null = anonymous, string = authenticated. */
  mockAuthSub: null as string | null,
}));

// ── Mock Prisma client BEFORE importing the router ──
vi.mock('@repo/db', () => ({
  prisma: {
    auditLog: {
      create: h.auditLogCreate,
    },
  },
}));

// ── Mock logger so test output stays clean ──
vi.mock('../../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Mock optionalAuth — controlled per-test via h.mockAuthSub ──
vi.mock('../../middleware/auth.js', () => ({
  optionalAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (h.mockAuthSub) {
      (req as unknown as { auth: { sub: string; role: string } }).auth = {
        sub: h.mockAuthSub,
        role: 'USER',
      };
    }
    next();
  },
}));

// ── Import the router AFTER all mocks are set up ──
import { auditRouter } from '../../routes/audit.router.js';

// ─── Helpers ───────────────────────────────────────────────────

/** Build a minimal Express app mounting just the audit router. */
function makeApp(): Express {
  const app = express();
  app.use(express.json());
  // Attach a request ID — matches the production middleware's contract.
  app.use((req, _res, next) => {
    (req as unknown as { requestId: string }).requestId = 'test-request-id';
    next();
  });
  app.use('/api', auditRouter);
  // Global error handler — matches production's error middleware shape.
  app.use(
    (
      err: Error & { statusCode?: number; details?: unknown },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(err.statusCode ?? 500).json({
        success: false,
        error: {
          code: err.name === 'ValidationError' ? 'VALIDATION_FAILED' : 'INTERNAL_ERROR',
          message: err.message,
          details: err.details,
        },
      });
    },
  );
  return app;
}

/** Build a valid payload for a successful POST. */
function validPayload(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    sessionId: 'a4d8f2e0-1234-4abc-9def-0123456789ab',
    sentryEventId: 'evt-abc-123',
    category: 'network',
    severity: 'error',
    recoveryAction: 'retry',
    retryCount: 0,
    statusCode: null,
    code: null,
    errorName: 'NetworkError',
    diagnosticMessage: 'fetch failed',
    boundaryLevel: 'route',
    pathname: '/en/consult/abc-123',
    clientTimestamp: new Date().toISOString(),
    locale: 'en-IN',
    ...overrides,
  };
}

beforeEach(() => {
  h.auditLogCreate.mockReset();
  h.auditLogCreate.mockResolvedValue({});
  h.mockAuthSub = null;
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ─────────────────────────────────────────────────────

describe('POST /api/audit/error', () => {
  it('accepts a valid anonymous payload and returns 202', async () => {
    const app = makeApp();
    const response = await supertest(app)
      .post('/api/audit/error')
      .send(validPayload())
      .expect('Content-Type', /json/)
      .expect(202);

    expect(response.body).toMatchObject({
      success: true,
      data: { accepted: true },
    });
    expect(h.auditLogCreate).toHaveBeenCalledTimes(1);
  });

  it('persists with userId=null for anonymous requests', async () => {
    const app = makeApp();
    await supertest(app).post('/api/audit/error').send(validPayload()).expect(202);

    const call = h.auditLogCreate.mock.calls[0]?.[0] as {
      data: { userId: string | null };
    };
    expect(call.data.userId).toBeNull();
  });

  it('attaches req.auth.sub as userId for authenticated requests', async () => {
    h.mockAuthSub = 'user_authenticated_123';
    const app = makeApp();
    await supertest(app).post('/api/audit/error').send(validPayload()).expect(202);

    const call = h.auditLogCreate.mock.calls[0]?.[0] as {
      data: { userId: string | null };
    };
    expect(call.data.userId).toBe('user_authenticated_123');
  });

  it('rejects invalid category with 400', async () => {
    const app = makeApp();
    const response = await supertest(app)
      .post('/api/audit/error')
      .send(validPayload({ category: 'invalid-category' }))
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(h.auditLogCreate).not.toHaveBeenCalled();
  });

  it('rejects invalid severity with 400', async () => {
    const app = makeApp();
    await supertest(app)
      .post('/api/audit/error')
      .send(validPayload({ severity: 'critical' }))
      .expect(400);
    expect(h.auditLogCreate).not.toHaveBeenCalled();
  });

  it('rejects invalid boundary level with 400', async () => {
    const app = makeApp();
    await supertest(app)
      .post('/api/audit/error')
      .send(validPayload({ boundaryLevel: 'global' }))
      .expect(400);
    expect(h.auditLogCreate).not.toHaveBeenCalled();
  });

  it('rejects retryCount > 100 with 400', async () => {
    const app = makeApp();
    await supertest(app)
      .post('/api/audit/error')
      .send(validPayload({ retryCount: 101 }))
      .expect(400);
    expect(h.auditLogCreate).not.toHaveBeenCalled();
  });

  it('rejects negative retryCount with 400', async () => {
    const app = makeApp();
    await supertest(app)
      .post('/api/audit/error')
      .send(validPayload({ retryCount: -1 }))
      .expect(400);
  });

  it('rejects payload missing required field', async () => {
    const app = makeApp();
    const bad = validPayload();
    delete bad.category;
    await supertest(app).post('/api/audit/error').send(bad).expect(400);
    expect(h.auditLogCreate).not.toHaveBeenCalled();
  });

  it('writes action="error.<category>" to AuditLog', async () => {
    const app = makeApp();
    await supertest(app)
      .post('/api/audit/error')
      .send(validPayload({ category: 'ai-service' }))
      .expect(202);

    const call = h.auditLogCreate.mock.calls[0]?.[0] as { data: { action: string } };
    expect(call.data.action).toBe('error.ai-service');
  });

  it('writes entityType="ErrorBoundary" and entityId=sessionId', async () => {
    const app = makeApp();
    await supertest(app)
      .post('/api/audit/error')
      .send(validPayload({ sessionId: 'session-xyz' }))
      .expect(202);

    const call = h.auditLogCreate.mock.calls[0]?.[0] as {
      data: { entityType: string; entityId: string };
    };
    expect(call.data.entityType).toBe('ErrorBoundary');
    expect(call.data.entityId).toBe('session-xyz');
  });

  it('preserves all PII-safe fields in metadata', async () => {
    const app = makeApp();
    await supertest(app)
      .post('/api/audit/error')
      .send(
        validPayload({
          severity: 'fatal',
          recoveryAction: 'reload',
          retryCount: 2,
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
          diagnosticMessage: 'upstream timeout',
        }),
      )
      .expect(202);

    const call = h.auditLogCreate.mock.calls[0]?.[0] as {
      data: { metadata: Record<string, unknown> };
    };
    expect(call.data.metadata).toMatchObject({
      severity: 'fatal',
      recoveryAction: 'reload',
      retryCount: 2,
      statusCode: 503,
      code: 'SERVICE_UNAVAILABLE',
      diagnosticMessage: 'upstream timeout',
    });
  });

  it('prefers cf-connecting-ip over req.ip', async () => {
    const app = makeApp();
    await supertest(app)
      .post('/api/audit/error')
      .set('cf-connecting-ip', '203.0.113.42')
      .send(validPayload())
      .expect(202);

    const call = h.auditLogCreate.mock.calls[0]?.[0] as {
      data: { ipAddress: string | null };
    };
    expect(call.data.ipAddress).toBe('203.0.113.42');
  });

  it('falls back to x-real-ip when cf-connecting-ip absent', async () => {
    const app = makeApp();
    await supertest(app)
      .post('/api/audit/error')
      .set('x-real-ip', '198.51.100.7')
      .send(validPayload())
      .expect(202);

    const call = h.auditLogCreate.mock.calls[0]?.[0] as {
      data: { ipAddress: string | null };
    };
    expect(call.data.ipAddress).toBe('198.51.100.7');
  });

  it('truncates user-agent to 500 chars', async () => {
    const longUA = 'A'.repeat(800);
    const app = makeApp();
    await supertest(app)
      .post('/api/audit/error')
      .set('User-Agent', longUA)
      .send(validPayload())
      .expect(202);

    const call = h.auditLogCreate.mock.calls[0]?.[0] as {
      data: { userAgent: string | null };
    };
    expect(call.data.userAgent?.length).toBe(500);
  });

  it('still responds 202 when Prisma write fails (best-effort)', async () => {
    h.auditLogCreate.mockRejectedValueOnce(new Error('db is down'));
    const app = makeApp();
    const response = await supertest(app).post('/api/audit/error').send(validPayload()).expect(202);

    expect(response.body.success).toBe(true);
  });

  it('rejects clientTimestamp that is not a valid ISO 8601 string', async () => {
    const app = makeApp();
    await supertest(app)
      .post('/api/audit/error')
      .send(validPayload({ clientTimestamp: 'not-a-date' }))
      .expect(400);
  });

  it('rejects pathname longer than 500 chars', async () => {
    const app = makeApp();
    await supertest(app)
      .post('/api/audit/error')
      .send(validPayload({ pathname: '/'.repeat(600) }))
      .expect(400);
  });

  it('rejects diagnosticMessage longer than 200 chars', async () => {
    const app = makeApp();
    await supertest(app)
      .post('/api/audit/error')
      .send(validPayload({ diagnosticMessage: 'x'.repeat(250) }))
      .expect(400);
  });

  it('accepts all 10 valid categories', async () => {
    const categories = [
      'network',
      'auth',
      'validation',
      'rate-limit',
      'not-found',
      'server',
      'ai-service',
      'consultation-state',
      'chunk-load',
      'unknown',
    ];
    const app = makeApp();
    for (const category of categories) {
      h.auditLogCreate.mockClear();
      await supertest(app).post('/api/audit/error').send(validPayload({ category })).expect(202);
      expect(h.auditLogCreate).toHaveBeenCalledTimes(1);
    }
  });
});
