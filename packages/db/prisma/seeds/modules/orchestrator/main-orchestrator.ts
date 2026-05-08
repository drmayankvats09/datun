// ═══════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR — top-level runner
// Wires SagaOrchestrator with full module list + scenario filters
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';
import { ALL_FACTORIES_V2 } from '../../factories';
import {
  SagaOrchestrator,
  type OrchestratorConfig,
  type OrchestratorRunResult,
} from '../runtime/saga-orchestrator';
import { ALL_MODULES, getModulesByCategory } from '..';
import { createLogger } from '../core/logger';
import type { Environment, ModuleCategory, SeedModule, TenantContext } from '../core/module.types';
import { buildManifest, printManifest } from '../core/manifest';

export interface RunMainOrchestratorOptions {
  readonly prisma: PrismaClient;
  readonly env: Environment;
  readonly scenario?: 'minimal' | 'demo' | 'load-test' | 'full';
  readonly masterSeed?: number;
  readonly includeCategories?: readonly ModuleCategory[];
  readonly excludeCategories?: readonly ModuleCategory[];
  readonly includeModuleNames?: readonly string[];
  readonly excludeModuleNames?: readonly string[];
  readonly tenantContext?: TenantContext;
  readonly resumeFromRunId?: string;
  readonly dryRun?: boolean;
  readonly parallelExec?: boolean;
  readonly stopOnError?: boolean;
  readonly compensateOnFailure?: boolean;
  readonly printManifestFirst?: boolean;
  readonly abortSignal?: AbortSignal;
}

const SCENARIO_FILTERS: Record<
  NonNullable<RunMainOrchestratorOptions['scenario']>,
  readonly ModuleCategory[]
> = {
  minimal: ['reference', 'identity', 'organization', 'people'],
  demo: [
    'reference',
    'identity',
    'organization',
    'people',
    'clinical',
    'operational',
    'compliance',
  ],
  'load-test': [
    'reference',
    'identity',
    'organization',
    'people',
    'clinical',
    'operational',
    'compliance',
    'analytics',
    'time-travel',
  ],
  full: [
    'reference',
    'identity',
    'organization',
    'people',
    'clinical',
    'operational',
    'compliance',
    'ai-ops',
    'commerce',
    'integrations',
    'support',
    'marketing',
    'analytics',
    'time-travel',
    'scenarios',
  ],
};

function selectModules(opts: RunMainOrchestratorOptions): readonly SeedModule[] {
  let modules: SeedModule[] = [...ALL_MODULES];

  if (opts.scenario) {
    const allowedCategories = SCENARIO_FILTERS[opts.scenario];
    modules = modules.filter((m) => allowedCategories.includes(m.category));
  }

  if (opts.includeCategories) {
    modules = modules.filter((m) => opts.includeCategories!.includes(m.category));
  }
  if (opts.excludeCategories) {
    modules = modules.filter((m) => !opts.excludeCategories!.includes(m.category));
  }
  if (opts.includeModuleNames) {
    modules = modules.filter((m) => opts.includeModuleNames!.includes(m.name));
  }
  if (opts.excludeModuleNames) {
    modules = modules.filter((m) => !opts.excludeModuleNames!.includes(m.name));
  }

  return modules;
}

export async function runMainOrchestrator(
  opts: RunMainOrchestratorOptions,
): Promise<OrchestratorRunResult> {
  const modules = selectModules(opts);
  const logger = createLogger({ component: 'main-orchestrator' });

  if (opts.printManifestFirst) {
    console.log(printManifest(modules));
    console.log('');
  }

  const config: OrchestratorConfig = {
    prisma: opts.prisma,
    factories: ALL_FACTORIES_V2,
    modules,
    env: opts.env,
    scenario: opts.scenario ?? 'demo',
    masterSeed: opts.masterSeed ?? 42,
    tenantContext: opts.tenantContext,
    resumeFromRunId: opts.resumeFromRunId,
    dryRun: opts.dryRun,
    parallelExec: opts.parallelExec,
    stopOnError: opts.stopOnError,
    compensateOnFailure: opts.compensateOnFailure,
    logger,
    abortSignal: opts.abortSignal,
    onModuleStatusChange: (m, status, result) => {
      if (status === 'COMPLETED' && result) {
        logger.info(`✓ ${m.name}`, {
          records: result.recordsCreated,
          durationMs: result.durationMs.toFixed(0),
        });
      } else if (status === 'SKIPPED') {
        logger.info(`⏭️  ${m.name} (skipped)`);
      } else if (status === 'FAILED') {
        logger.error(`✗ ${m.name}`, { error: result?.error });
      }
    },
  };

  const orchestrator = new SagaOrchestrator(config);
  return orchestrator.execute();
}
