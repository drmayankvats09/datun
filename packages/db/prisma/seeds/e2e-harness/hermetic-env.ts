// ═══════════════════════════════════════════════════════════════
// HERMETIC ENV — runs `prisma migrate deploy` + sets test env vars
// ═══════════════════════════════════════════════════════════════

import { spawn } from 'node:child_process';

export async function runMigrations(connectionString: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['prisma', 'migrate', 'deploy'], {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: connectionString },
    });
    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`migrate deploy failed: ${stderr}`));
    });
    child.on('error', reject);
  });
}

export function setTestEnvVars(): void {
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.SEED_ANONYMIZATION_SALT = 'test-salt-not-for-production';
}

export function clearTestEnvVars(): void {
  delete process.env.SEED_ANONYMIZATION_SALT;
}
