// ═══════════════════════════════════════════════════════════════
// DRIFT TYPES — input + concept drift
// Source: Tsymbal 2004 + 2025 ML monitoring best practices
// ═══════════════════════════════════════════════════════════════
export type DriftKind = 'input' | 'concept' | 'embedding' | 'output-distribution';

export interface DriftAlert {
  readonly id: string;
  readonly kind: DriftKind;
  readonly metric: string;
  readonly observedValue: number;
  readonly threshold: number;
  readonly windowDays: number;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly detectedAt: Date;
  readonly actionRequired: string;
}
