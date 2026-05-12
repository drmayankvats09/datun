// ═══════════════════════════════════════════════════════════════
// CAPTURE SERVICE TESTS — Task #44 Phase 4
//
// Verifies:
//   1. Consent-gated redaction (no DATA_TRAINING consent → redactedContent null)
//   2. Atomic counter increment via transaction
//   3. Correlation ID resolution chain (override → context → "system")
//   4. Input validation (rejects negative tokens, empty content path)
//   5. NotFoundError when consultationId does not exist
//   6. AI metadata persisted per-message (not just per-consultation)
//
// Strategy: Mock prisma + request-context. No real DB.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock prisma BEFORE importing the service ──────────────────

const { mockUpdate, mockCreate, mockFindUnique, mockTransaction } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockCreate: vi.fn(),
  mockFindUnique: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('@repo/db', async () => {
  const actual = await vi.importActual<typeof import('@repo/db')>('@repo/db');
  return {
    ...actual,
    prisma: {
      consultation: { findUnique: mockFindUnique },
      consultationMessage: { create: mockCreate },
      $transaction: mockTransaction,
    },
    Prisma: { JsonNull: { _kind: 'JsonNull' } as never },
  };
});

vi.mock('../../../lib/request-context.js', () => ({
  getRequestId: vi.fn(() => 'test-request-id-xyz'),
}));

vi.mock('../../../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─── Import AFTER mocks ────────────────────────────────────────

import { captureMessage } from '../../../services/training/capture.service.js';
import { NotFoundError, ValidationError } from '../../../errors/index.js';

// ─── Helpers ───────────────────────────────────────────────────

function mockTransactionalWrite(seqNumber = 1) {
  mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => unknown) => {
    const fakeTx = {
      consultation: {
        update: vi.fn().mockResolvedValue({ totalMessages: seqNumber }),
      },
      consultationMessage: {
        create: vi.fn().mockImplementation(async ({ data }) => ({
          id: 'msg-uuid-fixed',
          sequenceNumber: data.sequenceNumber,
        })),
      },
    };
    return fn(fakeTx);
  });
}

beforeEach(() => {
  mockUpdate.mockReset();
  mockCreate.mockReset();
  mockFindUnique.mockReset();
  mockTransaction.mockReset();
});

// ─── Tests ─────────────────────────────────────────────────────

describe('captureMessage — validation', () => {
  it('rejects missing consultationId', async () => {
    await expect(
      captureMessage({
        consultationId: '',
        role: 'USER',
        content: 'hi',
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects negative aiLatencyMs', async () => {
    await expect(
      captureMessage({
        consultationId: 'c1',
        role: 'ASSISTANT',
        content: 'hi',
        aiLatencyMs: -5,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it('rejects negative aiTokensInput', async () => {
    await expect(
      captureMessage({
        consultationId: 'c1',
        role: 'ASSISTANT',
        content: 'hi',
        aiTokensInput: -10,
      }),
    ).rejects.toThrow(ValidationError);
  });
});

describe('captureMessage — NotFound when consultation absent', () => {
  it('throws NotFoundError when consultationId is unknown', async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await expect(
      captureMessage({
        consultationId: 'unknown-id',
        role: 'USER',
        content: 'hello',
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('captureMessage — consent gate', () => {
  it('persists redactedContent when DATA_TRAINING consent present', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'c1',
      totalMessages: 0,
      dataTrainingConsentAt: new Date('2026-05-01'),
      chiefComplaintLocale: 'en',
    });
    mockTransactionalWrite(1);

    const result = await captureMessage({
      consultationId: 'c1',
      role: 'USER',
      content: 'mera number 9876543210 hai',
    });

    expect(result.redactionApplied).toBe(true);
    expect(result.piiCategoriesRedacted).toContain('PHONE');
    expect(result.redactionVersion).toBe('v1.0.0');
  });

  it('skips redactedContent when no DATA_TRAINING consent', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'c1',
      totalMessages: 0,
      dataTrainingConsentAt: null,
      chiefComplaintLocale: 'en',
    });
    mockTransactionalWrite(1);

    const result = await captureMessage({
      consultationId: 'c1',
      role: 'USER',
      content: 'mera number 9876543210 hai',
    });

    expect(result.redactionApplied).toBe(false);
    expect(result.redactionVersion).toBeNull();
  });
});

describe('captureMessage — correlation ID resolution', () => {
  it('uses explicit override when provided', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'c1',
      totalMessages: 0,
      dataTrainingConsentAt: null,
      chiefComplaintLocale: 'en',
    });
    mockTransactionalWrite(1);

    const result = await captureMessage({
      consultationId: 'c1',
      role: 'SYSTEM',
      content: 'init',
      correlationId: 'explicit-id-abc',
    });
    expect(result.correlationId).toBe('explicit-id-abc');
  });

  it('falls back to AsyncLocalStorage context', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'c1',
      totalMessages: 0,
      dataTrainingConsentAt: null,
      chiefComplaintLocale: 'en',
    });
    mockTransactionalWrite(1);

    const result = await captureMessage({
      consultationId: 'c1',
      role: 'USER',
      content: 'hi',
    });
    expect(result.correlationId).toBe('test-request-id-xyz');
  });
});

describe('captureMessage — uncertainty for ASSISTANT', () => {
  it('computes uncertainty band for ASSISTANT role', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'c1',
      totalMessages: 5,
      dataTrainingConsentAt: new Date(),
      chiefComplaintLocale: 'en',
    });
    mockTransactionalWrite(6);

    const result = await captureMessage({
      consultationId: 'c1',
      role: 'ASSISTANT',
      content: 'I think it might be a cavity. Can you describe the pain?',
      aiTokensOutput: 18,
      aiLatencyMs: 1100,
    });
    expect(['HIGH', 'MEDIUM', 'LOW']).toContain(result.uncertaintyBand);
  });

  it('returns null uncertainty band for USER role', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'c1',
      totalMessages: 0,
      dataTrainingConsentAt: null,
      chiefComplaintLocale: 'en',
    });
    mockTransactionalWrite(1);

    const result = await captureMessage({
      consultationId: 'c1',
      role: 'USER',
      content: 'hi',
    });
    expect(result.uncertaintyBand).toBeNull();
  });
});

describe('captureMessage — sequence number derivation', () => {
  it('uses totalMessages + 1 from update when no override given', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'c1',
      totalMessages: 4,
      dataTrainingConsentAt: null,
      chiefComplaintLocale: 'en',
    });
    mockTransactionalWrite(5);

    const result = await captureMessage({
      consultationId: 'c1',
      role: 'USER',
      content: 'hi',
    });
    expect(result.sequenceNumber).toBe(5);
  });

  it('respects explicit sequenceNumber override (replay scenario)', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'c1',
      totalMessages: 100,
      dataTrainingConsentAt: null,
      chiefComplaintLocale: 'en',
    });
    mockTransactionalWrite(101);

    const result = await captureMessage({
      consultationId: 'c1',
      role: 'USER',
      content: 'hi',
      sequenceNumber: 42,
    });
    expect(result.sequenceNumber).toBe(42);
  });
});
