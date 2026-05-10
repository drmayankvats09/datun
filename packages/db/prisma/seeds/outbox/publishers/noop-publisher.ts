// ═══════════════════════════════════════════════════════════════
// NOOP PUBLISHER — for events that just need archival, no external send
// ═══════════════════════════════════════════════════════════════
import type { Publisher } from '../outbox-relay';
import type { PublishResult } from '../outbox.types';

export const noopPublisher: Publisher = async (): Promise<PublishResult> => ({
  success: true,
  publishedAt: new Date(),
  retryable: false,
});
