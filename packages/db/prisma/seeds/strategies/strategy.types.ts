// ═══════════════════════════════════════════════════════════════
// STRATEGY TYPES — declarative scenario contracts
// Source: Saga state machines (DZone) + Datun 50 archetypes × 8 locales × 5 SES tiers
// ═══════════════════════════════════════════════════════════════

import type { Environment, ModuleCategory, TenantContext } from '../modules/core/module.types';

export type StrategyName =
  | 'minimal'
  | 'demo'
  | 'staging'
  | 'load-test'
  | 'e2e-test'
  | 'perf-bench'
  | 'regression'
  | 'recovery';

export interface StrategySpec {
  readonly name: StrategyName;
  readonly description: string;
  readonly env: Environment;
  readonly includeCategories: readonly ModuleCategory[];
  readonly excludeCategories?: readonly ModuleCategory[];
  readonly excludeModuleNames?: readonly string[];
  readonly counts: StrategyCounts;
  readonly tenantContext?: TenantContext;
  readonly anonymize: boolean;
  readonly snapshotAfter: boolean;
  readonly snapshotName?: string;
  readonly parallelExec: boolean;
  readonly dryRunFirst: boolean;
  readonly stopOnError: boolean;
  readonly compensateOnFailure: boolean;
  readonly masterSeedOverride?: number;
  readonly maxDurationMinutes: number;
  readonly memoryBudgetMb: number;
  readonly expectedScenarioCount: number;
}

export interface StrategyCounts {
  readonly clinics: number;
  readonly doctors: number;
  readonly patients: number;
  readonly consultations: number;
  readonly appointments: number;
  readonly historicalDaysBack: number;
}
