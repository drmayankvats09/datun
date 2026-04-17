// ═══════════════════════════════════════════════════════════════
// WHATSAPP PROVIDER TYPES — Multi-provider abstraction
// Meta primary → Gupshup fallback → AiSensy emergency.
// Zero single point of failure for India's #1 messaging channel.
// ═══════════════════════════════════════════════════════════════

export interface WhatsAppSendResult {
  success: boolean;
  /** Provider's message ID for tracking */
  providerMessageId?: string;
  /** Error details if failed */
  errorCode?: string;
  errorMessage?: string;
  /** Which provider handled this */
  provider: string;
  /** Full API response for debugging */
  rawResponse?: unknown;
}

export interface TemplateComponent {
  type: 'body' | 'header' | 'button';
  parameters: Array<{ type: 'text'; text: string }>;
}

export interface WhatsAppProvider {
  readonly name: string;

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
