// ═══════════════════════════════════════════════════════════════
// WORKER TEST SETUP — Mocks for external dependencies
// ═══════════════════════════════════════════════════════════════

import { vi, afterEach } from 'vitest';

vi.mock('../lib/sentry.js', () => ({
  Sentry: {
    captureException: vi.fn(),
    close: vi.fn().mockResolvedValue(true),
    init: vi.fn(),
  },
}));

vi.mock('../lib/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@repo/db', () => ({
  prisma: {
    jobLog: {
      upsert: vi.fn().mockResolvedValue({ id: 'mock-jobLog-id' }),
      update: vi.fn().mockResolvedValue({ id: 'mock-jobLog-id' }),
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({
      data: { messages: [{ id: 'mock-meta-msg-id' }] },
    }),
  },
}));

vi.mock('resend', () => {
  function Resend() {
    return {
      emails: {
        send: vi.fn().mockResolvedValue({ data: { id: 'mock-resend-id' } }),
      },
    };
  }
  return { Resend };
});

afterEach(() => {
  vi.clearAllMocks();
});
