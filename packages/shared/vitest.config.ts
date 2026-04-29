import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './src',
    include: ['**/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary'],
      reportsDirectory: '../coverage',
      include: ['validators/**/*.ts', '*.ts'],
      exclude: ['**/__tests__/**', '**/index.ts'],
      thresholds: {
        lines: 15,
        functions: 15,
        branches: 10,
        statements: 15,
      },
    },
  },
});
