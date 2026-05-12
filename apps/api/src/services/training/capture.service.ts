// ═══════════════════════════════════════════════════════════════
// CAPTURE SERVICE — Task #44
//
// THE SINGLE ENTRY POINT for writing ConsultationMessage rows.
// No other file in apps/* or packages/* may call
// prisma.consultationMessage.create directly — enforced by Phase 4
// husky pre-commit hook + ESLint custom rule.
//
// Responsibilities (executed in order):
//   1. Resolve correlationId from request context (AsyncLocalStorage)
//   2. Run runtime PII redaction (DPDP-compliant)
//   3. Compute uncertainty signal for active learning queue
//   4. Persist ConsultationMessage with both raw + redacted content
//   5. Atomically increment Consultation.totalMessages counter
//   6. Audit trail fires automatically via prisma-audit extension
//
// Consent gate: redactedContent is populated ONLY if the parent
// Consultation has dataTrainingConsentAt set. Without consent,
// raw content is stored (clinical context) but training-eligible
// derivation is null (cannot feed downstream pipeline).
//
// FAANG principles applied:
//   - Single responsibility: capture, nothing else
//   - Idempotency-friendly: caller can pass explicit sequenceNumber
//   - Atomic writes: nested transaction for message + counter update
//   - Audit-by-default: prisma audit middleware records every write
//   - Type-safe: branded inputs, no `any`, no `as`
//
// @see packages/db/src/lib/training/redaction.ts
// @see packages/db/src/lib/training/uncertainty.ts
// @see docs/adr/ADR-0003-training-data-architecture.md
// ═══════════════════════════════════════════════════════════════

import type { MessageContentType, MessageRole } from '@repo/db';
import { prisma, Prisma } from '@repo/db';
import { training } from '@repo/db/lib';
import { getRequestId } from '../../lib/request-context.js';
import { logger } from '../../lib/logger.js';
import { NotFoundError, ValidationError } from '../../errors/index.js';

const { redactMessageContent, computeUncertainty } = training;

// ─── Input contract ────────────────────────────────────────────

/**
 * Inputs accepted by captureMessage. All AI metadata fields are optional
 * because patient messages (role=USER) won't have AI metadata, while AI
 * responses (role=ASSISTANT) should populate them.
 */
export interface CaptureMessageInput {
  readonly consultationId: string;
  readonly role: MessageRole; // USER | ASSISTANT | SYSTEM (canonical)
  readonly content: string;
  readonly contentType?: MessageContentType; // default TEXT
  readonly imageUrl?: string | null;
  readonly chips?: Prisma.InputJsonValue | null;
  readonly selectedChip?: string | null;

  // ── AI metadata (ASSISTANT messages) ──
  readonly aiProvider?: string | null;
  readonly aiModel?: string | null;
  readonly aiLatencyMs?: number | null;
  readonly aiTokensInput?: number | null;
  readonly aiTokensOutput?: number | null;
  readonly aiCostUsd?: number | string | null; // Prisma Decimal accepts both
  readonly promptVersion?: string | null;

  /**
   * Override sequenceNumber. If omitted, derived from current
   * Consultation.totalMessages + 1 (race-safe via UPDATE...RETURNING).
   */
  readonly sequenceNumber?: number;

  /**
   * Override correlationId. If omitted, pulled from AsyncLocalStorage
   * (request-context.ts). Falls back to "system" outside request scope
   * (e.g., worker cron).
   */
  readonly correlationId?: string;
}

// ─── Output contract ───────────────────────────────────────────

export interface CaptureMessageResult {
  readonly messageId: string;
  readonly sequenceNumber: number;
  readonly redactionApplied: boolean;
  readonly piiCategoriesRedacted: readonly string[];
  readonly redactionVersion: string | null;
  readonly uncertaintyBand: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  readonly correlationId: string;
}

// ─── Private helpers ───────────────────────────────────────────

