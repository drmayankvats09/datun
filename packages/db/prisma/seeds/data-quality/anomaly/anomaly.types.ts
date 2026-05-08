// ═══════════════════════════════════════════════════════════════
// ANOMALY TYPES
// ═══════════════════════════════════════════════════════════════
export type AnomalyKind = 'zscore' | 'iqr' | 'categorical-shift' | 'volume-spike' | 'volume-drop';

export interface Anomaly {
  readonly id: string;
  readonly kind: AnomalyKind;
  readonly tableName: string;
  readonly columnName: string;
  readonly observedValue: number;
  readonly expectedRange: { min: number; max: number };
  readonly zScore?: number;
  readonly severity: 'info' | 'warning' | 'critical';
  readonly detectedAt: Date;
  readonly message: string;
}
