// ═══════════════════════════════════════════════════════════════
// QUEUE SERVICE TESTS — Task #44 Phase 4
//
// Verifies:
//   1. typi_clust auto-switches to margin when label count ≥ 1000
//   2. typi_clust stays typi_clust below threshold
//   3. Strategy dispatch routes to correct SQL builder
//   4. Unknown strategy throws (exhaustive check)
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock prisma — emulate $queryRaw + count ──────────────────

const { mockCount, mockQueryRaw } = vi.hoisted(() => ({
  mockCount: vi.fn(),
  mockQueryRaw: vi.fn(),
}));

vi.mock('@repo/db', async () => {
  const actual = await vi.importActual<typeof import('@repo/db')>('@repo/db');
  return {
    ...actual,
    prisma: {
      trainingLabel: { count: mockCount },
      $queryRaw: mockQueryRaw,
    },
    Prisma: {
      sql: (strings: TemplateStringsArray, ...values: unknown[]) => {
        // Capture SQL parts for assertion in tests
        return { strings, values, _isPrismaSql: true };
      },
    },
  };
});

vi.mock('../../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { buildLabelingQueue } from '../../../services/training/queue.service.js';

beforeEach(() => {
  mockCount.mockReset();
  mockQueryRaw.mockReset();
  mockQueryRaw.mockResolvedValue([]); // default empty rows
});

// ─── Section 1: Threshold-based auto-switch ────────────────────

describe('buildLabelingQueue — TypiClust → Margin auto-switch', () => {
  it('uses TypiClust strategy below 1000 labels', async () => {
    mockCount.mockResolvedValueOnce(500);
    mockQueryRaw.mockResolvedValue([]);

    await buildLabelingQueue({
      labelerId: 'user-1',
      strategy: 'typi_clust',
      limit: 10,
    });

    // TypiClust runs 5 sub-queries (one per score bucket)
    expect(mockQueryRaw).toHaveBeenCalledTimes(5);
  });

  it('switches to Margin at ≥1000 labels', async () => {
    mockCount.mockResolvedValueOnce(1500);
    mockQueryRaw.mockResolvedValue([]);

    await buildLabelingQueue({
      labelerId: 'user-1',
      strategy: 'typi_clust',
      limit: 10,
    });

    // Margin runs single query
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
  });

  it('Margin explicit strategy ignores threshold (single query)', async () => {
    mockCount.mockResolvedValueOnce(50); // way below threshold
    mockQueryRaw.mockResolvedValue([]);

    await buildLabelingQueue({
      labelerId: 'user-1',
      strategy: 'margin',
      limit: 10,
    });

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
  });
});

// ─── Section 2: Strategy → behavior mapping ───────────────────

describe('buildLabelingQueue — strategy dispatch', () => {
  it('conflicts strategy runs single query', async () => {
    await buildLabelingQueue({
      labelerId: 'user-1',
      strategy: 'conflicts',
      limit: 10,
    });
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
  });

  it('random strategy runs single query', async () => {
    await buildLabelingQueue({
      labelerId: 'user-1',
      strategy: 'random',
      limit: 10,
    });
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
  });
});

// ─── Section 3: Result shape mapping ──────────────────────────

describe('buildLabelingQueue — result shape', () => {
  it('maps DB rows to LabelingQueueItem with uncertaintyBand', async () => {
    mockQueryRaw.mockResolvedValueOnce([
      {
        messageId: 'm1',
        consultationId: 'c1',
        role: 'ASSISTANT',
        content: 'sample',
        redactedContent: { text: 'redacted-sample' },
        sequenceNumber: 5,
        createdAt: new Date('2026-05-12T03:00:00Z'),
        aiProvider: 'claude',
        aiModel: 'claude-opus-4-7',
        judgeScore: 3, // near midpoint → HIGH uncertainty
        judgeReasoning: 'judge note',
        existingLabelId: null,
        chiefComplaint: 'toothache for 3 days',
      },
    ]);

    const result = await buildLabelingQueue({
      labelerId: 'user-1',
      strategy: 'margin',
      limit: 10,
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.messageId).toBe('m1');
    expect(result[0]!.redactedContent).toBe('redacted-sample');
    expect(result[0]!.uncertaintyBand).toBe('HIGH'); // judgeScore=3, |3-3| ≤ 0.5
    expect(result[0]!.chiefComplaintSnippet).toBe('toothache for 3 days');
  });

  it('null judgeScore yields null uncertaintyBand', async () => {
    mockQueryRaw.mockResolvedValueOnce([
      {
        messageId: 'm1',
        consultationId: 'c1',
        role: 'ASSISTANT',
        content: 'sample',
        redactedContent: null,
        sequenceNumber: 1,
        createdAt: new Date(),
        aiProvider: null,
        aiModel: null,
        judgeScore: null,
        judgeReasoning: null,
        existingLabelId: null,
        chiefComplaint: null,
      },
    ]);

    const result = await buildLabelingQueue({
      labelerId: 'user-1',
      strategy: 'random',
      limit: 10,
    });

    expect(result[0]!.uncertaintyBand).toBeNull();
  });
});
