// ═══════════════════════════════════════════════════════════════
// WHATSAPP CLIENT INTEGRATION TESTS — Provider chain + circuit breaker
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import type {
  WhatsAppProvider,
  WhatsAppSendResult,
  TemplateComponent,
} from '../../services/whatsapp/types.js';
import { CircuitBreaker } from '../../lib/circuit-breaker.js';

// Mock provider factory
function createMockProvider(
  name: 'meta' | 'gupshup' | 'aisensy',
  configured: boolean,
  sendImpl?: () => Promise<WhatsAppSendResult>,
): WhatsAppProvider {
  return {
    name,
    isConfigured: () => configured,
    async sendText() {
      return sendImpl
        ? sendImpl()
        : { success: true, provider: name, providerMessageId: `${name}-1` };
    },
    async sendTemplate() {
      return sendImpl
        ? sendImpl()
        : { success: true, provider: name, providerMessageId: `${name}-2` };
    },
    async healthCheck() {
      return { ok: configured, latencyMs: 50 };
    },
  };
}

describe('Provider chain logic (simulated whatsappClient flow)', () => {
  it('uses first healthy provider', async () => {
    const breaker = new CircuitBreaker<'meta' | 'gupshup' | 'aisensy'>();
    const meta = createMockProvider('meta', true);
    const gupshup = createMockProvider('gupshup', true);
    const providers = [meta, gupshup];

    let result: WhatsAppSendResult = { success: false, provider: 'none' };
    for (const p of providers) {
      if (!breaker.isAvailable(p.name)) continue;
      result = await p.sendText('919999999999', 'hi');
      if (result.success) {
        breaker.recordSuccess(p.name);
        break;
      }
      breaker.recordFailure(p.name);
    }
    expect(result.success).toBe(true);
    expect(result.provider).toBe('meta');
  });

  it('falls through to gupshup when meta fails', async () => {
    const breaker = new CircuitBreaker<'meta' | 'gupshup' | 'aisensy'>();
    const meta = createMockProvider('meta', true, async () => ({
      success: false,
      provider: 'meta',
      errorMessage: 'Meta down',
    }));
    const gupshup = createMockProvider('gupshup', true);
    const providers = [meta, gupshup];

    let result: WhatsAppSendResult = { success: false, provider: 'none' };
    for (const p of providers) {
      if (!breaker.isAvailable(p.name)) continue;
      result = await p.sendText('919999999999', 'hi');
      if (result.success) {
        breaker.recordSuccess(p.name);
        break;
      }
      breaker.recordFailure(p.name);
    }
    expect(result.success).toBe(true);
    expect(result.provider).toBe('gupshup');
  });

  it('all providers failing returns error', async () => {
    const breaker = new CircuitBreaker<'meta' | 'gupshup' | 'aisensy'>();
    const fail = (n: 'meta' | 'gupshup' | 'aisensy') =>
      createMockProvider(n, true, async () => ({
        success: false,
        provider: n,
        errorMessage: `${n} down`,
      }));
    const providers = [fail('meta'), fail('gupshup'), fail('aisensy')];

    let result: WhatsAppSendResult = { success: false, provider: 'none' };
    for (const p of providers) {
      if (!breaker.isAvailable(p.name)) continue;
      result = await p.sendText('919999999999', 'hi');
      if (result.success) {
        breaker.recordSuccess(p.name);
        break;
      }
      breaker.recordFailure(p.name);
    }
    expect(result.success).toBe(false);
  });

  it('skips unhealthy provider via circuit breaker', async () => {
    const breaker = new CircuitBreaker<'meta' | 'gupshup' | 'aisensy'>();
    // Trip meta
    breaker.recordFailure('meta');
    breaker.recordFailure('meta');
    breaker.recordFailure('meta');

    const meta = createMockProvider('meta', true);
    const gupshup = createMockProvider('gupshup', true);
    const providers = [meta, gupshup];

    let attemptedFirst = '';
    for (const p of providers) {
      if (!breaker.isAvailable(p.name)) continue;
      attemptedFirst = p.name;
      break;
    }
    expect(attemptedFirst).toBe('gupshup');
  });

  it('unconfigured providers filtered out', () => {
    const meta = createMockProvider('meta', true);
    const gupshup = createMockProvider('gupshup', false);
    const aisensy = createMockProvider('aisensy', false);
    const active = [meta, gupshup, aisensy].filter((p) => p.isConfigured());
    expect(active.map((p) => p.name)).toEqual(['meta']);
  });

  it('records success increments totalRequests', async () => {
    const breaker = new CircuitBreaker<'meta' | 'gupshup' | 'aisensy'>();
    breaker.recordSuccess('meta');
    breaker.recordSuccess('meta');
    expect(breaker.getHealth('meta').totalRequests).toBe(2);
  });

  it('records failure does not crash on first call', () => {
    const breaker = new CircuitBreaker<'meta' | 'gupshup' | 'aisensy'>();
    expect(() => breaker.recordFailure('meta')).not.toThrow();
  });
});

describe('Template components', () => {
  it('builds correct body component', () => {
    const components: TemplateComponent[] = [
      { type: 'body', parameters: [{ type: 'text', text: 'Mayank' }] },
    ];
    expect(components).toHaveLength(1);
    expect(components[0]!.type).toBe('body');
  });

  it('supports multiple parameters', () => {
    const components: TemplateComponent[] = [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: 'Mayank' },
          { type: 'text', text: 'cavity' },
        ],
      },
    ];
    expect(components[0]!.parameters).toHaveLength(2);
  });
});
