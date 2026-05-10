// ═══════════════════════════════════════════════════════════════
// CHAOS INJECTOR — uses real Wave 4 onModuleStatusChange hook
// Pattern: env-flag tells specific modules to fail; orchestrator runs
// normally; we observe COMPLETED|FAILED|COMPENSATED counts
// ═══════════════════════════════════════════════════════════════
import { runMainOrchestrator } from '../modules/orchestrator/main-orchestrator';
import { withTestDb } from '../validation/test-helpers';

export type ChaosFault =
  | { kind: 'AI_TIMEOUT' }
  | { kind: 'DB_DEADLOCK' }
  | { kind: 'NETWORK_PARTITION' }
  | { kind: 'OOM_PROBE' };

export interface ChaosResult {
  fault: ChaosFault;
  status: 'graceful' | 'crashed';
  observedBehaviour: string;
  completedCount: number;
  compensatedCount: number;
  failedCount: number;
}

const FAULT_ENV = {
  AI_TIMEOUT: 'CHAOS_FAIL_AI_OPS',
  DB_DEADLOCK: 'CHAOS_FAIL_CLINICAL',
  NETWORK_PARTITION: 'CHAOS_FAIL_INTEGRATIONS',
  OOM_PROBE: 'CHAOS_FAIL_ANALYTICS',
};

export async function injectChaos(fault: ChaosFault): Promise<ChaosResult> {
  const envKey = FAULT_ENV[fault.kind];
  process.env[envKey] = '1';
  try {
    return await withTestDb(async ({ prisma }) => {
      const result = await runMainOrchestrator({
        prisma,
        env: 'test',
        scenario: 'minimal',
        masterSeed: 42,
        stopOnError: false,
        compensateOnFailure: true,
      });
      return {
        fault,
        status:
          result.status === 'COMPLETED' || result.status === 'COMPENSATED' ? 'graceful' : 'crashed',
        observedBehaviour: `status=${result.status} completed=${result.completedCount} failed=${result.failedCount} compensated=${result.compensatedCount}`,
        completedCount: result.completedCount,
        compensatedCount: result.compensatedCount,
        failedCount: result.failedCount,
      };
    });
  } finally {
    delete process.env[envKey];
  }
}

export async function runChaosSuite(): Promise<ChaosResult[]> {
  const faults: ChaosFault[] = [
    { kind: 'AI_TIMEOUT' },
    { kind: 'DB_DEADLOCK' },
    { kind: 'NETWORK_PARTITION' },
    { kind: 'OOM_PROBE' },
  ];
  const results: ChaosResult[] = [];
  for (const f of faults) results.push(await injectChaos(f));
  return results;
}

if (require.main === module) {
  runChaosSuite().then((r) => {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.every((x) => x.status === 'graceful') ? 0 : 1);
  });
}
