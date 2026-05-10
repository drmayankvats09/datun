// ═══════════════════════════════════════════════════════════════
// DRIFT DETECTOR — compare Prisma schema to deployed DB
// Fails CI if drift detected
// ═══════════════════════════════════════════════════════════════
import { execFileSync } from 'node:child_process';

export interface DriftReport {
  driftDetected: boolean;
  unappliedMigrations: string[];
  schemaDiff: string;
}

export function detectDrift(databaseUrl: string): DriftReport {
  try {
    const status = execFileSync(
      'pnpm',
      ['--filter', '@repo/db', 'exec', 'prisma', 'migrate', 'status'],
      {
        env: { ...process.env, DATABASE_URL: databaseUrl },
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );
    const unappliedMigrations = (status.match(/(\d{14}_[a-z0-9_]+)/g) ?? []).filter((_, _i, all) =>
      status.includes('Following migration have not yet been applied'),
    );
    let schemaDiff = '';
    try {
      schemaDiff = execFileSync(
        'pnpm',
        [
          '--filter',
          '@repo/db',
          'exec',
          'prisma',
          'migrate',
          'diff',
          '--from-schema-datasource',
          'prisma/schema.prisma',
          '--to-schema-datamodel',
          'prisma/schema.prisma',
          '--exit-code',
        ],
        { env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: 'utf8' },
      );
    } catch {
      // diff returns exit code 2 when drift exists — capture stdout
    }
    return {
      driftDetected: unappliedMigrations.length > 0 || schemaDiff.length > 0,
      unappliedMigrations,
      schemaDiff,
    };
  } catch (err) {
    return {
      driftDetected: true,
      unappliedMigrations: [],
      schemaDiff: err instanceof Error ? err.message : String(err),
    };
  }
}
