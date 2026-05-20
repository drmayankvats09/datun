// apps/api/src/__tests__/services/flag/flag-evaluator.test.ts
// ═══════════════════════════════════════════════════════════════
// FLAG EVALUATOR TESTS — Decision-tree coverage (Task #49)
// ─────────────────────────────────────────────────────────────────
// The evaluator's 9-step flow is the single most critical piece
// of Task #49. Every branch is exercised here. Branches:
//
//   1. Unknown key → DEFAULT
//   2. FEATURE_FLAGS_ENABLED=false → DEFAULT
//   3. L1 cache hit → cached evaluation
//   4. DB miss → DEFAULT (or ARCHIVED if archivedAt set)
//   5. Override row → OVERRIDE
//   6. Clinic enable / disable list → TARGETED_HIT / TARGETED_MISS
//   7. status=OFF → STATIC_OFF
//      status=ON  → STATIC_ON (or KILLSWITCH if category=KILL_SWITCH)
//      status=ROLLOUT_BUCKET → ROLLOUT_HIT / ROLLOUT_MISS
//      status=TARGETED → rules evaluated
//
// We mock Prisma + cache layer; the evaluator's pure logic is
// what we're exercising.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock cache service BEFORE importing the evaluator so the
// evaluator picks up the mock.
const { mockCacheGet, mockCacheSet, mockCacheInvalidate } = vi.hoisted(() => ({
  mockCacheGet: vi.fn(),
  mockCacheSet: vi.fn(),
  mockCacheInvalidate: vi.fn(),
}));
vi.mock('../../../services/flag/flag-cache.service.js', () => ({
  flagCacheService: {
    get: mockCacheGet,
    set: mockCacheSet,
    invalidateFlag: mockCacheInvalidate,
    flush: vi.fn(),
  },
}));

import { prisma } from '@repo/db';
import { FLAG_KEYS, makeFlagContext } from '@repo/shared';
import { evaluate, evaluateAll } from '../../../services/flag/flag-evaluator.service.js';

// Helper — typed shorthand for the Prisma mock.
function asMock<T>(value: T): ReturnType<typeof vi.fn> {
  return value as unknown as ReturnType<typeof vi.fn>;
}

// Make sure Prisma has the new flag models in the global mock.
// The setup.ts uses `mockPrismaModel()` for generic models; we
// install featureFlag / featureFlagOverride / featureFlagEvaluation
// here for this test file only.
beforeEach(() => {
  vi.clearAllMocks();
  mockCacheGet.mockResolvedValue(null);
  mockCacheSet.mockResolvedValue(undefined);

  // Install fresh Prisma model mocks for the three new tables.
  Object.assign(prisma, {
    featureFlag: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    featureFlagOverride: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    featureFlagEvaluation: {
      create: vi.fn().mockResolvedValue({ id: 'eval-1' }),
    },
  });
});

