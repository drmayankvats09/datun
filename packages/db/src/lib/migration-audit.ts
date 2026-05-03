/**
 * Migration Audit Logger — application-level migration event recording.
 *
 * Why: Prisma's internal `_prisma_migrations` table records WHAT migrations
 * ran but not WHO ran them, FROM WHERE, on WHAT git commit, with WHAT
 * schema fingerprint, against WHAT Postgres version.
 *
 * The MigrationAudit model captures all of that for:
 *   1. DPDP Act compliance — audit trail of schema changes
 *   2. Investor due diligence — evidence of engineering discipline
 *   3. Forensics — debug schema-related production incidents
 *   4. Drift correlation — match drift detection alerts to specific migrations
 *
 * @see prisma/schema.prisma model MigrationAudit
 * @see docs/adr/0002-prisma-migrations-baseline.md
 */

import { execSync } from 'node:child_process';
import { hostname } from 'node:os';
import type { PrismaClient } from '@prisma/client';
import { getCurrentSchemaFingerprint } from './schema-fingerprint.js';

/** Sources that trigger a migration apply — extend as new sources emerge. */
export type MigrationSource = 'ci' | 'railway-build' | 'local-dev' | 'manual' | 'test';

export interface MigrationAuditEntry {
  migrationName: string;
  appliedBy: string;
  appliedFrom: string;
  durationMs: number;
  success: boolean;
  errorMessage?: string;
  schemaChecksum: string;
  prismaVersion: string;
  postgresVersion: string;
  gitCommitSha?: string;
  gitBranch?: string;
}

/**
 * Read git context safely — returns null if git is unavailable
 * (e.g. inside a Docker build where .git was excluded).
 */
function safeGit(args: string): string | null {
  try {
    return execSync(`git ${args}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Detect Postgres version from the connected database.
 * Returns "unknown" if the query fails.
 */
async function getPostgresVersion(prisma: PrismaClient): Promise<string> {
  try {
    const result = await prisma.$queryRawUnsafe<{ version: string }[]>(
      `SELECT current_setting('server_version') AS version`,
    );
    return result[0]?.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Detect Prisma client version from package.json.
 * The version is embedded at build time so this is reliable.
 */
function getPrismaVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('@prisma/client/package.json') as { version: string };
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

/**
 * Build a complete audit entry from environment + database introspection.
 * Sensible defaults so callers only need to supply migration-specific fields.
 */
export async function buildAuditEntry(
  prisma: PrismaClient,
  partial: {
    migrationName: string;
    appliedBy?: string;
    durationMs: number;
    success: boolean;
    errorMessage?: string;
    source?: MigrationSource;
  },
): Promise<MigrationAuditEntry> {
  const source = partial.source ?? detectSource();
  const appliedBy = partial.appliedBy ?? `${source}:${hostname()}`;

  const [schemaChecksum, postgresVersion] = await Promise.all([
    getCurrentSchemaFingerprint().catch(() => 'unknown'),
    getPostgresVersion(prisma),
  ]);

  return {
    migrationName: partial.migrationName,
    appliedBy,
    appliedFrom: hostname(),
    durationMs: partial.durationMs,
    success: partial.success,
    errorMessage: partial.errorMessage,
    schemaChecksum,
    prismaVersion: getPrismaVersion(),
    postgresVersion,
    gitCommitSha: safeGit('rev-parse HEAD') ?? undefined,
    gitBranch: safeGit('rev-parse --abbrev-ref HEAD') ?? undefined,
  };
}

/**
 * Heuristic source detection from environment variables.
 * CI, Railway, and local dev each set distinctive env markers.
 */
function detectSource(): MigrationSource {
  if (process.env.GITHUB_ACTIONS === 'true') return 'ci';
  if (process.env.RAILWAY_ENVIRONMENT) return 'railway-build';
  if (process.env.NODE_ENV === 'test') return 'test';
  return 'local-dev';
}

/**
 * Write the audit entry to the MigrationAudit table.
 * Best-effort — never throws (audit failure should not block the migration).
 */
export async function logMigrationAudit(
  prisma: PrismaClient,
  entry: MigrationAuditEntry,
): Promise<void> {
  try {
    await prisma.migrationAudit.create({
      data: {
        migrationName: entry.migrationName,
        appliedBy: entry.appliedBy,
        appliedFrom: entry.appliedFrom,
        durationMs: entry.durationMs,
        success: entry.success,
        errorMessage: entry.errorMessage,
        schemaChecksum: entry.schemaChecksum,
        prismaVersion: entry.prismaVersion,
        postgresVersion: entry.postgresVersion,
        gitCommitSha: entry.gitCommitSha,
        gitBranch: entry.gitBranch,
      },
    });
  } catch (err) {
    // Log to stderr but do not throw — preserves migration outcome.
    console.error('[migration-audit] failed to write audit row:', err);
  }
}

/**
 * Retrieve the most recent audit entries for the /internal/migration/status
 * endpoint and forensic debugging.
 */
export async function getRecentAuditEntries(
  prisma: PrismaClient,
  limit = 10,
): Promise<MigrationAuditEntry[]> {
  const rows = await prisma.migrationAudit.findMany({
    orderBy: { appliedAt: 'desc' },
    take: limit,
  });
  return rows.map((r) => ({
    migrationName: r.migrationName,
    appliedBy: r.appliedBy,
    appliedFrom: r.appliedFrom,
    durationMs: r.durationMs,
    success: r.success,
    errorMessage: r.errorMessage ?? undefined,
    schemaChecksum: r.schemaChecksum,
    prismaVersion: r.prismaVersion,
    postgresVersion: r.postgresVersion,
    gitCommitSha: r.gitCommitSha ?? undefined,
    gitBranch: r.gitBranch ?? undefined,
  }));
}
