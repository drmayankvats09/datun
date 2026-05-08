// ═══════════════════════════════════════════════════════════════
// SLO TYPES — Service-Level Objectives
// Source: Google SRE book + Datadog SLO methodology
// ═══════════════════════════════════════════════════════════════
import type { PrismaClient } from '@prisma/client';

export interface SloDefinition {
  readonly name: string;
  readonly description: string;
  readonly target: number; // 0-1, e.g., 0.99 = 99%
  readonly windowSeconds: number;
  readonly query: (prisma: PrismaClient) => Promise<{ good: number; total: number }>;
}

export interface SloStatus {
  readonly name: string;
  readonly target: number;
  readonly observed: number;
  readonly errorBudget: number;
  readonly burnRatePct: number;
  readonly windowSeconds: number;
  readonly evaluatedAt: Date;
  readonly status: 'healthy' | 'at-risk' | 'breached';
}
