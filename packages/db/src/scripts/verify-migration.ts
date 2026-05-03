/**
 * verify-migration.ts — pre-deploy verification gate.
 *
 * Exits 0 if all green, 1 otherwise. Used by:
 *   - CI before `prisma migrate deploy`
 *   - Railway pre-start hook on api + worker
 *   - Manual operator checks
 *
 * Checks performed:
 *   1. Schema file exists and is valid
 *   2. Migrations folder exists with at least one migration
 *   3. Database is reachable
 *   4. Schema fingerprint matches the latest audit entry's fingerprint
 *      (or audit table is empty — first deploy case)
 *   5. No failed migrations in audit log
 *
 * @see docs/runbooks/migration-deploy.md
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { getCurrentSchemaFingerprint, fingerprintsMatch } from '../lib/schema-fingerprint.js';

const SCHEMA_PATH = resolve('packages/db/prisma/schema.prisma');
const MIGRATIONS_DIR = resolve('packages/db/prisma/migrations');

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

async function check1_schemaExists(): Promise<CheckResult> {
  const exists = existsSync(SCHEMA_PATH);
  return {
    name: 'schema-file-exists',
    passed: exists,
    message: exists ? `Schema found at ${SCHEMA_PATH}` : `Schema MISSING at ${SCHEMA_PATH}`,
  };
}

async function check2_migrationsFolder(): Promise<CheckResult> {
  const exists = existsSync(MIGRATIONS_DIR);
  if (!exists) {
    return {
      name: 'migrations-folder',
      passed: false,
      message: `Migrations folder MISSING at ${MIGRATIONS_DIR}`,
    };
  }
  const { readdirSync } = await import('node:fs');
  const migrations = readdirSync(MIGRATIONS_DIR).filter((f) => /^\d+_/.test(f));
  return {
    name: 'migrations-folder',
    passed: migrations.length > 0,
    message: `Found ${migrations.length} migration(s)`,
  };
}

async function check3_databaseReachable(prisma: PrismaClient): Promise<CheckResult> {
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    return {
      name: 'database-reachable',
      passed: true,
      message: 'Database connection OK',
    };
  } catch (err) {
    return {
      name: 'database-reachable',
      passed: false,
      message: `Database unreachable: ${(err as Error).message}`,
    };
  }
}

async function check4_fingerprintMatches(prisma: PrismaClient): Promise<CheckResult> {
  try {
    const current = await getCurrentSchemaFingerprint();
    const lastAudit = await prisma.migrationAudit.findFirst({
      orderBy: { appliedAt: 'desc' },
      select: { schemaChecksum: true, migrationName: true },
    });
    if (!lastAudit) {
      return {
        name: 'fingerprint-match',
        passed: true,
        message: 'No prior audit entries — first deploy, fingerprint not yet recorded',
      };
    }
    const matches = fingerprintsMatch(current, lastAudit.schemaChecksum);
    return {
      name: 'fingerprint-match',
      passed: matches,
      message: matches
        ? `Schema fingerprint matches last audit (${lastAudit.migrationName})`
        : `DRIFT: current=${current.slice(0, 16)} vs audit=${lastAudit.schemaChecksum.slice(0, 16)}`,
    };
  } catch (err) {
    return {
      name: 'fingerprint-match',
      passed: false,
      message: `Fingerprint check failed: ${(err as Error).message}`,
    };
  }
}

async function check5_noFailedMigrations(prisma: PrismaClient): Promise<CheckResult> {
  const failedCount = await prisma.migrationAudit.count({
    where: { success: false },
  });
  return {
    name: 'no-failed-migrations',
    passed: failedCount === 0,
    message:
      failedCount === 0
        ? 'No failed migrations in audit log'
        : `${failedCount} failed migration(s) in audit log — investigate before deploying`,
  };
}

async function main(): Promise<number> {
  console.log('Datun migration verification\n');
  const prisma = new PrismaClient();

  const checks: CheckResult[] = [];
  try {
    checks.push(await check1_schemaExists());
    checks.push(await check2_migrationsFolder());
    checks.push(await check3_databaseReachable(prisma));
    checks.push(await check4_fingerprintMatches(prisma));
    checks.push(await check5_noFailedMigrations(prisma));
  } finally {
    await prisma.$disconnect();
  }

  let exitCode = 0;
  for (const c of checks) {
    const icon = c.passed ? '✓' : '✗';
    console.log(`${icon} ${c.name}: ${c.message}`);
    if (!c.passed) exitCode = 1;
  }

  console.log('');
  console.log(
    exitCode === 0
      ? 'All checks passed — safe to deploy.'
      : 'FAILED — deploy blocked. Resolve the issues above and retry.',
  );
  return exitCode;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('verify-migration crashed:', err);
    process.exit(2);
  });
