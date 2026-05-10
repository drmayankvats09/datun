// ═══════════════════════════════════════════════════════════════
// SCENARIO RUNNER — runs a single named scenario end-to-end
// Used for testing + demo prep
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';
import { runMainOrchestrator } from './main-orchestrator';
import type { OrchestratorRunResult } from '../runtime/saga-orchestrator';

export type ScenarioName =
  | 'minimal'
  | 'demo'
  | 'load-test'
  | 'full'
  | 'reference-only'
  | 'people-only'
  | 'clinical-only';

export async function runScenario(
  prisma: PrismaClient,
  scenarioName: ScenarioName,
  opts: { dryRun?: boolean; masterSeed?: number; printManifestFirst?: boolean } = {},
): Promise<OrchestratorRunResult> {
  switch (scenarioName) {
    case 'minimal':
    case 'demo':
    case 'load-test':
    case 'full':
      return runMainOrchestrator({
        prisma,
        env: 'development',
        scenario: scenarioName,
        ...opts,
      });
    case 'reference-only':
      return runMainOrchestrator({
        prisma,
        env: 'development',
        includeCategories: ['reference'],
        ...opts,
      });
    case 'people-only':
      return runMainOrchestrator({
        prisma,
        env: 'development',
        includeCategories: ['reference', 'identity', 'organization', 'people'],
        ...opts,
      });
    case 'clinical-only':
      return runMainOrchestrator({
        prisma,
        env: 'development',
        includeCategories: ['reference', 'identity', 'organization', 'people', 'clinical'],
        ...opts,
      });
    default:
      throw new Error(`Unknown scenario: ${scenarioName}`);
  }
}
