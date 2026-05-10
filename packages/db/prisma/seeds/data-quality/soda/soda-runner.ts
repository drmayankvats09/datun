// ═══════════════════════════════════════════════════════════════
// SODA RUNNER — Node wrapper around `soda scan` CLI
// Parses JSON output, returns structured violations
// ═══════════════════════════════════════════════════════════════
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export interface SodaCheckResult {
  readonly check: string;
  readonly outcome: 'pass' | 'fail' | 'warn' | 'error';
  readonly metric?: number;
  readonly message?: string;
  readonly severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface SodaScanResult {
  readonly dataSource: string;
  readonly checks: readonly SodaCheckResult[];
  readonly hasFailures: boolean;
  readonly hasCritical: boolean;
  readonly durationMs: number;
}

export async function runSodaScan(
  dataSource: string,
  checksFile: string,
  configFile = path.join(__dirname, 'soda-config.yml'),
): Promise<SodaScanResult> {
  const start = performance.now();
  const outFile = path.join(process.cwd(), 'tmp', `soda-${Date.now()}.json`);
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'soda',
      [
        'scan',
        '-d',
        dataSource,
        '-c',
        configFile,
        '-srf',
        outFile, // structured result file (json)
        checksFile,
      ],
      { stdio: ['ignore', 'inherit', 'inherit'] },
    );

    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (!existsSync(outFile)) {
        reject(new Error(`Soda scan produced no output (exit ${code})`));
        return;
      }
      const raw = JSON.parse(readFileSync(outFile, 'utf8')) as {
        checks: Array<Record<string, unknown>>;
      };
      const checks: SodaCheckResult[] = raw.checks.map((c) => ({
        check: String(c.name ?? c.identity ?? 'unknown'),
        outcome: String(c.outcome ?? 'error') as SodaCheckResult['outcome'],
        metric: typeof c.metric === 'number' ? c.metric : undefined,
        message: typeof c.message === 'string' ? c.message : undefined,
        severity: c.severity as SodaCheckResult['severity'],
      }));
      resolve({
        dataSource,
        checks,
        hasFailures: checks.some((c) => c.outcome === 'fail'),
        hasCritical: checks.some((c) => c.outcome === 'fail' && c.severity === 'critical'),
        durationMs: Math.round(performance.now() - start),
      });
    });
  });
}
