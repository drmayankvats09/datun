// ═══════════════════════════════════════════════════════════════
// WAVE 6 MASTER BARREL — verified imports from Wave 1-5
// Single import surface for all Wave 6/6.1 capabilities
// ═══════════════════════════════════════════════════════════════

// Validation
export { withTestDb, createTestDb } from './validation/test-helpers';
export { flakeRegistry, FlakeRegistry } from './validation/flake-detector';

// Probes
export {
  ALL_PROBES,
  verifyAll,
  verifyByName,
  runProbes,
  type Probe,
  type ProbeResult,
  type ProbeReport,
  type ProbeStatus,
} from './probes';

// Audit DB
export { AuditWriter } from './audit-db/audit-writer';
export { verifyAuditChain } from './audit-db/audit-verifier';
export { applyRetentionPolicy } from './audit-db/retention-policy';
export { queryAuditLog, getRunSummary } from './audit-db/audit-query';
export { migrateFileAuditToDb } from './audit-db/migrate-from-file';

// Bulk loader
export { copyLoad, writeParquet, readParquet, autoLoad } from './bulk-loader';
export { compareToBaseline, loadBaseline, saveBaseline } from './bulk-loader/baseline-comparison';

// Load bench
export { SloMonitor } from './load-bench/slo-monitor';
export { MemoryProfiler } from './load-bench/memory-profiler';
export {
  injectChaos,
  runChaosSuite,
  type ChaosFault,
  type ChaosResult,
} from './load-bench/chaos-injector';
export { dispatchChaosFailure } from './load-bench/chaos-alert-dispatcher';
export { generateMarkdownReport } from './load-bench/bench-report';

// Drift detector
export {
  detectDrift,
  snapshotDiff,
  setActiveModule,
  getInstrumentedClient,
  compareDeclarations,
} from './drift-detector';

// Multi-tenant
export {
  TenantContextSchema,
  validateTenantContext,
  isProductionTenant,
  runTenantOrchestrator,
  profileForTenant,
  engineForTenant,
  complianceFootprint,
  withTenantBlocker,
  CrossTenantQueryError,
  registerTenantCommand,
  type TenantContext,
} from './multi-tenant';

// Compat matrix
export {
  runPgMatrix,
  checkCompatibility,
  type MatrixResult,
  type CompatReport,
} from './compat-matrix';

// DR + replica
export {
  drRestore,
  runDrDrill,
  validateRecovery,
  ReplicaRouter,
  checkReplicaLag,
  type DrRestoreOptions,
  type DrRestoreResult,
  type DrDrillReport,
  type LagAlert,
} from './dr-replica';

// Differential privacy
export {
  computeEpsilon,
  validateForCompliance,
  type EpsilonReport,
} from './differential-privacy/epsilon-validator';

// OTEL
export { initOtel, shutdownOtel, getSeedTracer, withSpan } from './observability/otel-tracer';
export { withOtelTracing } from './observability/otel-prisma-extension';

// CLI registration (Wave 6 + 6.1 commands)
export { registerWave6Commands } from './cli/wave6-commands';
