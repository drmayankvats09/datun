// ═══════════════════════════════════════════════════════════════
// WHATSAPP PROVIDER TYPES — Multi-provider abstraction
// Meta primary → Gupshup fallback → AiSensy emergency.
// Zero single point of failure for India's #1 messaging channel.
// ═══════════════════════════════════════════════════════════════

export type WhatsAppProviderName = 'meta' | 'gupshup' | 'aisensy';

export interface WhatsAppSendResult {
  success: boolean;
  /** Provider's message ID for tracking */
  providerMessageId?: string;
  /** Error details if failed */
  errorCode?: string;
  errorMessage?: string;
  /** Which provider handled this */
  provider: WhatsAppProviderName | 'none' | 'all';
  /** Full API response for debugging */
  rawResponse?: unknown;
}

export interface TemplateComponent {
  type: 'body' | 'header' | 'button';
  parameters: Array<{ type: 'text'; text: string }>;
}

export interface WhatsAppProvider {
  readonly name: WhatsAppProviderName;

  /** Whether this provider has all required env vars */
  isConfigured(): boolean;

  /** Send a plain text message (only works within 24hr window) */
  sendText(to: string, body: string): Promise<WhatsAppSendResult>;

  /** Send a pre-approved template message (works anytime) */
  sendTemplate(
    to: string,
    templateName: string,
    components: TemplateComponent[],
  ): Promise<WhatsAppSendResult>;

  /** Check if provider API is reachable (for heartbeat) */
  healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }>;
}

/** Unified incoming message shape (after webhook normalization) */
export interface UnifiedIncomingMessage {
  /** Provider that delivered this webhook */
  provider: WhatsAppProviderName;
  /** Provider-specific message ID (wamid for Meta) */
  messageId: string;
  /** Sender's phone number (E.164 format, no +) */
  from: string;
  /** Recipient's phone number (our business number) */
  to: string;
  /** Message type — text, image, document, button, etc. */
  type: 'text' | 'image' | 'document' | 'button' | 'interactive' | 'other';
  /** Plain text content (for text messages) */
  text?: string;
  /** Media URL (for image/document messages) */
  mediaUrl?: string;
  /** Original timestamp from provider (Unix seconds) */
  timestamp: number;
  /** Original raw payload for debugging */
  raw: unknown;
}

/** Unified status update shape (after webhook normalization) */
export interface UnifiedStatusUpdate {
  provider: WhatsAppProviderName;
  /** The provider's message ID being acknowledged */
  messageId: string;
  /** Recipient phone */
  recipientPhone: string;
  /** Status: sent, delivered, read, failed */
  status: 'sent' | 'delivered' | 'read' | 'failed';
  /** Error info if status === failed */
  errorCode?: string;
  errorMessage?: string;
  timestamp: number;
  raw: unknown;
}
