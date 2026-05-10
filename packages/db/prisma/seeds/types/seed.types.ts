// ═══════════════════════════════════════════════════════════════
// SEED CORE TYPES — Single source of truth for seed system shapes
// Pattern: Stripe internal type contracts, Linear @linear/types
//
// SeedContext flows through every module — modules read context,
// never construct it. Orchestrator owns context lifecycle.
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';

/** Strategy that determines how seed mutates DB */
export type SeedStrategy = 'idempotent' | 'destructive' | 'scale' | 'chaos' | 'incremental';

/** CLI command currently being executed */
export type SeedCommand = 'seed' | 'reset' | 'verify' | 'demo-only' | 'staging' | 'scale' | 'help';

/** Locale support — extensible to 10 languages per Datun roadmap */
export type SeedLocale = 'hindi' | 'english';

/** Result envelope returned by every seed module */
export interface SeedModuleResult {
  /** Module name (matches filename) */
  module: string;
  /** Number of rows inserted/upserted */
  inserted: number;
  /** Number of rows skipped (already existed in idempotent mode) */
  skipped: number;
  /** Wall-clock duration in ms */
  durationMs: number;
  /** Optional warnings (non-fatal) */
  warnings: readonly string[];
}

/** Full seed run result (returned by orchestrator) */
export interface SeedResult {
  /** Per-module breakdown */
  modules: readonly SeedModuleResult[];
  /** Total rows touched */
  totalInserted: number;
  totalSkipped: number;
  /** Total wall-clock duration */
  totalDurationMs: number;
  /** Strategy used */
  strategy: SeedStrategy;
  /** Whether demo clinic was included */
  includedDemo: boolean;
  /** Scale factor (1 for normal, N for scale strategy) */
  scaleFactor: number;
  /** Timestamp of run */
  startedAt: Date;
  finishedAt: Date;
}

/** Context object passed to every seed module */
export interface SeedContext {
  /** Prisma client (transaction-aware where modules use withSeedTransaction) */
  prisma: PrismaClient;
  /** Strategy currently executing */
  strategy: SeedStrategy;
  /** Locale for randomized fixtures */
  locale: SeedLocale;
  /** Multiplier for scale strategy (default 1) */
  scaleFactor: number;
  /** Whether to include demo clinic data */
  includeDemo: boolean;
  /** Run identifier (UUID) for log correlation */
  runId: string;
  /** Whether running in CI (skips interactive prompts) */
  isCi: boolean;
  /** Whether running in test env (suppresses banner output) */
  isTest: boolean;
}

/** Options accepted by orchestrator entry */
export interface SeedOrchestratorOptions {
  strategy?: SeedStrategy;
  locale?: SeedLocale;
  scaleFactor?: number;
  includeDemo?: boolean;
  modules?: readonly string[]; // Optional filter — run only these modules
  isCi?: boolean;
  isTest?: boolean;
}

/** Module signature — every seed module exports this */
export type SeedModule = (ctx: SeedContext) => Promise<SeedModuleResult>;
