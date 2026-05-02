// ═══════════════════════════════════════════════════════════════
// TRACE ID — Universal correlation ID across producer, queue, worker
//
// Usage:
//   API: const traceId = generateTraceId();
//        await enqueueWhatsApp({ ..., traceId });
//   Worker: receives traceId in payload, logs with it, stores in JobLog.
//
// Format: "trc_" prefix + 16 random hex chars (96 bits entropy).
// Pattern: Stripe req_xxx IDs, Linear request correlation, AWS X-Ray.
// ═══════════════════════════════════════════════════════════════

import { randomBytes } from 'node:crypto';

const TRACE_ID_LEN = 16; // hex chars after "trc_" prefix

export function generateTraceId(): string {
  return `trc_${randomBytes(TRACE_ID_LEN / 2).toString('hex')}`;
}

export function isValidTraceId(value: unknown): value is string {
  return typeof value === 'string' && /^trc_[a-f0-9]{16}$/.test(value);
}
