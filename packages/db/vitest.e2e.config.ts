import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * E2E vitest config — used ONLY by CI workflows that provide their own Postgres service.
 * Deliberately does NOT exclude e2e-harness (unlike the base vitest.config.ts).
 * Usage: vitest run --config vitest.e2e.config.ts <paths>
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['prisma/seeds/e2e-harness/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    testTimeout: 120_000,
    hookTimeout: 180_000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@seeds': path.resolve(__dirname, 'prisma/seeds'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
