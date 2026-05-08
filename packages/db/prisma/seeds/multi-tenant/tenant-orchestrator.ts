// ═══════════════════════════════════════════════════════════════
// TENANT ORCHESTRATOR — kicks off main seed orchestrator with tenant scope
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';
import type { TenantContext } from './tenant-context';
import { runMainOrchestrator } from '../modules/orchestrator/main-orchestrator';
import type { OrchestratorRunResult } from '../modules/runtime/saga-orchestrator';

/**
 * Tenant-scoped run options. NOTE: We intentionally redefine `TenantRunOptions`
 * here (instead of importing from tenant-context.ts) because this orchestrator
 * needs the full prisma + scenario shape, distinct from the lightweight runId/seed
 * shape exported from tenant-context.ts.
 */
export interface TenantOrchestratorOptions {
  prisma: PrismaClient;
  tenant: TenantContext;
  scenario: 'minimal' | 'demo' | 'load-test' | 'full';
  masterSeed?: number;
  dryRun?: boolean;
}

export async function runTenantOrchestrator(
  opts: TenantOrchestratorOptions,
): Promise<OrchestratorRunResult> {
  return runMainOrchestrator({
    prisma: opts.prisma,
    env: 'staging',
    scenario: opts.scenario,
    masterSeed: opts.masterSeed ?? 42,
    tenantContext: opts.tenant,
    dryRun: opts.dryRun,
    stopOnError: true,
    compensateOnFailure: true,
  });
}
