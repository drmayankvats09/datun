// ═══════════════════════════════════════════════════════════════
// OUTBOX TYPES
// ═══════════════════════════════════════════════════════════════
export type OutboxStatus = 'pending' | 'published' | 'failed' | 'dead';

export type DatunEventType =
  | 'consultation.created'
  | 'consultation.completed'
  | 'whatsapp.send_requested'
  | 'whatsapp.template_consultation_complete'
  | 'whatsapp.template_followup_3day'
  | 'whatsapp.template_followup_7day'
  | 'whatsapp.template_appointment_reminder'
  | 'email.send_requested'
  | 'patient.registered'
  | 'appointment.booked'
  | 'training.example_approved';

export interface OutboxEventInput {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly eventType: DatunEventType;
  readonly payload: Record<string, unknown>;
  readonly partitionKey?: string;
  readonly headers?: Record<string, string>;
}

export interface OutboxEventRecord extends OutboxEventInput {
  readonly id: string;
  readonly sequenceId: bigint;
  readonly status: OutboxStatus;
  readonly attemptCount: number;
  readonly lastError: string | null;
  readonly publishedAt: Date | null;
  readonly nextAttemptAt: Date;
  readonly createdAt: Date;
}

export interface PublishResult {
  readonly success: boolean;
  readonly publishedAt?: Date;
  readonly error?: string;
  readonly retryable: boolean;
}
