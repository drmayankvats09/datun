// ═══════════════════════════════════════════════════════════════
// E2E SEED ENTRY — fixed dataset for end-to-end tests
// Re-exports from strategies/e2e-test.strategy
// ═══════════════════════════════════════════════════════════════
export { e2eTestStrategy } from '../strategies/e2e-test.strategy';

import { e2eTestStrategy } from '../strategies/e2e-test.strategy';

/** Sugar: returns the E2E strategy descriptor */
export const getE2eStrategy = (): typeof e2eTestStrategy => e2eTestStrategy;

/** Fixed seeds for deterministic E2E runs (matches Playwright + Cypress flakiness budget) */
export const E2E_FIXED_SEED = 1729; // Ramanujan's taxicab number
export const E2E_TIMEOUT_MS = 60_000;

export const E2E_METADATA = {
  name: 'e2e-test',
  description: 'Deterministic dataset with fixed seed for E2E suites (Playwright/Cypress)',
  fixedSeed: E2E_FIXED_SEED,
  durationEstimateSeconds: 15,
} as const;
