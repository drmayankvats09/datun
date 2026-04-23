// ═══════════════════════════════════════════════════════════════
// HEALTH ROUTE INTEGRATION TEST — Supertest
// Tests actual HTTP responses from Express app.
// Pattern: Stripe, GitHub — every API route has integration test.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { getTestApp } from '../helpers/test-app.js';

describe('Health Routes (Integration)', () => {
  it('GET / returns API status', async () => {
    const res = await getTestApp().get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toContain('Datun');
    expect(res.body.version).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /health returns health check with all services', async () => {
    const res = await getTestApp().get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.checks).toBeDefined();
    expect(res.body.checks.database).toBeDefined();
    expect(res.body.checks.auth).toBeDefined();
    expect(res.body.totalMs).toBeDefined();
    expect(res.body.version).toBeDefined();
  });

  it('GET /health database check reports status', async () => {
    const res = await getTestApp().get('/health');
    expect(res.body.checks.database.status).toBe('ok');
  });

  it('GET /health auth check generates + verifies JWT', async () => {
    const res = await getTestApp().get('/health');
    expect(res.body.checks.auth.status).toBe('ok');
    expect(res.body.checks.auth.latencyMs).toBeDefined();
  });

  it('GET /health returns proper content-type', async () => {
    const res = await getTestApp().get('/health');
    expect(res.headers['content-type']).toContain('application/json');
  });

  it('GET /health includes uptime', async () => {
    const res = await getTestApp().get('/health');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('returns security headers from Helmet', async () => {
    const res = await getTestApp().get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('returns 404-equivalent for unknown routes', async () => {
    const res = await getTestApp().get('/api/nonexistent-route-12345');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  // ── Performance assertions ──
  it('GET / responds within 200ms', async () => {
    const start = Date.now();
    await getTestApp().get('/');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('GET /health responds within 500ms', async () => {
    const start = Date.now();
    await getTestApp().get('/health');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });

  // ── Response contract validation ──
  it('GET / response matches expected shape (contract test)', async () => {
    const res = await getTestApp().get('/');
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('timestamp');
    expect(typeof res.body.status).toBe('string');
    expect(typeof res.body.version).toBe('string');
    // ISO 8601 timestamp format
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('GET /health response matches expected shape (contract test)', async () => {
    const res = await getTestApp().get('/health');
    expect(res.body).toHaveProperty('status');
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('checks');
    expect(res.body).toHaveProperty('totalMs');
    expect(res.body).toHaveProperty('timestamp');
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.totalMs).toBe('number');
    expect(typeof res.body.checks).toBe('object');
  });
});