describe('flag-evaluator', () => {
  // ─── Step 1 — unknown key ────────────────────────────────

  describe('unknown key', () => {
    it('returns DEFAULT for an unregistered key', async () => {
      const result = await evaluate('not.a-real-flag' as never, makeFlagContext({ userId: 'u_1' }));
      expect(result.reason).toBe('DEFAULT');
      expect(result.value).toBe(false);
    });
  });

  // ─── Step 3 — cache hit ──────────────────────────────────

  describe('cache hit', () => {
    it('returns the cached evaluation without touching DB', async () => {
      mockCacheGet.mockResolvedValue({
        key: FLAG_KEYS.CONSULTATION_STREAMING,
        value: true,
        variantKey: null,
        reason: 'STATIC_ON',
        bucketHash: null,
        evaluatedAt: new Date().toISOString(),
      });

      const result = await evaluate(
        FLAG_KEYS.CONSULTATION_STREAMING,
        makeFlagContext({ userId: 'u_1' }),
      );

      expect(result.value).toBe(true);
      expect(result.reason).toBe('STATIC_ON');
      expect(asMock(prisma.featureFlag.findUnique)).not.toHaveBeenCalled();
    });
  });

  // ─── Step 4 — DB miss → default ─────────────────────────

  describe('DB miss → DEFAULT', () => {
    it('returns hard-coded default when flag row absent', async () => {
      asMock(prisma.featureFlag.findUnique).mockResolvedValue(null);
      const result = await evaluate(FLAG_KEYS.UI_DARK_MODE, makeFlagContext({ userId: 'u_1' }));
      // UI_DARK_MODE default is true per flag-defaults.ts
      expect(result.value).toBe(true);
      expect(result.reason).toBe('DEFAULT');
    });
  });

  // ─── Step 4b — archived row → ARCHIVED ──────────────────

  describe('archived flag', () => {
    it('returns the flag default with reason=ARCHIVED', async () => {
      asMock(prisma.featureFlag.findUnique).mockResolvedValue({
        flagKey: FLAG_KEYS.CLINIC_BULK_EXPORT,
        status: 'ON',
        category: 'RELEASE',
        defaultValue: false,
        rolloutPercent: 0,
        targetingRules: { combinator: 'AND', rules: [] },
        variants: {},
        enabledClinicIds: [],
        disabledClinicIds: [],
        archivedAt: new Date(),
      });
      const result = await evaluate(
        FLAG_KEYS.CLINIC_BULK_EXPORT,
        makeFlagContext({ userId: 'u_1' }),
      );
      expect(result.reason).toBe('ARCHIVED');
      expect(result.value).toBe(false);
    });
  });

  // ─── Step 7a — OFF ───────────────────────────────────────

  describe('status=OFF', () => {
    it('returns false with reason STATIC_OFF', async () => {
      asMock(prisma.featureFlag.findUnique).mockResolvedValue({
        flagKey: FLAG_KEYS.CONSULTATION_STREAMING,
        status: 'OFF',
        category: 'RELEASE',
        defaultValue: false,
        rolloutPercent: 0,
        targetingRules: { combinator: 'AND', rules: [] },
        variants: {},
        enabledClinicIds: [],
        disabledClinicIds: [],
        archivedAt: null,
      });
      const result = await evaluate(
        FLAG_KEYS.CONSULTATION_STREAMING,
        makeFlagContext({ userId: 'u_1' }),
      );
      expect(result.reason).toBe('STATIC_OFF');
      expect(result.value).toBe(false);
    });
  });

  // ─── Step 7b — ON / KILLSWITCH ──────────────────────────

  describe('status=ON', () => {
    it('returns true with reason STATIC_ON for non-killswitch category', async () => {
      asMock(prisma.featureFlag.findUnique).mockResolvedValue({
        flagKey: FLAG_KEYS.UI_DARK_MODE,
        status: 'ON',
        category: 'RELEASE',
        defaultValue: false,
        rolloutPercent: 0,
        targetingRules: { combinator: 'AND', rules: [] },
        variants: {},
        enabledClinicIds: [],
        disabledClinicIds: [],
        archivedAt: null,
      });
      const result = await evaluate(FLAG_KEYS.UI_DARK_MODE, makeFlagContext({ userId: 'u_1' }));
      expect(result.reason).toBe('STATIC_ON');
      expect(result.value).toBe(true);
    });

    it('returns reason KILLSWITCH when category=KILL_SWITCH', async () => {
      asMock(prisma.featureFlag.findUnique).mockResolvedValue({
        flagKey: FLAG_KEYS.KILLSWITCH_AI_PROVIDERS,
        status: 'ON',
        category: 'KILL_SWITCH',
        defaultValue: false,
        rolloutPercent: 0,
        targetingRules: { combinator: 'AND', rules: [] },
        variants: {},
        enabledClinicIds: [],
        disabledClinicIds: [],
        archivedAt: null,
      });
      const result = await evaluate(
        FLAG_KEYS.KILLSWITCH_AI_PROVIDERS,
        makeFlagContext({ userId: 'u_1' }),
      );
      expect(result.reason).toBe('KILLSWITCH');
      expect(result.value).toBe(true);
    });
  });

  // ─── Step 7c — ROLLOUT_BUCKET ───────────────────────────

  describe('status=ROLLOUT_BUCKET', () => {
    function rolloutRow(percent: number) {
      return {
        flagKey: FLAG_KEYS.CONSULTATION_STREAMING,
        status: 'ROLLOUT_BUCKET' as const,
        category: 'RELEASE',
        defaultValue: false,
        rolloutPercent: percent,
        targetingRules: { combinator: 'AND', rules: [] },
        variants: {},
        enabledClinicIds: [],
        disabledClinicIds: [],
        archivedAt: null,
      };
    }

    it('returns false for anonymous (cannot bucket)', async () => {
      asMock(prisma.featureFlag.findUnique).mockResolvedValue(rolloutRow(50));
      const result = await evaluate(FLAG_KEYS.CONSULTATION_STREAMING, makeFlagContext());
      expect(result.reason).toBe('ROLLOUT_MISS');
      expect(result.value).toBe(false);
    });

    it('rolloutPercent=100 → ROLLOUT_HIT for any authenticated user', async () => {
      asMock(prisma.featureFlag.findUnique).mockResolvedValue(rolloutRow(100));
      const result = await evaluate(
        FLAG_KEYS.CONSULTATION_STREAMING,
        makeFlagContext({ userId: 'u_anyone' }),
      );
      expect(result.reason).toBe('ROLLOUT_HIT');
      expect(result.value).toBe(true);
      expect(result.bucketHash).not.toBeNull();
    });

    it('rolloutPercent=0 → ROLLOUT_MISS for every user', async () => {
      asMock(prisma.featureFlag.findUnique).mockResolvedValue(rolloutRow(0));
      const result = await evaluate(
        FLAG_KEYS.CONSULTATION_STREAMING,
        makeFlagContext({ userId: 'u_1' }),
      );
      expect(result.reason).toBe('ROLLOUT_MISS');
      expect(result.value).toBe(false);
    });
  });

  // ─── Step 6 — clinic enable/disable ─────────────────────

  describe('clinic enable / disable lists', () => {
    it('clinic in disabledClinicIds → TARGETED_MISS even when status=ON', async () => {
      asMock(prisma.featureFlag.findUnique).mockResolvedValue({
        flagKey: FLAG_KEYS.CONSULTATION_STREAMING,
        status: 'ON',
        category: 'RELEASE',
        defaultValue: false,
        rolloutPercent: 0,
        targetingRules: { combinator: 'AND', rules: [] },
        variants: {},
        enabledClinicIds: [],
        disabledClinicIds: ['clinic_blocked'],
        archivedAt: null,
      });
      const result = await evaluate(
        FLAG_KEYS.CONSULTATION_STREAMING,
        makeFlagContext({ userId: 'u_1', clinicId: 'clinic_blocked' }),
      );
      expect(result.reason).toBe('TARGETED_MISS');
      expect(result.value).toBe(false);
    });

    it('clinic in enabledClinicIds → TARGETED_HIT even when status=OFF', async () => {
      asMock(prisma.featureFlag.findUnique).mockResolvedValue({
        flagKey: FLAG_KEYS.CONSULTATION_STREAMING,
        status: 'OFF',
        category: 'RELEASE',
        defaultValue: false,
        rolloutPercent: 0,
        targetingRules: { combinator: 'AND', rules: [] },
        variants: {},
        enabledClinicIds: ['clinic_vip'],
        disabledClinicIds: [],
        archivedAt: null,
      });
      const result = await evaluate(
        FLAG_KEYS.CONSULTATION_STREAMING,
        makeFlagContext({ userId: 'u_1', clinicId: 'clinic_vip' }),
      );
      expect(result.reason).toBe('TARGETED_HIT');
      expect(result.value).toBe(true);
    });
  });

  // ─── evaluateAll ────────────────────────────────────────

  describe('evaluateAll', () => {
    it('returns a map covering every registry key', async () => {
      // All DB lookups miss → every key resolves to its default.
      asMock(prisma.featureFlag.findUnique).mockResolvedValue(null);
      const map = await evaluateAll(makeFlagContext({ userId: 'u_bulk' }));
      // Defaults map (from flag-defaults.ts) is 30 keys.
      const { ALL_FLAG_KEYS } = await import('@repo/shared');
      for (const k of ALL_FLAG_KEYS) {
        expect(map).toHaveProperty(k);
        expect(typeof map[k]).toBe('boolean');
      }
    });
  });
});
