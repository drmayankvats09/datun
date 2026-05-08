// ═══════════════════════════════════════════════════════════════
// EXPERIMENT TYPES — A/B harness atop existing ExperimentAssignment
// Reuses Wave 3 factory shape (verified line 18495+ chat)
// ═══════════════════════════════════════════════════════════════
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'aborted';

export interface Variant {
  readonly key: string;
  readonly weight: number;
  readonly description: string;
  readonly config: Record<string, unknown>;
}

export interface ExperimentDefinition {
  readonly key: string;
  readonly description: string;
  readonly status: ExperimentStatus;
  readonly variants: readonly Variant[];
  readonly primaryMetric: string;
  readonly guardrailMetrics: readonly string[];
  readonly minSampleSizePerVariant: number;
  readonly mdePct: number;
  readonly startedAt: Date;
  readonly endedAt?: Date;
}

export interface ExperimentResult {
  readonly experimentKey: string;
  readonly variantKey: string;
  readonly userId: string;
  readonly metricName: string;
  readonly metricValue: number;
  readonly observedAt: Date;
}

export interface ExperimentSummary {
  readonly variantKey: string;
  readonly sampleSize: number;
  readonly mean: number;
  readonly stddev: number;
  readonly ci95Lower: number;
  readonly ci95Upper: number;
}
