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
    // ── Test timeout ──
    // 30s allows for bcrypt SALT_ROUNDS=12 on Windows (~5s/hash).
    // Production CI (Linux) runs in <1s. This is safety margin for cross-platform devs.
    testTimeout: 30_000,

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
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },

    // Test env vars — loaded BEFORE any module imports.
    // CRITICAL: env.ts validates these at module load time. Tests that mutate
    // process.env at runtime (e.g., process.env.X = 'foo' in beforeAll) DO NOT
    // affect already-loaded env module. So all env values needed for
    // route/handler tests must be declared here.
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
      // Webhook integration test fixtures (loaded into env.ts at module load)
      WHATSAPP_VERIFY_TOKEN: 'test-verify-token-12345',
      META_APP_SECRET: 'meta-test-secret-for-webhook-integration',
      GUPSHUP_WEBHOOK_SECRET: 'gupshup-test-secret',
    },
  },
  resolve: {
    // Handle .js imports in TypeScript (NodeNext module resolution)
    extensions: ['.ts', '.js', '.json'],
  },
});
