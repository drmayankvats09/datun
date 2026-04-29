// ═══════════════════════════════════════════════════════════════
// WEBHOOK NORMALIZER TESTS — Meta + Gupshup payload normalization
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  normalizeMetaIncoming,
  normalizeGupshupIncoming,
} from '../../services/whatsapp/webhook-normalizer.js';

describe('normalizeMetaIncoming', () => {
  it('extracts text message', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid-abc',
                    from: '919999999999',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'Hello' },
                  },
                ],
                metadata: { display_phone_number: '917018464796' },
              },
            },
          ],
        },
      ],
    };
    const result = normalizeMetaIncoming(payload);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.text).toBe('Hello');
    expect(result.messages[0]!.provider).toBe('meta');
    expect(result.messages[0]!.from).toBe('919999999999');
  });

  it('extracts status update', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: 'wamid-xyz',
                    recipient_id: '919999999999',
                    status: 'delivered',
                    timestamp: '1700000000',
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const result = normalizeMetaIncoming(payload);
    expect(result.statuses).toHaveLength(1);
    expect(result.statuses[0]!.status).toBe('delivered');
  });

  it('extracts failed status with error', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: 'wamid-fail',
                    recipient_id: '919999999999',
                    status: 'failed',
                    timestamp: '1700000000',
                    errors: [{ code: 131047, title: 'Window closed' }],
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    const result = normalizeMetaIncoming(payload);
    expect(result.statuses[0]!.status).toBe('failed');
    expect(result.statuses[0]!.errorCode).toBe('131047');
    expect(result.statuses[0]!.errorMessage).toBe('Window closed');
  });

  it('extracts image message with media reference', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid-img',
                    from: '919999999999',
                    timestamp: '1700000000',
                    type: 'image',
                    image: { id: 'media-id-123', mime_type: 'image/jpeg' },
                  },
                ],
                metadata: {},
              },
            },
          ],
        },
      ],
    };
    const result = normalizeMetaIncoming(payload);
    expect(result.messages[0]!.type).toBe('image');
    expect(result.messages[0]!.mediaUrl).toBe('media-id-123');
  });

  it('handles button reply', () => {
    const payload = {
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid-btn',
                    from: '919999999999',
                    timestamp: '1700000000',
                    type: 'button',
                    button: { text: 'Yes', payload: 'YES' },
                  },
                ],
                metadata: {},
              },
            },
          ],
        },
      ],
    };
    const result = normalizeMetaIncoming(payload);
    expect(result.messages[0]!.type).toBe('button');
    expect(result.messages[0]!.text).toBe('Yes');
  });

  it('returns empty arrays on empty payload', () => {
    const result = normalizeMetaIncoming({});
    expect(result.messages).toEqual([]);
    expect(result.statuses).toEqual([]);
  });

  it('handles malformed payload gracefully', () => {
    const result = normalizeMetaIncoming({ entry: null });
    expect(result.messages).toEqual([]);
    expect(result.statuses).toEqual([]);
  });
});

describe('normalizeGupshupIncoming', () => {
  it('extracts message type', () => {
    const payload = {
      type: 'message',
      payload: {
        id: 'gs-123',
        type: 'text',
        payload: { text: 'Hi from Gupshup' },
        sender: { phone: '919999999999' },
        destination: '917018464796',
        timestamp: 1700000000,
      },
    };
    const result = normalizeGupshupIncoming(payload);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.text).toBe('Hi from Gupshup');
    expect(result.messages[0]!.provider).toBe('gupshup');
  });

  it('extracts message-event status', () => {
    const payload = {
      type: 'message-event',
      payload: {
        gsId: 'gs-event-456',
        eventType: 'delivered',
        eventTs: 1700000000,
        destination_phone: '919999999999',
      },
    };
    const result = normalizeGupshupIncoming(payload);
    expect(result.statuses).toHaveLength(1);
    expect(result.statuses[0]!.status).toBe('delivered');
    expect(result.statuses[0]!.provider).toBe('gupshup');
  });

  it('maps enqueued status to sent', () => {
    const payload = {
      type: 'message-event',
      payload: {
        gsId: 'gs-eq-1',
        eventType: 'enqueued',
        eventTs: 1700000000,
        destination_phone: '919999999999',
      },
    };
    const result = normalizeGupshupIncoming(payload);
    expect(result.statuses[0]!.status).toBe('sent');
  });

  it('extracts image message with URL', () => {
    const payload = {
      type: 'message',
      payload: {
        id: 'gs-img',
        type: 'image',
        payload: { url: 'https://media.gupshup.io/image-123.jpg' },
        sender: { phone: '919999999999' },
        destination: '917018464796',
        timestamp: 1700000000,
      },
    };
    const result = normalizeGupshupIncoming(payload);
    expect(result.messages[0]!.type).toBe('image');
    expect(result.messages[0]!.mediaUrl).toContain('media.gupshup.io');
  });

  it('returns empty on unknown type', () => {
    const payload = { type: 'unknown', payload: {} };
    const result = normalizeGupshupIncoming(payload);
    expect(result.messages).toEqual([]);
    expect(result.statuses).toEqual([]);
  });

  it('handles missing payload gracefully', () => {
    const result = normalizeGupshupIncoming({});
    expect(result.messages).toEqual([]);
    expect(result.statuses).toEqual([]);
  });
});
