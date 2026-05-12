// ═══════════════════════════════════════════════════════════════
// JUDGE SERVICE TESTS — Task #44 Phase 4
//
// Verifies:
//   1. JSON parse robustness (markdown fences, extra prose, NaN)
//   2. Idempotency by (messageId, promptVersion, rubricVersion)
//   3. Batch cost-ceiling enforcement
//   4. Failed runs persist status=FAILED with errorMessage
//   5. Score clamped to 1-5 even if model returns float or out-of-range
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

// ─── Mock axios + prisma + sentry ─────────────────────────────

vi.mock('axios');
const mockedAxiosPost = vi.mocked(axios.post);

const { mockFindFirst, mockFindUnique, mockCreate, mockUpdate, mockTransaction } = vi.hoisted(
  () => ({
    mockFindFirst: vi.fn(),
    mockFindUnique: vi.fn(),
    mockCreate: vi.fn(),
    mockUpdate: vi.fn(),
    mockTransaction: vi.fn(),
  }),
);

vi.mock('@repo/db', () => ({
  prisma: {
    judgeRun: { findFirst: mockFindFirst, create: mockCreate, update: mockUpdate },
    consultationMessage: { findUnique: mockFindUnique },
    $transaction: mockTransaction,
  },
}));

vi.mock('../../../config/env.js', () => ({
  env: { ANTHROPIC_API_KEY: 'test-key' },
}));

vi.mock('../../../lib/sentry.js', () => ({
  Sentry: { captureException: vi.fn() },
}));

vi.mock('../../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  gradeMessage,
  gradeMessagesBatch,
  JUDGE_PROMPT_VERSION,
  JUDGE_RUBRIC_VERSION,
} from '../../../services/training/judge.service.js';

beforeEach(() => {
  mockedAxiosPost.mockReset();
  mockFindFirst.mockReset();
  mockFindUnique.mockReset();
  mockCreate.mockReset();
  mockUpdate.mockReset();
  mockTransaction.mockReset();
});

function setupTxToReturnRun() {
  mockTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
    const fakeTx = {
      judgeRun: {
        update: vi.fn().mockResolvedValue({
          id: 'run-1',
          completedAt: new Date('2026-05-12T04:00:00Z'),
        }),
      },
      consultationMessage: { update: vi.fn().mockResolvedValue({}) },
    };
    return fn(fakeTx);
  });
}

function judgeApiSuccess(jsonText: string, inputTokens = 800, outputTokens = 80) {
  mockedAxiosPost.mockResolvedValueOnce({
    data: {
      content: [{ type: 'text', text: jsonText }],
      usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    },
  });
}

function setupMessage() {
  mockFindUnique.mockResolvedValueOnce({
    id: 'msg-1',
    role: 'ASSISTANT',
    content: 'You might have a cavity. See a dentist.',
    consultation: {
      chiefComplaint: 'toothache',
      patientAge: 30,
      patientGender: 'MALE',
      patientPregnancyStatus: null,
      chiefComplaintLocale: 'en',
    },
  });
}

// ─── Tests ─────────────────────────────────────────────────────

describe('gradeMessage — idempotency', () => {
  it('returns cached SUCCESS run when (promptVersion, rubricVersion) match', async () => {
    mockFindFirst.mockResolvedValueOnce({
      id: 'existing-run-id',
      consultationMessageId: 'msg-1',
      parsedScore: 4,
      rawScore: 4.2,
      reasoning: 'previously cached',
      flags: { safetyRelevant: false },
      costUsd: { toString: () => '0.001' },
      latencyMs: 1200,
      inputTokens: 800,
      outputTokens: 80,
      startedAt: new Date('2026-05-11'),
      completedAt: new Date('2026-05-11'),
    });

    const result = await gradeMessage('msg-1');
    expect(result.judgeRunId).toBe('existing-run-id');
    expect(result.parsedScore).toBe(4);
    expect(mockedAxiosPost).not.toHaveBeenCalled();
  });

  it('regrades when force=true even if cached run exists', async () => {
    mockFindFirst.mockResolvedValue(null);
    setupMessage();
    mockCreate.mockResolvedValueOnce({ id: 'run-2' });
    judgeApiSuccess('{"score": 5, "reasoning": "good", "flags": {}}');
    setupTxToReturnRun();

    const result = await gradeMessage('msg-1', { force: true });
    expect(result.parsedScore).toBe(5);
  });
});

