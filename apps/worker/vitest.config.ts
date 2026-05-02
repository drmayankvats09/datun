import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: './src',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: ['./__tests__/setup.ts'],
    testTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/datun_test',
      JWT_SECRET: 'test-jwt-secret-minimum-32-characters-long-for-tests',
      ANTHROPIC_API_KEY: 'sk-ant-test-key-for-vitest-only',
      SENTRY_DSN: '',
      LOGTAIL_SOURCE_TOKEN: '',
      WHATSAPP_ENABLED: 'false',
      QUEUE_REDIS_URL: '',
      CRON_BACKEND: 'node-cron',
    },
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
});
