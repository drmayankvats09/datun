// ═══════════════════════════════════════════════════════════════
// HEALTH CHECK — pre-flight check before running seed
// ═══════════════════════════════════════════════════════════════

import type { PrismaClient } from '@prisma/client';

export interface HealthCheckResult {
  readonly healthy: boolean;
  readonly checks: Readonly<Record<string, { ok: boolean; latencyMs?: number; error?: string }>>;
  readonly summary: string;
}

export async function runHealthCheck(prisma: PrismaClient): Promise<HealthCheckResult> {
  const checks: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  // 1. DB connectivity
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true, latencyMs: Date.now() - dbStart };
  } catch (e) {
    checks.database = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 2. Migration state
  try {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables 
      WHERE schemaname='public' AND tablename='User'
    `;
    checks.migrations = {
      ok: tables.length > 0,
      ...(tables.length === 0 ? { error: 'User table missing — run prisma migrate deploy' } : {}),
    };
  } catch (e) {
    checks.migrations = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 3. Disk space (best-effort, never crashes seed)
  try {
    const { promisify } = await import('node:util');
    const { exec } = await import('node:child_process');
    const execAsync = promisify(exec);
    const { stdout } = await execAsync('df -h .');
    const lines = stdout.split('\n');
    const dataLine = lines[1] ?? '';
    const match = dataLine.match(/(\d+)%/);
    const usagePct = match ? parseInt(match[1]!, 10) : 0;
    checks.diskSpace = {
      ok: usagePct < 90,
      ...(usagePct >= 90 ? { error: `Disk ${usagePct}% full — risk of seed failure` } : {}),
    };
  } catch {
    // df not available on Windows — fall back to "ok" rather than fail
    checks.diskSpace = { ok: true };
  }

  // 4. Required env vars
  const requiredEnv = ['DATABASE_URL'];
  const missingEnv = requiredEnv.filter((k) => !process.env[k]);
  checks.envVars = {
    ok: missingEnv.length === 0,
    ...(missingEnv.length > 0 ? { error: `Missing: ${missingEnv.join(', ')}` } : {}),
  };

  // 5. Schema model presence (sanity check critical tables)
  const requiredModels = ['user', 'patient', 'clinic', 'consultation'];
  const modelChecks = requiredModels.map((m) => {
    const model = (prisma as unknown as Record<string, unknown>)[m];
    return { name: m, present: !!model };
  });
  const missingModels = modelChecks.filter((c) => !c.present).map((c) => c.name);
  checks.schemaModels = {
    ok: missingModels.length === 0,
    ...(missingModels.length > 0
      ? { error: `Models absent on Prisma client: ${missingModels.join(', ')}` }
      : {}),
  };

  // 6. Heap headroom
  const heap = process.memoryUsage();
  const heapUsedPct = (heap.heapUsed / heap.heapTotal) * 100;
  checks.heap = {
    ok: heapUsedPct < 85,
    latencyMs: Math.round(heapUsedPct),
    ...(heapUsedPct >= 85
      ? { error: `Heap ${heapUsedPct.toFixed(0)}% — increase --max-old-space-size` }
      : {}),
  };

  const allOk = Object.values(checks).every((c) => c.ok);
  const failed = Object.entries(checks)
    .filter(([, v]) => !v.ok)
    .map(([k]) => k);
  const summary = allOk
    ? '✓ All health checks passed'
    : `✗ Health check failed: ${failed.join(', ')}`;

  return { healthy: allOk, checks, summary };
}

export function failFastIfUnhealthy(result: HealthCheckResult): void {
  if (!result.healthy) {
    console.error(result.summary);
    for (const [name, check] of Object.entries(result.checks)) {
      if (!check.ok) console.error(`  ✗ ${name}: ${check.error ?? 'unknown'}`);
    }
    process.exit(3);
  }
}
