// ═══════════════════════════════════════════════════════════════
// WORKER HEALTH SERVER TESTS — HTTP endpoints
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import http from 'node:http';

vi.mock('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    QUEUE_REDIS_URL: 'redis://localhost:6379',
  },
}));

vi.mock('ioredis', () => {
  function Redis() {
    return {
      ping: vi.fn().mockResolvedValue('PONG'),
      on: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  return { Redis, default: Redis };
});

import { startHealthServer, stopHealthServer } from '../../lib/health-server.js';

function fetchUrl(path: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:4001${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.setTimeout(2000, () => {
      req.destroy(new Error('request timeout'));
    });
  });
}

async function waitForServerReady(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    try {
      await fetchUrl('/health');
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  throw new Error('Health server did not start within 1s');
}

describe('Worker health server', () => {
  beforeEach(async () => {
    startHealthServer();
    await waitForServerReady();
  });

  afterEach(async () => {
    await stopHealthServer();
  });

  it('responds 200 on /health when Redis healthy', async () => {
    const res = await fetchUrl('/health');
    expect(res.status).toBe(200);
    const json = JSON.parse(res.body);
    expect(json.status).toBe('healthy');
    expect(json.redis).toBe('connected');
  });

  it('responds with metrics in Prometheus format on /metrics', async () => {
    const res = await fetchUrl('/metrics');
    expect(res.status).toBe(200);
    expect(res.body).toContain('# HELP');
    expect(res.body).toContain('# TYPE');
    expect(res.body).toContain('datun_worker_uptime_seconds');
  });

  it('returns 404 on unknown route', async () => {
    const res = await fetchUrl('/unknown');
    expect(res.status).toBe(404);
  });
});
