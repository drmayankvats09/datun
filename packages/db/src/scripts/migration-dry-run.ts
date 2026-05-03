/**
 * migration-dry-run.ts — rehearse a migration on shadow database.
 *
 * Steps:
 *   1. Connect to SHADOW_DATABASE_URL
 *   2. Apply all pending migrations
 *   3. Measure total duration
 *   4. Report stats
 *
 * Used by:
 *   - CI before allowing merge to main
 *   - Operator pre-flight before running migrate deploy in prod
 *
 * The shadow DB is destroyed and recreated each run by Prisma — so this is
 * always a fresh-state validation.
 */

import { execSync } from 'node:child_process';

interface DryRunStats {
  durationMs: number;
  exitCode: number;
  output: string;
}

function runMigrateDeploy(): DryRunStats {
  const startedAt = Date.now();
  let exitCode = 0;
  let output = '';
  try {
    output = execSync(`npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma`, {
      encoding: 'utf8',
      env: {
        ...process.env,
        // Point Prisma at the shadow DB for the dry run
        DATABASE_URL: process.env.SHADOW_DATABASE_URL ?? '',
      },
    });
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    exitCode = e.status ?? 1;
    output = `${e.stdout ?? ''}\n${e.stderr ?? ''}`;
  }
  return {
    durationMs: Date.now() - startedAt,
    exitCode,
    output,
  };
}

function main(): number {
  if (!process.env.SHADOW_DATABASE_URL) {
    console.error('SHADOW_DATABASE_URL must be set for dry run.');
    return 2;
  }

  console.log('Migration dry-run starting on shadow database...\n');
  const stats = runMigrateDeploy();

  console.log(stats.output);
  console.log('');
  console.log(`Duration: ${stats.durationMs}ms`);
  console.log(`Exit code: ${stats.exitCode}`);

  if (stats.exitCode !== 0) {
    console.error('\n✗ Dry run FAILED — migration would fail in production.');
    return 1;
  }

  // Warn if migration takes longer than 30s (advisory lock concern)
  if (stats.durationMs > 30_000) {
    console.warn(
      '\n⚠ Migration took longer than 30s. Consider expand-contract pattern for large changes.',
    );
  }

  console.log('\n✓ Dry run passed — safe to apply to production.');
  return 0;
}

process.exit(main());
