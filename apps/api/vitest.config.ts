// ═══════════════════════════════════════════════════════════════
// API TEST CONFIG — Vitest + env setup + coverage thresholds
// ═══════════════════════════════════════════════════════════════

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: './src',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['./__tests__/setup.ts'],
    testTimeout: 10_000,

    // Coverage — ratchet pattern: only goes UP, never DOWN
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary', 'html'],
      reportsDirectory: '../coverage',
      include: [
        'utils/**',
        'errors/**',
        'services/auth/password.service.ts',
        'services/auth/jwt.service.ts',
        'services/auth/otp.service.ts',
        'services/ai/health-manager.ts',
        'services/ai/cost-tracker.ts',
        'middleware/validate.ts',
        'middleware/error-handler.ts',
        'middleware/rate-limit.ts',
        'validators/**',
        'config/env.ts',
      ],
      exclude: ['__tests__/**'],
      thresholds: {
        autoUpdate: false,
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },

    // Test env vars — loaded BEFORE any module imports
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/datun_test',
      JWT_SECRET: 'test-jwt-secret-minimum-32-characters-long-for-tests',
      JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-chars-different-from-jwt',
      ANTHROPIC_API_KEY: 'sk-ant-test-key-for-vitest-only',
      SENTRY_DSN: '',
      LOGTAIL_SOURCE_TOKEN: '',
      WHATSAPP_ENABLED: 'false',
    },
  },
  resolve: {
    // Handle .js imports in TypeScript (NodeNext module resolution)
    extensions: ['.ts', '.js', '.json'],
  },
});
