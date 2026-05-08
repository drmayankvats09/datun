// ═══════════════════════════════════════════════════════════════
// WAVE 12 (Essentials) MASTER BARREL
// ═══════════════════════════════════════════════════════════════

// Drift
export { detectAgeDrift, ksStatistic } from './continuous-training/drift/input-drift';
export { detectUrgencyDistributionDrift } from './continuous-training/drift/concept-drift';
export { DriftStore } from './continuous-training/drift/drift-store';
export type { DriftKind, DriftAlert } from './continuous-training/drift/drift.types';

// Guardrails
export {
  checkInputGuardrails,
  checkOutputGuardrails,
  checkMedicationGuardrails,
  logGuardrailResult,
} from './continuous-training/guardrails';
export type {
  GuardrailKind,
  GuardrailViolation,
  GuardrailResult,
  GuardrailContext,
} from './continuous-training/guardrails';

// Experiments
export { assignVariant, bucketHash100 } from './continuous-training/experiments/traffic-splitter';
export { checkSrm, type SrmCheckResult } from './continuous-training/experiments/srm-detector';
export {
  mSprtTest,
  type SequentialTestResult,
} from './continuous-training/experiments/sequential-test';
export {
  recordAssignment,
  summarizeMetric,
  checkExperimentSrm,
} from './continuous-training/experiments/experiment-store';
export type {
  ExperimentStatus,
  Variant,
  ExperimentDefinition,
  ExperimentResult,
  ExperimentSummary,
} from './continuous-training/experiments/experiment.types';

// Shadow
export { runShadow, type ShadowRunResult } from './continuous-training/shadow/shadow-runner';
export { compareShadow } from './continuous-training/shadow/shadow-comparator';
export { saveShadowComparison } from './continuous-training/shadow/shadow-store';
export type { ShadowComparison } from './continuous-training/shadow/shadow.types';

// Prompts
export { PromptStore, type PromptDraft } from './continuous-training/prompts/prompt-store';
export {
  PromptRolloutOrchestrator,
  type RolloutDecision,
} from './continuous-training/prompts/prompt-rollout';
// ─── Drift orchestrator (production entry point) ────────────────
export {
  runDriftOrchestration,
  runSingleDriftKind,
} from './continuous-training/drift/drift-orchestrator';
export type {
  DriftOrchestratorReport,
  DriftOrchestratorOptions,
  OrchestratorVerdict as DriftOrchestratorVerdict,
  DriftLayerSummary,
} from './continuous-training/drift/drift-orchestrator';
