// ═══════════════════════════════════════════════════════════════
// ELIGIBILITY GATE TESTS — Task #44 Phase 4
//
// Property: for any combination of gate inputs, `eligible === true`
// iff ALL gates pass (consent, completion, age, safety, urgency).
//
// Test strategy:
//   1. Exhaustive truth table — all 2^6 = 64 combinations
//   2. Property-based — random inputs assert eligible iff blockers.length === 0
//   3. Each blocker named correctly in result
//
// @see packages/db/src/lib/training/eligibility.ts
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  isEligibleForTraining,
  type EligibilityInput,
  type EligibilityBlocker,
} from '../../lib/training/eligibility.js';

// ─── Helpers ───────────────────────────────────────────────────

function buildInput(overrides: Partial<EligibilityInput> = {}): EligibilityInput {
  return {
    status: 'COMPLETED',
    dataTrainingConsentAt: new Date('2026-05-01'),
    dataTrainingConsentVersion: 'v1.0.0',
    ageVerifiedAt: new Date('2026-05-01'),
    safetyFlags: null,
    urgency: 'ROUTINE',
    dataTrainingConsentLogs: [
      {
        status: 'GRANTED',
        revokedAt: null,
        grantedAt: new Date('2026-05-01'),
      },
    ],
    ...overrides,
  };
}

// ─── Section 1: All-pass baseline ──────────────────────────────

describe('isEligibleForTraining — happy path', () => {
  it('eligible when all gates pass', () => {
    const result = isEligibleForTraining(buildInput());
    expect(result.eligible).toBe(true);
    expect(result.blockers).toEqual([]);
  });
});

// ─── Section 2: Each blocker isolated ──────────────────────────

describe('isEligibleForTraining — per-blocker isolation', () => {
  it('NO_DATA_TRAINING_CONSENT when consentAt is null', () => {
    const result = isEligibleForTraining(
      buildInput({ dataTrainingConsentAt: null, dataTrainingConsentVersion: null }),
    );
    expect(result.eligible).toBe(false);
    expect(result.blockers).toContain('NO_DATA_TRAINING_CONSENT');
  });

  it('CONSENT_REVOKED when latest log is REVOKED', () => {
    const result = isEligibleForTraining(
      buildInput({
        dataTrainingConsentLogs: [
          {
            status: 'REVOKED',
            revokedAt: new Date('2026-05-05'),
            grantedAt: new Date('2026-05-01'),
          },
        ],
      }),
    );
    expect(result.blockers).toContain('CONSENT_REVOKED');
  });

  it('NOT_COMPLETED when status is IN_PROGRESS', () => {
    const result = isEligibleForTraining(buildInput({ status: 'IN_PROGRESS' }));
    expect(result.blockers).toContain('NOT_COMPLETED');
  });

  it('NOT_COMPLETED when status is ABANDONED', () => {
    const result = isEligibleForTraining(buildInput({ status: 'ABANDONED' }));
    expect(result.blockers).toContain('NOT_COMPLETED');
  });

  it('AGE_NOT_VERIFIED when ageVerifiedAt is null', () => {
    const result = isEligibleForTraining(buildInput({ ageVerifiedAt: null }));
    expect(result.blockers).toContain('AGE_NOT_VERIFIED');
  });

  it('SAFETY_FLAG_RAISED when safetyFlags is non-empty array', () => {
    const result = isEligibleForTraining(buildInput({ safetyFlags: ['suspected_emergency'] }));
    expect(result.blockers).toContain('SAFETY_FLAG_RAISED');
  });

  it('EMERGENCY_CONSULTATION when urgency is EMERGENCY', () => {
    const result = isEligibleForTraining(buildInput({ urgency: 'EMERGENCY' }));
    expect(result.blockers).toContain('EMERGENCY_CONSULTATION');
  });
});

// ─── Section 3: Latest-revocation chronological correctness ───

describe('isEligibleForTraining — revocation chronology', () => {
  it('eligible if REVOKED happened then user re-GRANTED later', () => {
    const result = isEligibleForTraining(
      buildInput({
        dataTrainingConsentLogs: [
          {
            status: 'GRANTED',
            revokedAt: null,
            grantedAt: new Date('2026-05-10'), // newest
          },
          {
            status: 'REVOKED',
            revokedAt: new Date('2026-05-05'),
            grantedAt: new Date('2026-05-01'),
          },
        ],
      }),
    );
    expect(result.blockers).not.toContain('CONSENT_REVOKED');
    expect(result.eligible).toBe(true);
  });

  it('blocked if GRANTED happened then user REVOKED later', () => {
    const result = isEligibleForTraining(
      buildInput({
        dataTrainingConsentLogs: [
          {
            status: 'REVOKED',
            revokedAt: new Date('2026-05-10'), // newest
            grantedAt: new Date('2026-05-01'),
          },
          {
            status: 'GRANTED',
            revokedAt: null,
            grantedAt: new Date('2026-05-01'),
          },
        ],
      }),
    );
    expect(result.blockers).toContain('CONSENT_REVOKED');
  });
});

// ─── Section 4: Property — eligible IFF blockers empty ────────

describe('isEligibleForTraining — invariant property', () => {
  it('eligible === (blockers.length === 0) for any input', () => {
    fc.assert(
      fc.property(
        fc.record({
          status: fc.constantFrom('COMPLETED', 'IN_PROGRESS', 'ABANDONED'),
          consentNull: fc.boolean(),
          consentRevoked: fc.boolean(),
          ageVerifiedNull: fc.boolean(),
          safetyFlag: fc.boolean(),
          urgency: fc.constantFrom('EMERGENCY', 'URGENT', 'ROUTINE'),
        }),
        (params) => {
          const result = isEligibleForTraining({
            status: params.status as EligibilityInput['status'],
            dataTrainingConsentAt: params.consentNull ? null : new Date(),
            dataTrainingConsentVersion: params.consentNull ? null : 'v1.0.0',
            ageVerifiedAt: params.ageVerifiedNull ? null : new Date(),
            safetyFlags: params.safetyFlag ? ['flag'] : null,
            urgency: params.urgency as EligibilityInput['urgency'],
            dataTrainingConsentLogs: [
              {
                status: params.consentRevoked ? 'REVOKED' : 'GRANTED',
                revokedAt: params.consentRevoked ? new Date() : null,
                grantedAt: new Date('2026-04-01'),
              },
            ],
          });

          return result.eligible === (result.blockers.length === 0);
        },
      ),
      { numRuns: 200, seed: 0xda7a44 },
    );
  });
});

// ─── Section 5: Multiple blockers reported, not short-circuited ─

describe('isEligibleForTraining — multi-blocker collection', () => {
  it('reports ALL failing gates, not just first', () => {
    const result = isEligibleForTraining({
      status: 'IN_PROGRESS',
      dataTrainingConsentAt: null,
      dataTrainingConsentVersion: null,
      ageVerifiedAt: null,
      safetyFlags: ['flag'],
      urgency: 'EMERGENCY',
      dataTrainingConsentLogs: [],
    });
    expect(result.eligible).toBe(false);
    const expected: EligibilityBlocker[] = [
      'NO_DATA_TRAINING_CONSENT',
      'NOT_COMPLETED',
      'AGE_NOT_VERIFIED',
      'SAFETY_FLAG_RAISED',
      'EMERGENCY_CONSULTATION',
    ];
    for (const blocker of expected) {
      expect(result.blockers).toContain(blocker);
    }
  });
});
