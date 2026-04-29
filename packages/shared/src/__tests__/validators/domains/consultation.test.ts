import { describe, it, expect } from 'vitest';
import {
  chatMessageSchema,
  consultationStartSchema,
  consultationMessageSchema,
  consultationCompleteSchema,
} from '../../../validators/domains/consultation.schema.js';

describe('chatMessageSchema', () => {
  it('accepts text message', () => {
    expect(
      chatMessageSchema.safeParse({
        messages: [{ role: 'user', content: 'dant mein dard hai' }],
      }).success,
    ).toBe(true);
  });

  it('defaults language to en', () => {
    const result = chatMessageSchema.parse({
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(result.language).toBe('en');
  });

  it('accepts image content block', () => {
    expect(
      chatMessageSchema.safeParse({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: 'abc123' },
              },
            ],
          },
        ],
      }).success,
    ).toBe(true);
  });

  it('rejects empty messages array', () => {
    expect(chatMessageSchema.safeParse({ messages: [] }).success).toBe(false);
  });

  it('rejects invalid role', () => {
    expect(
      chatMessageSchema.safeParse({
        messages: [{ role: 'hacker', content: 'Hi' }],
      }).success,
    ).toBe(false);
  });

  it('rejects invalid image media type', () => {
    expect(
      chatMessageSchema.safeParse({
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'application/pdf', data: 'abc' },
              },
            ],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('rejects unknown content block type', () => {
    expect(
      chatMessageSchema.safeParse({
        messages: [
          {
            role: 'user',
            content: [{ type: 'video', url: 'http://evil.com' }],
          },
        ],
      }).success,
    ).toBe(false);
  });
});

describe('consultationStartSchema', () => {
  it('accepts valid start', () => {
    const result = consultationStartSchema.parse({ clientUuid: 'abc-123', language: 'hi' });
    expect(result.language).toBe('hi');
  });

  it('defaults language to en', () => {
    const result = consultationStartSchema.parse({ clientUuid: 'abc-123' });
    expect(result.language).toBe('en');
  });

  it('rejects empty clientUuid', () => {
    expect(consultationStartSchema.safeParse({ clientUuid: '' }).success).toBe(false);
  });

  it('rejects unsupported locale', () => {
    expect(consultationStartSchema.safeParse({ clientUuid: 'x', language: 'fr' }).success).toBe(
      false,
    );
  });
});

describe('consultationMessageSchema', () => {
  it('accepts typed text message', () => {
    expect(
      consultationMessageSchema.safeParse({
        messages: [{ role: 'user', content: 'yes, it hurts' }],
      }).success,
    ).toBe(true);
  });

  it('rejects empty array', () => {
    expect(consultationMessageSchema.safeParse({ messages: [] }).success).toBe(false);
  });
});

describe('consultationCompleteSchema', () => {
  it('accepts all optional fields', () => {
    expect(consultationCompleteSchema.safeParse({}).success).toBe(true);
  });

  it('accepts full completion data', () => {
    expect(
      consultationCompleteSchema.safeParse({
        findings: 'Dental caries',
        diagnosis: 'Cavity',
        urgency: 'MODERATE',
        prescription: 'Amoxicillin 500mg',
        summary: 'Patient has cavity in lower right molar',
      }).success,
    ).toBe(true);
  });

  it('rejects invalid urgency', () => {
    expect(consultationCompleteSchema.safeParse({ urgency: 'CRITICAL' }).success).toBe(false);
  });
});
