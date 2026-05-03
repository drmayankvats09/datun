# ADR-0003 — BullMQ Redis Architecture (Retroactive)

**Status:** Accepted
**Date:** 2026-05-03 (retroactive — implementation Day 14)
**Deciders:** Mayank Vats (CEO), Claude (CTO)
**Task:** #41 (separate from this ADR)

---

## Context

Datun v2 needs a job queue for:

- WhatsApp template sends (rate-limited by Meta)
- Email sends via Resend (rate-limited)
- 3-day / 7-day follow-up reminders
- AI inference cost tracking jobs
- PDF generation async path
- Drift check job (nightly, called from Phase I cron)

Synchronous in-request processing is unacceptable — Meta WhatsApp API can take 200ms-3s, and a slow webhook reply triggers Meta's retry logic.

## Decision

Adopt **BullMQ + Redis (Upstash)** with the following architecture:

### Stack

- BullMQ 5.x (job queue library)
- Upstash Redis (managed Redis with TLS, free tier sufficient for current load)
- Bull-board UI mounted at `/internal/queues` (basic-auth protected)

### Queues

- `whatsapp-send` — outbound template messages
- `email-send` — Resend dispatch
- `followup-3day` — delayed jobs scheduled at consultation creation time
- `followup-7day` — same pattern
- `ai-cost-track` — async logging
- `pdf-generate` — async PDF rendering

### Worker

- Separate Railway service (`apps/worker`)
- Same monorepo, shares `@repo/db` and config
- Internal port only (no public HTTP)

### Observability

- Bull-board for live queue inspection
- Prometheus metrics emitted via `prom-client`
- Sentry captures unhandled job errors

### Failure handling

- Exponential backoff: 5s, 30s, 5min, 30min, 24h
- Max 5 retries before dead-letter
- Dead-letter queue inspected manually (no auto-reprocess to prevent loops)

## Consequences

### Positive

- Fast webhook responses (Meta-safe)
- Rate-limit compliance baked in (Bull-MQ rate limiter)
- Retry-on-failure prevents transient errors from losing data
- Observable via Bull-board + metrics

### Negative

- Operational complexity: separate worker service
- Upstash dependency (mitigated: Redis available from multiple providers)

## References

- BullMQ docs: <https://docs.bullmq.io/>
- Datun task #41 (Day 14, 1 May 2026)
- Phase F migration-lock.ts uses same advisory lock pattern as BullMQ for cross-service coordination
