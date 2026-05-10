// ═══════════════════════════════════════════════════════════════
// WAVE 7 — AI Training Foundation: Master Barrel
//
// Single import entry for any consumer. Re-exports actual public
// symbols from Wave 7's 6 layers: eval, synthesis, quality, lineage,
// RLHF, privacy budget.
// ═══════════════════════════════════════════════════════════════

// ─── Eval layer ──────────────────────────────────────────────────
export { runEvalSuite, AnthropicAdapter } from './ai-training/eval/eval-runner';
export type { ModelAdapter } from './ai-training/eval/eval-runner';
export { judgeResponse } from './ai-training/eval/llm-judge';
export { analyzeCoverage } from './ai-training/eval/eval-coverage';
export { compareToBaseline, promoteBaseline } from './ai-training/eval/regression-suite';
export type { RegressionReport } from './ai-training/eval/regression-suite';
export type {
  EvalCase,
  EvalResult,
  EvalSuiteResult,
  Urgency,
  Locale,
  SafetyConstraint,
} from './ai-training/eval/eval.types';
export { GOLDEN_CASES } from './ai-training/eval/golden-cases/golden-cases';

// ─── Synthesis layer ─────────────────────────────────────────────
export { ClaudeGenerator } from './ai-training/synthesis/claude-generator';
export { BackTranslator } from './ai-training/synthesis/back-translator';
export { runSynthesisPipeline } from './ai-training/synthesis/synthesis-orchestrator';
export type { SynthesisPipelineResult } from './ai-training/synthesis/synthesis-orchestrator';
export { exactDedup, semanticDedup } from './ai-training/synthesis/dedup-engine';
export { enumeratePersonas } from './ai-training/synthesis/persona-generator';
export type { PersonaVariation } from './ai-training/synthesis/persona-generator';
export { selfInstructGenerate } from './ai-training/synthesis/self-instruct';
export { registerSynthesisCommand } from './ai-training/synthesis/synthesis-cli';
export { evolve } from './ai-training/synthesis/evol-instruct';
export type {
  EvolutionStrategy,
  EvolInput,
  EvolOutput,
} from './ai-training/synthesis/evol-instruct';

// ─── Quality layer ───────────────────────────────────────────────
export { computeIfdScore } from './ai-training/quality/ifd-scorer';
export { llmJudgeQuality } from './ai-training/quality/llm-judge-scorer';
export { selectDiverse } from './ai-training/quality/diversity-selector';
export {
  filterByLength,
  estimateTokens,
  DEFAULT_BOUNDS,
} from './ai-training/quality/length-filter';
export type {
  LengthBounds,
  FilterableExample,
  LengthFilterResult,
} from './ai-training/quality/length-filter';

// ─── Lineage layer ───────────────────────────────────────────────
export { LineageStore } from './ai-training/lineage/lineage-store';
export { generateLineageMermaid } from './ai-training/lineage/lineage-tracer';
export { detectModelCollapse } from './ai-training/lineage/model-collapse-detector';
export type {
  CollapseRiskReport,
  DetectOptions,
} from './ai-training/lineage/model-collapse-detector';

// ─── RLHF layer ──────────────────────────────────────────────────
export {
  generatePreferenceCandidates,
  exportDpoDataset,
} from './ai-training/rlhf/preference-collector';
export {
  toDpoRow,
  type Preference,
  type PreferencePair,
} from './ai-training/rlhf/preference-types';

// ─── Privacy budget layer ────────────────────────────────────────
export { BudgetAccumulator } from './ai-training/privacy-budget/budget-accumulator';
export {
  trackComposition,
  basicCompose,
  advancedCompose,
  renyiCompose,
} from './ai-training/privacy-budget/composition-tracker';
export type {
  CompositionRecord,
  ComposeOptions,
} from './ai-training/privacy-budget/composition-tracker';
