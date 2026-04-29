// ═══════════════════════════════════════════════════════════════
// WHATSAPP ZOD SCHEMA TESTS
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  indianPhoneSchema,
  whatsappProviderSchema,
  whatsappSendTextSchema,
  whatsappSendTemplateSchema,
  unifiedIncomingMessageSchema,
} from '../../../validators/domains/whatsapp.schema';

describe('indianPhoneSchema', () => {
  it('accepts valid Indian E.164 (no plus)', () => {
    expect(indianPhoneSchema.safeParse('919999999999').success).toBe(true);
  });

  it('rejects with leading +', () => {
    expect(indianPhoneSchema.safeParse('+919999999999').success).toBe(false);
  });

  it('rejects without 91 prefix', () => {
    expect(indianPhoneSchema.safeParse('9999999999').success).toBe(false);
  });

  it('rejects too short', () => {
    expect(indianPhoneSchema.safeParse('911').success).toBe(false);
  });

  it('rejects too long', () => {
    expect(indianPhoneSchema.safeParse('9199999999999').success).toBe(false);
  });
});

describe('whatsappProviderSchema', () => {
  it('accepts meta', () => {
    expect(whatsappProviderSchema.safeParse('meta').success).toBe(true);
  });
  it('accepts gupshup', () => {
    expect(whatsappProviderSchema.safeParse('gupshup').success).toBe(true);
  });
  it('accepts aisensy', () => {
    expect(whatsappProviderSchema.safeParse('aisensy').success).toBe(true);
  });
  it('rejects unknown provider', () => {
    expect(whatsappProviderSchema.safeParse('twilio').success).toBe(false);
  });
});

describe('whatsappSendTextSchema', () => {
  it('accepts valid request', () => {
    expect(
      whatsappSendTextSchema.safeParse({
        to: '919999999999',
        body: 'Hello',
      }).success,
    ).toBe(true);
  });

  it('rejects empty body', () => {
    expect(
      whatsappSendTextSchema.safeParse({
        to: '919999999999',
        body: '',
      }).success,
    ).toBe(false);
  });

  it('rejects body over 4096 chars', () => {
    expect(
      whatsappSendTextSchema.safeParse({
        to: '919999999999',
        body: 'x'.repeat(4097),
      }).success,
    ).toBe(false);
  });

  it('accepts optional userId', () => {
    expect(
      whatsappSendTextSchema.safeParse({
        to: '919999999999',
        body: 'Hello',
        userId: '550e8400-e29b-41d4-a716-446655440000',
      }).success,
    ).toBe(true);
  });
});

describe('whatsappSendTemplateSchema', () => {
  it('accepts valid template request', () => {
    expect(
      whatsappSendTemplateSchema.safeParse({
        to: '919999999999',
        templateName: 'welcome',
        components: [{ type: 'body', parameters: [{ type: 'text', text: 'Mayank' }] }],
      }).success,
    ).toBe(true);
  });

  it('defaults components to empty array', () => {
    const result = whatsappSendTemplateSchema.parse({
      to: '919999999999',
      templateName: 'welcome',
    });
    expect(result.components).toEqual([]);
  });

  it('rejects template name over 64 chars', () => {
    expect(
      whatsappSendTemplateSchema.safeParse({
        to: '919999999999',
        templateName: 'x'.repeat(65),
      }).success,
    ).toBe(false);
  });
});

describe('unifiedIncomingMessageSchema', () => {
  it('accepts valid normalized message', () => {
    expect(
      unifiedIncomingMessageSchema.safeParse({
        provider: 'meta',
        messageId: 'wamid-123',
        from: '919999999999',
        to: '917018464796',
        type: 'text',
        text: 'Hello',
        timestamp: 1700000000,
        raw: {},
      }).success,
    ).toBe(true);
  });

  it('rejects invalid type', () => {
    expect(
      unifiedIncomingMessageSchema.safeParse({
        provider: 'meta',
        messageId: 'wamid-123',
        from: '919999999999',
        to: '917018464796',
        type: 'sticker', // not in enum
        timestamp: 1700000000,
        raw: {},
      }).success,
    ).toBe(false);
  });
});