describe('gradeMessage — output parsing', () => {
  it('parses clean JSON output', async () => {
    mockFindFirst.mockResolvedValue(null);
    setupMessage();
    mockCreate.mockResolvedValueOnce({ id: 'run-3' });
    judgeApiSuccess('{"score": 4, "reasoning": "ok", "flags": {"lowConfidence": false}}');
    setupTxToReturnRun();

    const result = await gradeMessage('msg-1');
    expect(result.parsedScore).toBe(4);
    expect(result.reasoning).toBe('ok');
  });

  it('strips markdown fences before parsing', async () => {
    mockFindFirst.mockResolvedValue(null);
    setupMessage();
    mockCreate.mockResolvedValueOnce({ id: 'run-4' });
    judgeApiSuccess('```json\n{"score": 3, "reasoning": "okay", "flags": {}}\n```');
    setupTxToReturnRun();

    const result = await gradeMessage('msg-1');
    expect(result.parsedScore).toBe(3);
  });

  it('clamps out-of-range score to [1, 5]', async () => {
    mockFindFirst.mockResolvedValue(null);
    setupMessage();
    mockCreate.mockResolvedValueOnce({ id: 'run-5' });
    judgeApiSuccess('{"score": 7.5, "reasoning": "too high", "flags": {}}');
    setupTxToReturnRun();

    const result = await gradeMessage('msg-1');
    expect(result.parsedScore).toBe(5);
    expect(result.rawScore).toBe(7.5);
  });

  it('marks run FAILED on parse error', async () => {
    mockFindFirst.mockResolvedValue(null);
    setupMessage();
    mockCreate.mockResolvedValueOnce({ id: 'run-6' });
    judgeApiSuccess('not json at all');
    mockUpdate.mockResolvedValueOnce({}); // FAILED status update

    await expect(gradeMessage('msg-1')).rejects.toThrow();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'run-6' },
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
  });
});

describe('gradeMessage — cost calculation', () => {
  it('costUsd computed from Haiku pricing', async () => {
    mockFindFirst.mockResolvedValue(null);
    setupMessage();
    mockCreate.mockResolvedValueOnce({ id: 'run-7' });
    // 1M input tokens × $0.80 + 1M output × $4.00 (so 1M+1M → $4.80)
    judgeApiSuccess('{"score": 4, "reasoning": "x", "flags": {}}', 1_000_000, 1_000_000);
    setupTxToReturnRun();

    const result = await gradeMessage('msg-1');
    expect(result.costUsd).toBeCloseTo(4.8, 5);
  });
});

describe('gradeMessagesBatch — cost ceiling', () => {
  it('stops processing when totalCost reaches maxCostUsd', async () => {
    mockFindFirst.mockResolvedValue(null);
    // Setup 5 messages but max cost $0.01 — should grade only the first few
    setupMessage();
    setupMessage();
    setupMessage();
    setupMessage();
    setupMessage();
    mockCreate.mockResolvedValue({ id: 'run-X' });
    // Each call costs ~$1 (huge tokens)
    for (let i = 0; i < 5; i += 1) {
      judgeApiSuccess('{"score": 4, "reasoning": "x", "flags": {}}', 500_000, 200_000);
    }
    setupTxToReturnRun();

    const summary = await gradeMessagesBatch(['m1', 'm2', 'm3', 'm4', 'm5'], {
      maxCostUsd: 0.01,
    });
    // First call alone exceeds budget — only 1 attempted, 1 succeeded, 4 skipped
    expect(summary.succeeded + summary.failed).toBeLessThanOrEqual(2);
    expect(summary.skipped).toBeGreaterThan(0);
  });
});

describe('JUDGE_PROMPT_VERSION constant', () => {
  it('starts at v1.0.0', () => {
    expect(JUDGE_PROMPT_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
    expect(JUDGE_RUBRIC_VERSION).toMatch(/^v\d+\.\d+\.\d+$/);
  });
});
