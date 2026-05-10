// ═══════════════════════════════════════════════════════════════
// PG VERSION MATRIX — run e2e against PG 16/17/18 in sequence
// Used by CI; locally requires Docker
// ═══════════════════════════════════════════════════════════════
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';

const VERSIONS = ['16-alpine', '17-alpine', '18-alpine'] as const;

export interface MatrixResult {
  version: string;
  passed: boolean;
  durationMs: number;
  message: string;
}

export async function runPgMatrix(testCommand: string): Promise<MatrixResult[]> {
  const results: MatrixResult[] = [];
  for (const v of VERSIONS) {
    const container = await new PostgreSqlContainer(`postgres:${v}`)
      .withDatabase('datun_compat')
      .withUsername('test')
      .withPassword('test')
      .start();
    const start = performance.now();
    try {
      execSync(testCommand, {
        env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
        stdio: 'inherit',
      });
      results.push({
        version: v,
        passed: true,
        durationMs: Math.round(performance.now() - start),
        message: 'ok',
      });
    } catch (err) {
      results.push({
        version: v,
        passed: false,
        durationMs: Math.round(performance.now() - start),
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      await container.stop();
    }
  }
  return results;
}