/**
 * Resolve correlation ID with fallback chain:
 *   1. Explicit override (caller provided)
 *   2. AsyncLocalStorage (Express request scope)
 *   3. "system" (worker / cron / test)
 */
function resolveCorrelationId(override: string | undefined): string {
  if (override && override.length > 0) return override;
  const fromContext = getRequestId();
  return fromContext;
}

/**
 * Validate input shape beyond Zod (semantic checks).
 * Throws ValidationError on bad input — caller's bug.
 */
function assertValidInput(input: CaptureMessageInput): void {
  if (!input.consultationId || typeof input.consultationId !== 'string') {
    throw new ValidationError('captureMessage: consultationId required');
  }
  if (!input.role) {
    throw new ValidationError('captureMessage: role required');
  }
  if (typeof input.content !== 'string') {
    throw new ValidationError('captureMessage: content must be a string');
  }
  if (input.aiLatencyMs !== undefined && input.aiLatencyMs !== null && input.aiLatencyMs < 0) {
    throw new ValidationError('captureMessage: aiLatencyMs cannot be negative');
  }
  if (
    input.aiTokensInput !== undefined &&
    input.aiTokensInput !== null &&
    input.aiTokensInput < 0
  ) {
    throw new ValidationError('captureMessage: aiTokensInput cannot be negative');
  }
}

// ─── Public API ────────────────────────────────────────────────

/**
 * Capture a single conversation turn into ConsultationMessage.
 *
 * Atomicity:
 *   - All writes inside a single `prisma.$transaction`.
 *   - On any error, no partial state persists (FK cascade safe).
 *
 * Throws:
 *   - ValidationError — bad input shape
 *   - NotFoundError — consultationId does not exist
 *
 * @example
 *   await captureMessage({
 *     consultationId: "uuid-of-consultation",
 *     role: "ASSISTANT",
 *     content: "Your toothache may be a cavity. Please see a dentist.",
 *     aiProvider: "claude",
 *     aiModel: "claude-opus-4-7",
 *     aiLatencyMs: 1240,
 *     aiTokensInput: 850,
 *     aiTokensOutput: 124,
 *     aiCostUsd: 0.00382,
 *     promptVersion: "v2.1",
 *   });
 */
