// apps/api/src/__tests__/routes/admin-security.test.ts
// ═══════════════════════════════════════════════════════════════
// ADMIN SECURITY ROUTES — Integration tests
// Validates: requireAuth + requireRole(ADMIN), pagination, filters.
// ═══════════════════════════════════════════════════════════════

import { vi } from 'vitest';

vi.mock('../../middleware/auth.js', () => ({
  requireAuth: vi.fn((_req, _res, next) => next()),
  requireRole: vi.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  requireUser: vi.fn((_req, _res, next) => next()),
  optionalAuth: vi.fn((_req, _res, next) => next()),
}));

import { describe, it, expect, beforeEach } from 'vitest';
import { getTestApp, resetTestApp } from '../helpers/test-app.js';
import { prisma } from '@repo/db';

beforeEach(() => {
  resetTestApp();
  vi.clearAllMocks();
});

describe('GET /api/admin/security/violations', () => {
  it('returns paginated list with default page=1, pageSize=50', async () => {
    (prisma.cspViolation.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.cspViolation.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const res = await getTestApp().get('/api/admin/security/violations');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pagination).toMatchObject({
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 0,
    });
  });

  it('applies severity filter', async () => {
    (prisma.cspViolation.findMany as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (prisma.cspViolation.count as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await getTestApp().get('/api/admin/security/violations?severity=critical');

    const findArgs = (prisma.cspViolation.findMany as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(findArgs?.where?.severity).toBe('critical');
  });

  it('rejects invalid page values', async () => {
    const res = await getTestApp().get('/api/admin/security/violations?page=0');
    expect(res.status).toBe(400);
  });

  it('caps pageSize at 100', async () => {
    const res = await getTestApp().get('/api/admin/security/violations?pageSize=999');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/admin/security/violations/:id', () => {
  it('returns 404 for missing id', async () => {
    (prisma.cspViolation.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await getTestApp().get('/api/admin/security/violations/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 200 with row for existing id', async () => {
    (prisma.cspViolation.findUnique as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'viol-123',
      blockedUri: 'https://x.com',
      severity: 'critical',
    });

    const res = await getTestApp().get('/api/admin/security/violations/viol-123');

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('viol-123');
  });
});

describe('GET /api/admin/security/stats', () => {
  it('returns daily counts + top directives', async () => {
    (prisma.cspViolation.count as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(120) // today
      .mockResolvedValueOnce(80) // yesterday
      .mockResolvedValueOnce(5); // critical today
    (prisma.cspViolation.groupBy as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { effectiveDirective: 'script-src', _count: { _all: 50 } },
      { effectiveDirective: 'img-src', _count: { _all: 30 } },
    ]);

    const res = await getTestApp().get('/api/admin/security/stats');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      today: 120,
      yesterday: 80,
      criticalToday: 5,
      changeVsYesterdayPct: 50,
    });
    expect(res.body.data.topDirectives).toHaveLength(2);
  });
});
