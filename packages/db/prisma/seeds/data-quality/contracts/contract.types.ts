// ═══════════════════════════════════════════════════════════════
// DATA CONTRACT TYPES — producer/consumer agreement layer
// Source: Sachith Dassanayake 2026 + Kleppmann DDIA principles
// ═══════════════════════════════════════════════════════════════
import type { Severity } from '../expectations/expectation.types';

export type ContractStatus = 'draft' | 'active' | 'deprecated' | 'breaking';

export interface FieldContract {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'datetime' | 'json' | 'enum';
  readonly nullable: boolean;
  readonly required: boolean;
  readonly enumValues?: readonly string[];
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly minValue?: number;
  readonly maxValue?: number;
  readonly regex?: string;
  readonly piiClass: 'none' | 'low' | 'medium' | 'high' | 'critical';
  readonly description: string;
}

export interface FreshnessContract {
  readonly maxStaleSeconds: number;
  readonly checkColumn: string;
  readonly severity: Severity;
}

export interface VolumeContract {
  readonly minRowsPerDay: number;
  readonly maxRowsPerDay: number;
  readonly severity: Severity;
}

export interface DataContract {
  readonly tableName: string;
  readonly version: string;
  readonly status: ContractStatus;
  readonly owner: string;
  readonly consumers: readonly string[];
  readonly fields: readonly FieldContract[];
  readonly freshness?: FreshnessContract;
  readonly volume?: VolumeContract;
  readonly customRules: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ContractViolation {
  readonly contractTable: string;
  readonly contractVersion: string;
  readonly violationKind: 'schema' | 'freshness' | 'volume' | 'enum' | 'pii' | 'range' | 'custom';
  readonly fieldName?: string;
  readonly severity: Severity;
  readonly message: string;
  readonly sampleRowIds: readonly string[];
  readonly observedAt: Date;
}