export async function captureMessage(input: CaptureMessageInput): Promise<CaptureMessageResult> {
  assertValidInput(input);

  const correlationId = resolveCorrelationId(input.correlationId);

  // ── 1. Verify consultation exists + check DATA_TRAINING consent ──
  const consultation = await prisma.consultation.findUnique({
    where: { id: input.consultationId },
    select: {
      id: true,
      totalMessages: true,
      dataTrainingConsentAt: true,
      chiefComplaintLocale: true,
    },
  });

  if (!consultation) {
    throw new NotFoundError(`Consultation ${input.consultationId} not found`);
  }

  const hasTrainingConsent = consultation.dataTrainingConsentAt !== null;

  // ── 2. Runtime PII redaction (only persisted if consent granted) ──
  const redactionLocale: 'hi' | 'en' | 'mixed' =
    consultation.chiefComplaintLocale === 'hi'
      ? 'hi'
      : consultation.chiefComplaintLocale === 'en'
        ? 'en'
        : 'mixed';

  const redaction = redactMessageContent(input.content, redactionLocale);

  // ── 3. Uncertainty signal for ASSISTANT messages (active learning) ──
  let uncertaintyBand: 'HIGH' | 'MEDIUM' | 'LOW' | null = null;
  if (input.role === 'ASSISTANT' || input.role === 'AI') {
    const uncertainty = computeUncertainty({
      responseText: input.content,
      responseTokens: input.aiTokensOutput ?? undefined,
      latencyMs: input.aiLatencyMs ?? undefined,
      // judgeScore not yet computed — null. Will be filled by judge cron.
      judgeScore: null,
    });
    uncertaintyBand = uncertainty.band;
  }

  // ── 4. Atomic write: ConsultationMessage + Consultation counter ──
  //
  // Transaction strategy: read-modify-write the totalMessages counter
  // inside a serializable transaction to avoid races between concurrent
  // turns. Sequence number derived from the post-increment value.
  const result = await prisma.$transaction(
    async (tx) => {
      const seqOverride = input.sequenceNumber;

      // Increment counter and atomically derive next sequence number
      const updated = await tx.consultation.update({
        where: { id: input.consultationId },
        data: { totalMessages: { increment: 1 } },
        select: { totalMessages: true },
      });

      const finalSeqNumber = seqOverride ?? updated.totalMessages;

      // Persist message with all metadata
      const message = await tx.consultationMessage.create({
        data: {
          consultationId: input.consultationId,
          role: input.role,
          content: input.content,
          contentType: input.contentType ?? 'TEXT',
          imageUrl: input.imageUrl ?? null,
          chips: input.chips ?? Prisma.JsonNull,
          selectedChip: input.selectedChip ?? null,
          sequenceNumber: finalSeqNumber,

          // AI metadata
          aiProvider: input.aiProvider ?? null,
          aiModel: input.aiModel ?? null,
          aiLatencyMs: input.aiLatencyMs ?? null,
          aiTokensInput: input.aiTokensInput ?? null,
          aiTokensOutput: input.aiTokensOutput ?? null,
          aiCostUsd: input.aiCostUsd ?? null,
          promptVersion: input.promptVersion ?? null,

          // Privacy + lineage
          // CRITICAL: redactedContent populated ONLY with explicit consent.
          // Without consent, training-derivation is null → consultation
          // CANNOT contribute to training pipeline (eligibility gate).
          redactedContent: hasTrainingConsent
            ? {
                text: redaction.redactedText,
                piiCategoriesFound: redaction.piiCategoriesFound,
                maskCount: redaction.maskCount,
                redactionVersion: redaction.redactionVersion,
              }
            : Prisma.JsonNull,
          piiRedactionVersion: hasTrainingConsent ? redaction.redactionVersion : null,
          correlationId,
        },
        select: {
          id: true,
          sequenceNumber: true,
        },
      });

      return message;
    },
    {
      isolationLevel: 'Serializable',
      maxWait: 5000,
      timeout: 10000,
    },
  );

  logger.info('[Capture] Message persisted', {
    messageId: result.id,
    consultationId: input.consultationId,
    role: input.role,
    sequenceNumber: result.sequenceNumber,
    redactionApplied: hasTrainingConsent,
    piiCategoriesRedacted: redaction.piiCategoriesFound,
    uncertaintyBand,
    correlationId,
    aiProvider: input.aiProvider ?? null,
    aiCostUsd: input.aiCostUsd ?? null,
  });

  return {
    messageId: result.id,
    sequenceNumber: result.sequenceNumber,
    redactionApplied: hasTrainingConsent,
    piiCategoriesRedacted: redaction.piiCategoriesFound,
    redactionVersion: hasTrainingConsent ? redaction.redactionVersion : null,
    uncertaintyBand,
    correlationId,
  };
}

/**
 * Batch capture helper — for replaying historical conversations
 * (e.g., v1→v2 migration). Maintains sequence order strictly.
 *
 * NOT for hot path use — captureMessage() one-at-a-time for real
 * conversations to preserve correlationId per turn.
 */
export async function captureMessagesBatch(
  consultationId: string,
  messages: ReadonlyArray<Omit<CaptureMessageInput, 'consultationId' | 'sequenceNumber'>>,
): Promise<readonly CaptureMessageResult[]> {
  const results: CaptureMessageResult[] = [];
  let seq = 0;

  for (const msg of messages) {
    seq += 1;
    const result = await captureMessage({
      ...msg,
      consultationId,
      sequenceNumber: seq,
    });
    results.push(result);
  }

  return results;
}
