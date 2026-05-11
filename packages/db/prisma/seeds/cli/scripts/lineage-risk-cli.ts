#!/usr/bin/env tsx
/**
 * Lineage collapse-risk CLI
 *
 * Replaces the broken inline `tsx -e` npm script that referenced an
 * undefined global `prisma` variable (causing ReferenceError on every
 * Synthesis run). Provides proper PrismaClient lifecycle, --strict
 * flag, and three-state exit codes.
 *
 * Used by:
 *   - npm: `pnpm training:lineage:risk`
 *   - CI:  .github/workflows/synthesis-weekly.yml
 *
 * Exit codes:
 *   0 — report generated (or strict + no risk)
 *   1 — strict mode + risk signal detected
 *   2 — fatal (DB unreachable, import failure)
 */
import { PrismaClient } from '@prisma/client';
import { LineageStore } from '../../ai-training/lineage';

const STRICT = process.argv.includes('--strict');

interface RiskReport {
  status?: 'red' | 'amber' | 'green';
  overallRisk?: 'high' | 'medium' | 'low';
  atRisk?: unknown[];
  [key: string]: unknown;
}

function hasRiskSignals(r: RiskReport): boolean {
  if (r.status === 'red') return true;
  if (r.overallRisk === 'high') return true;
  if (Array.isArray(r.atRisk) && r.atRisk.length > 0) return true;
  return false;
}

async function main(): Promise<number> {
  const prisma = new PrismaClient();
  try {
    const store = new LineageStore(prisma);
    const report = (await store.modelCollapseRiskReport()) as RiskReport;
    console.log(JSON.stringify(report, null, 2));

    if (STRICT && hasRiskSignals(report)) {
      console.error('::error::Lineage collapse risk detected (strict mode).');
      return 1;
    }
    return 0;
  } catch (err) {
    console.error('Lineage risk CLI fatal error:', err);
    return 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().then((code) => process.exit(code));
