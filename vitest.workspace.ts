// ═══════════════════════════════════════════════════════════════
// VITEST WORKSPACE — Monorepo test orchestration
// Each package has its own config. Turbo runs all in parallel.
// Pattern: Turborepo, Cal.com, Vercel — all use Vitest workspaces.
// ═══════════════════════════════════════════════════════════════

import { defineWorkspace } from 'vitest/config';

export default defineWorkspace(['apps/api/vitest.config.ts', 'packages/shared/vitest.config.ts']);
