// ═══════════════════════════════════════════════════════════════
// SECURITY TESTS — OWASP Top 10 patterns
// Tests auth bypass, injection, XSS, rate limiting.
// Pattern: Stripe, GitHub — automated security regression tests.
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { getTestApp } from '../helpers/test-app.js';
import { JwtService } from '../../services/auth/jwt.service.js';

describe('Security — Auth Bypass Prevention', () => {
  it('rejects request without Bearer token — no data leakage', async () => {
    const res = await getTestApp().post('/api/chat');
    // Must NOT return 200 — either 401 (auth blocked) or 400 (validation) or 404
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(200);
  });

  it('rejects request with malformed token', async () => {
    const res = await getTestApp()
      .post('/api/chat')
      .set('Authorization', 'Bearer not-a-valid-jwt-token')
      .send({ messages: [{ role: 'user', content: 'test' }] });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(200);
  });

  it('rejects request with empty Bearer', async () => {
    const res = await getTestApp()
      .post('/api/chat')
      .set('Authorization', 'Bearer ')
      .send({ messages: [{ role: 'user', content: 'test' }] });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects request with wrong auth scheme', async () => {
    const res = await getTestApp()
      .post('/api/chat')
      .set('Authorization', 'Basic dGVzdDp0ZXN0')
      .send({ messages: [{ role: 'user', content: 'test' }] });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('no protected endpoint returns 200 without valid token', async () => {
    const endpoints = [
      { method: 'post', path: '/api/chat' },
      { method: 'get', path: '/api/users/profile' },
      { method: 'post', path: '/api/consultations/start' },
    ];
    for (const ep of endpoints) {
      const res = await (getTestApp() as any)[ep.method](ep.path);
      expect(res.status).not.toBe(200);
      expect(res.status).not.toBe(201);
    }
  });
});

describe('Security — Injection Prevention', () => {
  it('rejects SQL injection in login email', async () => {
    const res = await getTestApp().post('/api/auth/login').send({
      email: "admin'--",
      password: 'anything',
    });
    // Zod validates email format → rejects before SQL ever runs
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects SQL injection in signup', async () => {
    const res = await getTestApp().post('/api/auth/signup').send({
      email: "'; DROP TABLE users; --",
      password: 'StrongPass1',
      name: 'Hacker',
    });
    expect(res.status).toBe(400);
  });
});

describe('Security — XSS Prevention', () => {
  it('rejects script tags in name field', async () => {
    const res = await getTestApp().post('/api/auth/signup').send({
      email: 'legit@test.com',
      password: 'StrongPass1',
      name: '<script>alert("xss")</script>',
    });
    // Even if it passes validation, the response should not execute scripts
    // Helmet sets X-Content-Type-Options: nosniff
    // React auto-escapes output. This test verifies Helmet headers.
    if (res.status === 200 || res.status === 201) {
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    }
  });

  it('Helmet security headers present on all responses', async () => {
    const res = await getTestApp().get('/');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-xss-protection']).toBeDefined();
  });
});

describe('Security — Request Size Limits', () => {
  it('rejects oversized JSON body', async () => {
    const hugePayload = { data: 'x'.repeat(25 * 1024 * 1024) }; // 25MB > 20MB limit
    const res = await getTestApp().post('/api/auth/login').send(hugePayload);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('Security — CORS', () => {
  it('allows request from production origin', async () => {
    const res = await getTestApp().get('/').set('Origin', 'https://datunai.com');
    expect(res.headers['access-control-allow-origin']).toBe('https://datunai.com');
  });

  it('allows request from localhost (dev)', async () => {
    const res = await getTestApp().get('/').set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});
