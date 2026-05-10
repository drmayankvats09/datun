// ═══════════════════════════════════════════════════════════════
// WAVE 8 MASTER BARREL — Production Data Quality
// ═══════════════════════════════════════════════════════════════

// Contracts
export {
  PATIENT_CONTRACT,
  CONSULTATION_CONTRACT,
  ALL_CONTRACTS,
  validateContract,
  type DataContract,
  type FieldContract,
  type FreshnessContract,
  type VolumeContract,
  type ContractViolation,
  type ContractStatus,
} from './data-quality/contracts';

// Soda
export {
  runSodaScan,
  type SodaScanResult,
  type SodaCheckResult,
} from './data-quality/soda/soda-runner';

// Expectations
export {
  runAllExpectations,
  ALL_EXPECTATIONS,
  type ExpectationSuiteResult,
} from './data-quality/expectations/expectation-runner';
export type {
  Expectation,
  ExpectationResult,
  Severity,
} from './data-quality/expectations/expectation.types';
export { MEDICATION_NSAID_BLOOD_THINNER_EXPECTATION } from './data-quality/expectations/medication-safety-expectation';
export { AGE_SANITY_EXPECTATION } from './data-quality/expectations/age-sanity-expectation';
export { LOCALE_VALIDITY_EXPECTATION } from './data-quality/expectations/locale-validity-expectation';

// Anomaly
export {
  detectZScoreAnomalies,
  detectIqrAnomalies,
} from './data-quality/anomaly/statistical-detector';
export { chiSquaredShift } from './data-quality/anomaly/categorical-detector';
export { AnomalyStore } from './data-quality/anomaly/anomaly-store';
export type { Anomaly, AnomalyKind } from './data-quality/anomaly/anomaly.types';

// Quarantine
export {
  quarantineRow,
  listPendingQuarantine,
  attemptAutoRemediation,
  type RemediationResult,
} from './data-quality/quarantine';

// SLO
export { evaluateSlo, evaluateAllSlos } from './data-quality/slo/slo-evaluator';
export {
  PATIENT_FRESHNESS_SLO,
  CONSULTATION_COMPLETION_SLO,
  AI_PROMPT_VERSION_COVERAGE_SLO,
  ALL_SLOS,
} from './data-quality/slo/datun-slos';
export type { SloDefinition, SloStatus } from './data-quality/slo/slo.types';
// ─── Orchestrator (single entry point for production) ───────────
export { runDataQualityOrchestration } from './data-quality/orchestrator';
export type {
  OrchestratorReport,
  OrchestratorOptions,
  LayerVerdict,
  LayerSummary,
} from './data-quality/orchestrator';

// ─── Scorecard (per-table quality grades) ───────────────────────
export { generateScorecard } from './data-quality/scorecard';
export type { Scorecard, TableScorecard } from './data-quality/scorecard';
