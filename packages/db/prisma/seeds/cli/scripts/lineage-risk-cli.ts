// packages/db/prisma/seeds/cli/scripts/lineage-risk-cli.ts
/**
 * Lineage collapse-risk CLI
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
  // Canonical field returned by lineage-store.ts → modelCollapseRiskReport()
  risk?: 'low' | 'medium' | 'high';
  // Legacy / future-compat aliases (kept so shape evolutions don't silently break --strict)
  status?: 'red' | 'amber' | 'green';
  overallRisk?: 'low' | 'medium' | 'high';
  atRisk?: unknown[];
  totalExamples?: number;
  syntheticFraction?: number;
  multiGenerationCount?: number;
  [key: string]: unknown;
}

function hasRiskSignals(r: RiskReport): boolean {
  // FAANG: check ALL canonical + legacy fields. Defense-in-depth.
  if (r.risk === 'high') return true;
  if (r.overallRisk === 'high') return true;
  if (r.status === 'red') return true;
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
