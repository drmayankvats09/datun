import { defineConfig } from 'vitest/config';
import path from 'node:path';
import fs from 'node:fs';

// ═══════════════════════════════════════════════════════════════
// FAANG-grade .env loader — runs at config load (main process)
// Forks inherit process.env naturally; setupFiles also reload per worker
// (defense in depth — handles edge cases of fork inheritance)
// ═══════════════════════════════════════════════════════════════
function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // FAANG: .env is local source of truth — force override
    process.env[m[1]] = value;
  }
}

loadEnvFile(path.resolve(__dirname, '.env'));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'prisma/seeds/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.archived'],
    testTimeout: 120_000,
    retry: 2, // FAANG: handle transient flakes (Docker cold-start, container init races)
    hookTimeout: 180_000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 2,
      },
    },
    globalSetup: ['./vitest.global-setup.ts'],
    setupFiles: ['./vitest.setup.ts'], // per-worker .env load + diagnostic
    // NO test.env block — relies on Node fork inheritance + setupFiles defense
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary'],
      include: ['src/**/*.ts', 'prisma/seeds/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/__tests__/**', '**/dist/**', '**/*.archived'],
    },
  },
  resolve: {
    alias: {
      '@seeds': path.resolve(__dirname, 'prisma/seeds'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
