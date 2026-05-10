// ═══════════════════════════════════════════════════════════════
// PRIVACY BUDGET — COMPOSITION TRACKER
//
// Implements advanced (Rényi) DP composition for tracking ε across
// multiple training runs against the same patient cohort.
//
// Why: Naive composition (ε_total = Σε_i) overestimates privacy loss.
// Rényi DP composition gives tighter bound: ε(δ) at order α can be
// computed as α·M·ρ where ρ = Gaussian noise variance.
//
// References:
//   - Mironov, "Rényi Differential Privacy" (2017)
//   - Abadi et al. "Deep Learning with Differential Privacy" (2016)
//   - OpenDP / TensorFlow Privacy implementations
//
// Used by: pnpm epsilon:validate CLI gate, weekly privacy-audit workflow.
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

export interface CompositionRecord {
  readonly scope: string;
  readonly totalBudget: number;
  readonly consumedEpsilon: number;
  readonly remainingEpsilon: number;
  readonly spendCount: number;
  readonly delta: number;
  readonly compositionMethod: 'BASIC' | 'ADVANCED' | 'RENYI';
  readonly breakdownByMechanism: Record<string, number>;
  readonly breakdownByRun: readonly {
    readonly runId: string;
    readonly epsilon: number;
    readonly when: Date;
  }[];
  readonly verdict: 'WITHIN_BUDGET' | 'AT_LIMIT' | 'EXCEEDED';
}

interface SpendRow {
  readonly runId: string;
  readonly epsilonSpent: number;
  readonly mechanism: string;
  readonly occurredAt: Date;
}

/**
 * Basic (sequential) composition: ε_total = Σε_i
 * Sound but overestimates privacy loss.
 */
export function basicCompose(spends: readonly SpendRow[]): number {
  return spends.reduce((s, r) => s + r.epsilonSpent, 0);
}

/**
 * Advanced composition (Dwork-Rothblum-Vadhan, 2010):
 *   ε_total ≤ √(2k·ln(1/δ'))·ε + k·ε·(e^ε - 1)
 * Tighter than basic for large k.
 */
export function advancedCompose(spends: readonly SpendRow[], delta: number = 1e-5): number {
  if (spends.length === 0) return 0;
  const k = spends.length;
  const epsMax = Math.max(...spends.map((s) => s.epsilonSpent));
  const term1 = Math.sqrt(2 * k * Math.log(1 / delta)) * epsMax;
  const term2 = k * epsMax * (Math.exp(epsMax) - 1);
  return term1 + term2;
}

/**
 * Rényi DP composition (Mironov 2017): tightest known bound for Gaussian noise.
 * For Gaussian mechanism with noise variance σ², ρ = 1/(2σ²).
 *   ε(α) = α · ρ · k  (where k = number of compositions)
 *   convert RDP → (ε, δ)-DP: ε_dp = ε(α) + log(1/δ)/(α-1)
 */
export function renyiCompose(
  spends: readonly SpendRow[],
  delta: number = 1e-5,
  alpha: number = 10,
): number {
  if (spends.length === 0) return 0;
  if (alpha <= 1) throw new Error('Rényi alpha must be > 1');
  const k = spends.length;
  const rho = spends.reduce((s, sp) => s + sp.epsilonSpent / (2 * alpha), 0);
  const rdp = alpha * rho * k;
  return rdp + Math.log(1 / delta) / (alpha - 1);
}

export interface ComposeOptions {
  readonly scope: string;
  readonly delta?: number;
  readonly method?: 'BASIC' | 'ADVANCED' | 'RENYI';
  readonly renyiAlpha?: number;
}

export async function trackComposition(
  prisma: PrismaClient,
  opts: ComposeOptions,
): Promise<CompositionRecord> {
  const delta = opts.delta ?? 1e-5;
  const method = opts.method ?? 'ADVANCED';

  const budget = await prisma.privacyBudget.findUnique({
    where: { scope: opts.scope },
    include: { spends: { orderBy: { occurredAt: 'asc' } } },
  });

  if (!budget) {
    throw new Error(`PrivacyBudget not found for scope=${opts.scope}`);
  }

  const spends: readonly SpendRow[] = budget.spends.map((s) => ({
    runId: s.runId,
    epsilonSpent: s.epsilonSpent,
    mechanism: s.mechanism,
    occurredAt: s.occurredAt,
  }));

  let consumed = 0;
  switch (method) {
    case 'BASIC':
      consumed = basicCompose(spends);
      break;
    case 'ADVANCED':
      consumed = advancedCompose(spends, delta);
      break;
    case 'RENYI':
      consumed = renyiCompose(spends, delta, opts.renyiAlpha ?? 10);
      break;
  }

  // Persist consumed back to budget (lazy update)
  await prisma.privacyBudget.update({
    where: { id: budget.id },
    data: {
      consumedEpsilon: consumed,
      remainingEpsilon: Math.max(0, budget.totalBudget - consumed),
    },
  });

  // Breakdown
  const byMechanism: Record<string, number> = {};
  for (const s of spends) {
    byMechanism[s.mechanism] = (byMechanism[s.mechanism] ?? 0) + s.epsilonSpent;
  }

  const verdict: CompositionRecord['verdict'] =
    consumed >= budget.totalBudget
      ? 'EXCEEDED'
      : consumed >= budget.totalBudget * 0.95
        ? 'AT_LIMIT'
        : 'WITHIN_BUDGET';

  if (verdict !== 'WITHIN_BUDGET') {
    logger.warn(
      { scope: opts.scope, consumed, total: budget.totalBudget, method, verdict },
      'Privacy budget verdict',
    );
  }

  return {
    scope: opts.scope,
    totalBudget: budget.totalBudget,
    consumedEpsilon: consumed,
    remainingEpsilon: Math.max(0, budget.totalBudget - consumed),
    spendCount: spends.length,
    delta,
    compositionMethod: method,
    breakdownByMechanism: byMechanism,
    breakdownByRun: spends.map((s) => ({
      runId: s.runId,
      epsilon: s.epsilonSpent,
      when: s.occurredAt,
    })),
    verdict,
  };
}
