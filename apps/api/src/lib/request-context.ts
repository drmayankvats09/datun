// ═══════════════════════════════════════════════════════════════
// REQUEST CONTEXT — AsyncLocalStorage for request-scoped data
// Every log line, every service call, every DB query can access
// the current request ID without passing it through every function.
// Pattern: Go's context.Context, Java's ThreadLocal, AWS X-Ray trace ID.
// ═══════════════════════════════════════════════════════════════

import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
  startedAt: number;
}

export const requestStore = new AsyncLocalStorage<RequestContext>();

/** Get current request ID (returns "system" if outside request scope) */
export function getRequestId(): string {
  return requestStore.getStore()?.requestId ?? 'system';
}

/** Get milliseconds elapsed since request started */
export function getRequestDurationMs(): number {
  const ctx = requestStore.getStore();
  if (!ctx) return 0;
  return Date.now() - ctx.startedAt;
}
