// ═══════════════════════════════════════════════════════════════
// WEBHOOK NORMALIZER — Provider payload → unified internal schema
//
// Meta payload shape:
//   { entry: [{ changes: [{ value: { messages, statuses, contacts } }] }] }
//
// Gupshup payload shape (different):
//   { type: 'message'|'message-event', payload: {...} }
//
// Output: UnifiedIncomingMessage[] | UnifiedStatusUpdate[]
//
// Backend handlers receive normalized data only — provider-blind.
// ═══════════════════════════════════════════════════════════════

import type { UnifiedIncomingMessage, UnifiedStatusUpdate } from './types.js';

interface MetaPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messaging_product?: string;
        metadata?: { display_phone_number?: string };
        messages?: MetaMessage[];
        statuses?: MetaStatus[];
      };
    }>;
  }>;
}

interface MetaMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { id: string; mime_type?: string };
  document?: { id: string; mime_type?: string; filename?: string };
  button?: { text: string; payload: string };
  interactive?: { button_reply?: { id: string; title: string } };
}

interface MetaStatus {
  id: string;
  recipient_id: string;
  status: string;
  timestamp: string;
  errors?: Array<{ code: number; title: string }>;
}

interface GupshupPayload {
  type?: 'message' | 'message-event';
  payload?: {
    id?: string;
    source?: string;
    destination?: string;
    type?: string;
    payload?: { text?: string; url?: string };
    sender?: { phone?: string };
    timestamp?: number;
    // For message-event:
    gsId?: string;
    eventType?: string; // 'enqueued' | 'sent' | 'delivered' | 'read' | 'failed'
    eventTs?: number;
    destination_phone?: string;
  };
}

// ── Meta → Unified ──

export function normalizeMetaIncoming(payload: unknown): {
  messages: UnifiedIncomingMessage[];
  statuses: UnifiedStatusUpdate[];
} {
  const meta = payload as MetaPayload;
  const messages: UnifiedIncomingMessage[] = [];
  const statuses: UnifiedStatusUpdate[] = [];

  for (const entry of meta.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      const businessNumber = value.metadata?.display_phone_number ?? '';

      for (const m of value.messages ?? []) {
        messages.push(metaMessageToUnified(m, businessNumber));
      }

      for (const s of value.statuses ?? []) {
        statuses.push(metaStatusToUnified(s));
      }
    }
  }

  return { messages, statuses };
}

function metaMessageToUnified(m: MetaMessage, businessNumber: string): UnifiedIncomingMessage {
  const type = mapMetaMessageType(m.type);
  let text: string | undefined;
  let mediaUrl: string | undefined;

  if (m.text?.body) text = m.text.body;
  else if (m.button?.text) text = m.button.text;
  else if (m.interactive?.button_reply?.title) text = m.interactive.button_reply.title;
  else if (m.image?.id) mediaUrl = m.image.id;
  else if (m.document?.id) mediaUrl = m.document.id;

  return {
    provider: 'meta',
    messageId: m.id,
    from: m.from,
    to: businessNumber,
    type,
    ...(text !== undefined && { text }),
    ...(mediaUrl !== undefined && { mediaUrl }),
    timestamp: Number(m.timestamp) || Math.floor(Date.now() / 1000),
    raw: m,
  };
}

function metaStatusToUnified(s: MetaStatus): UnifiedStatusUpdate {
  const status = mapMetaStatus(s.status);
  return {
    provider: 'meta',
    messageId: s.id,
    recipientPhone: s.recipient_id,
    status,
    ...(s.errors?.[0] && {
      errorCode: String(s.errors[0].code),
      errorMessage: s.errors[0].title,
    }),
    timestamp: Number(s.timestamp) || Math.floor(Date.now() / 1000),
    raw: s,
  };
}

function mapMetaMessageType(t: string): UnifiedIncomingMessage['type'] {
  switch (t) {
    case 'text':
      return 'text';
    case 'image':
      return 'image';
    case 'document':
      return 'document';
    case 'button':
      return 'button';
    case 'interactive':
      return 'interactive';
    default:
      return 'other';
  }
}

function mapMetaStatus(s: string): UnifiedStatusUpdate['status'] {
  switch (s) {
    case 'sent':
      return 'sent';
    case 'delivered':
      return 'delivered';
    case 'read':
      return 'read';
    case 'failed':
      return 'failed';
    default:
      return 'sent'; // unknown → treat as sent
  }
}

// ── Gupshup → Unified ──

export function normalizeGupshupIncoming(payload: unknown): {
  messages: UnifiedIncomingMessage[];
  statuses: UnifiedStatusUpdate[];
} {
  const gs = payload as GupshupPayload;
  const messages: UnifiedIncomingMessage[] = [];
  const statuses: UnifiedStatusUpdate[] = [];

  if (!gs.payload) return { messages, statuses };

  if (gs.type === 'message') {
    messages.push(gupshupMessageToUnified(gs.payload));
  } else if (gs.type === 'message-event') {
    statuses.push(gupshupStatusToUnified(gs.payload));
  }

  return { messages, statuses };
}

function gupshupMessageToUnified(
  p: NonNullable<GupshupPayload['payload']>,
): UnifiedIncomingMessage {
  const type = mapGupshupMessageType(p.type ?? 'text');
  let text: string | undefined;
  let mediaUrl: string | undefined;

  if (p.payload?.text) text = p.payload.text;
  if (p.payload?.url) mediaUrl = p.payload.url;

  return {
    provider: 'gupshup',
    messageId: p.id ?? 'unknown',
    from: p.sender?.phone ?? p.source ?? '',
    to: p.destination ?? '',
    type,
    ...(text !== undefined && { text }),
    ...(mediaUrl !== undefined && { mediaUrl }),
    timestamp: p.timestamp ?? Math.floor(Date.now() / 1000),
    raw: p,
  };
}

function gupshupStatusToUnified(p: NonNullable<GupshupPayload['payload']>): UnifiedStatusUpdate {
  const status = mapGupshupStatus(p.eventType ?? 'sent');
  return {
    provider: 'gupshup',
    messageId: p.gsId ?? p.id ?? 'unknown',
    recipientPhone: p.destination_phone ?? p.destination ?? '',
    status,
    timestamp: p.eventTs ?? p.timestamp ?? Math.floor(Date.now() / 1000),
    raw: p,
  };
}

function mapGupshupMessageType(t: string): UnifiedIncomingMessage['type'] {
  switch (t) {
    case 'text':
      return 'text';
    case 'image':
      return 'image';
    case 'file':
      return 'document';
    case 'button_reply':
      return 'button';
    default:
      return 'other';
  }
}

function mapGupshupStatus(t: string): UnifiedStatusUpdate['status'] {
  switch (t) {
    case 'sent':
    case 'enqueued':
      return 'sent';
    case 'delivered':
      return 'delivered';
    case 'read':
      return 'read';
    case 'failed':
      return 'failed';
    default:
      return 'sent';
  }
}
