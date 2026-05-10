// ═══════════════════════════════════════════════════════════════
// VITEST GLOBAL SETUP — Manages shared Postgres testcontainer
//
// Runs once before ALL test files, tears down once at the end.
// Per-test DB clones happen inside test-helpers.ts createTestDb().
// ═══════════════════════════════════════════════════════════════

import { teardownContainer } from './prisma/seeds/validation/test-helpers';

export async function setup(): Promise<void> {
  // Container bootstrapping happens lazily on first createTestDb() call.
  // This ensures tests that don't need a DB (e.g. pure factory tests)
  // don't pay the ~10s startup cost.
  console.log('[vitest] Test environment ready (lazy testcontainer init)');
}

export async function teardown(): Promise<void> {
  console.log('[vitest] Tearing down testcontainers...');
  await teardownContainer();
  console.log('[vitest] Teardown complete');
}
