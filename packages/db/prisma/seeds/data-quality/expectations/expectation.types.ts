// ═══════════════════════════════════════════════════════════════
// EXPECTATION ENGINE — clinical-domain checks beyond Soda's SQL DSL
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';

export type Severity = 'info' | 'warning' | 'error' | 'critical';

export interface ExpectationResult {
  readonly id: string;
  readonly name: string;
  readonly severity: Severity;
  readonly passed: boolean;
  readonly violatingRowIds: readonly string[];
  readonly message: string;
  readonly checkedRows: number;
  readonly durationMs: number;
}

export interface Expectation {
  readonly id: string;
  readonly name: string;
  readonly severity: Severity;
  readonly description: string;
  evaluate(prisma: PrismaClient): Promise<ExpectationResult>;
}
