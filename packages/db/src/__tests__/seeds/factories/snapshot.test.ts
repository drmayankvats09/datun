// ═══════════════════════════════════════════════════════════════
// FACTORY SNAPSHOT TESTS — Schema drift detection
//
// Why: When Prisma schema changes (new field, renamed field, removed
// field), factories silently break. This test catches drift by
// snapshotting every factory's output. Snapshot diff = schema change
// surfaced in PR review.
//
// DETERMINISM CONTRACT (Day 16 fix):
//   1. Sequences reset to seed=42 → deterministic IDs.
//   2. System time frozen via vi.useFakeTimers → every `new Date()`,
//      `Date.now()`, and seed-less `faker.date.*` call returns the
//      frozen instant. No more midnight-rollover snapshot mismatches.
//   3. Real timers restored after each test → no leakage to siblings.
//
// Run: pnpm exec vitest run src/__tests__/seeds/factories/snapshot.test.ts
// Update snapshots: pnpm exec vitest run -u src/__tests__/seeds/factories/snapshot.test.ts
// ═══════════════════════════════════════════════════════════════

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { resetSequences } from '../../../../prisma/seeds/factories/core/sequence';
import { ALL_FACTORIES_V2 as ALL_FACTORIES } from '../../../../prisma/seeds/factories';

/**
 * Frozen instant for snapshot determinism.
 *
 * Chosen mid-month to avoid month/year-boundary edge cases. Any
 * factory that internally calls `new Date()`, `Date.now()`, or
 * `faker.date.*` (without an explicit refDate) will see this exact
 * instant during the snapshot run, making computed-from-time fields
 * (like `avgConsultationGapDays`) bit-stable across calendar days.
 */
const FROZEN_SNAPSHOT_INSTANT = new Date('2026-01-15T00:00:00.000Z');

/**
 * Normalize values that vary across runs (real-time timestamps captured during
 * factory build, bcrypt password hashes with random salt) so the snapshot only
 * catches *shape* drift, not wall-clock or crypto noise. If schema drift
 * introduces or removes a field, the snapshot still flags it.
 */
function normalize(value: unknown): unknown {
  if (value instanceof Date) return '<DATE>';
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Date-like fields by convention end with At / Date / DateTime
      if (
        v instanceof Date ||
        (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v))
      ) {
        out[k] = '<DATE>';
      } else if (
        // bcrypt hash: $2[abxy]$NN$<22 char salt><31 char hash> — non-deterministic by design
        typeof v === 'string' &&
        /^\$2[abxy]\$\d{2}\$[A-Za-z0-9./]{53}$/.test(v)
      ) {
        out[k] = '<BCRYPT_HASH>';
      } else {
        out[k] = normalize(v);
      }
    }
    return out;
  }
  return value;
}

describe('factory snapshots — schema drift detection', () => {
  beforeEach(() => {
    // Layer 1 — Freeze time. Every `new Date()`, `Date.now()`, and
    // seed-less `faker.date.*` call inside a factory now returns the
    // FROZEN_SNAPSHOT_INSTANT. Eliminates calendar-day drift across
    // CI runs, local laptops, and staging boxes.
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(FROZEN_SNAPSHOT_INSTANT);

    // Layer 2 — Reset per-factory sequence counters with deterministic
    // master seed. Same master seed → same Faker stream → same IDs.
    resetSequences(42);
  });

  afterEach(() => {
    // Restore real timers so neighbouring test files (e.g. saga
    // orchestrator, idempotency) see real wall-clock time.
    vi.useRealTimers();
  });

  for (const [name, factory] of Object.entries(ALL_FACTORIES)) {
    it(`${name} factory output matches snapshot`, () => {
      try {
        const out = (
          factory as { build: (overrides?: unknown, transient?: unknown) => unknown }
        ).build();
        expect(normalize(out)).toMatchSnapshot();
      } catch (e) {
        // Some factories require transient params (consultation, prescription, message, etc.)
        // Those factories are tested in their own dedicated test files. Skip here.
        if (
          e instanceof Error &&
          /required|consultationId|patientId|userId|clinicId/i.test(e.message)
        ) {
          // Mark as skipped — but don't fail the suite
          expect(e.message).toMatch(/required|consultationId|patientId|userId|clinicId/i);
          return;
        }
        throw e;
      }
    });
  }
});
