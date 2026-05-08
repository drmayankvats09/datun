import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'prisma/seeds/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.archived'],
    testTimeout: 120_000,
    hookTimeout: 180_000, // 3 min for container + migration setup
    pool: 'forks', // separate process per test file (clean Prisma client)
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 2,
      },
    },
    globalSetup: ['./vitest.global-setup.ts'],
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
