import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    root: '.',
    include: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.next/**'],
    setupFiles: ['./__tests__/setup.ts'],
    testTimeout: 10_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary'],
      include: ['lib/**/*.ts', 'stores/**/*.ts', 'hooks/**/*.ts'],
      exclude: ['components/**', '**/*.d.ts', '**/__tests__/**'],
      thresholds: {
        autoUpdate: false,
        lines: 40,
        functions: 40,
        branches: 40,
        statements: 40,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/components': path.resolve(__dirname, 'components'),
      '@/lib': path.resolve(__dirname, 'lib'),
      '@/hooks': path.resolve(__dirname, 'hooks'),
      '@/stores': path.resolve(__dirname, 'stores'),
      '@/i18n': path.resolve(__dirname, 'i18n'),
    },
  },
});
