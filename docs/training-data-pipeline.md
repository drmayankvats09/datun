# Datun Training Data Pipeline — Engineer Onboarding

**Purpose:** End-to-end explainer of how every patient consultation becomes (or doesn't become) a labeled training data point.

**Audience:** Future Datun engineers reading on Day 1. No prior context assumed.

---

## TL;DR

1. Patient consents to data training (one-click modal, DPDP-compliant)
2. Every chat turn → `captureMessage()` → `ConsultationMessage` row with PII redacted
3. Daily 04:00 IST → Claude Haiku grades the day's AI responses
4. Mayank labels prioritized queue (TypiClust diversity → Margin uncertainty at 1k+ labels)
5. Once 10k+ labeled examples exist → export pipeline (Month 6) feeds LoRA fine-tune (Month 12)

---

## Data flow diagram

Patient Web API Worker DB
│ │ │ │ │
│── /chat ─────────────►│ │ │ │
│ │── POST /api/chat ─►│ │ │
│ │ │── aiComplete() ────────────────────►│
│ │ │ (Claude failover)│ │
│ │ │◄───response────────│ │
│ │ │── captureMessage() ─────────────────►│
│ │ │ (redact, persist)│ │
│ │◄───response────────│ │ │
│◄────────────────────│ │ │ │
│ │ │ │ │
─── 04:00 IST daily ──────────────────────────────────────────────►│ │
│ │ │ │── gradeMessages
│ │ │ │ for last 24h │
│ │ │ │── write judge │
│ │ │ │ score+reason │
│ │ │ │ │
─── Mayank labels ────────────────────────────────►│ │
│ │── GET /admin/labeling/queue ─► │ │
│ │ (TypiClust until 1k, then Margin) │ │
│ │◄──N items, prioritized │ │
│ │── POST /submit ──►│ │ │
│ │ (creates TrainingLabel) │ │

---

## Components by layer

### Schema (`packages/db/prisma/schema.prisma`)

The pipeline touches these tables:

| Table                 | Role                                                                           |
| --------------------- | ------------------------------------------------------------------------------ |
| `Consultation`        | Parent. Holds `dataTrainingConsentAt` + version                                |
| `ConsultationMessage` | Each conversation turn. Holds raw + redacted content, AI metadata, judge score |
| `TrainingLabel`       | Mayank's 1-5 quality scores + corrections                                      |
| `JudgeRun`            | Audit trail for every LLM-as-judge invocation                                  |
| `DataAssetVersion`    | Content-hash dataset versioning for reproducibility                            |
| `ConsentLog`          | DPDP-mandated chronological consent audit                                      |

### Helpers (`packages/db/src/lib/training/`)

Four pure functions, no I/O:

| File              | What                                                 |
| ----------------- | ---------------------------------------------------- |
| `redaction.ts`    | Strips PII from free text. Versioned `v1.0.0`        |
| `eligibility.ts`  | Gates: consent + completion + age + safety + urgency |
| `content-hash.ts` | SHA-256 over canonical-JSON for dataset versions     |
| `uncertainty.ts`  | Black-box uncertainty estimation for active learning |

### API services (`apps/api/src/services/training/`)

| Service               | Endpoint(s)                                        |
| --------------------- | -------------------------------------------------- |
| `capture.service.ts`  | `captureMessage()` — single entry point            |
| `labeling.service.ts` | Queue, submit, stats, conflicts                    |
| `judge.service.ts`    | `gradeMessage()`, `gradeMessagesBatch()`           |
| `queue.service.ts`    | TypiClust + Margin + Conflicts + Random strategies |

### Worker cron (`apps/worker/src/processors/`)

| Cron                         | Schedule        | What                                                      |
| ---------------------------- | --------------- | --------------------------------------------------------- |
| `judge-grading.processor.ts` | 04:00 IST daily | Last 24h ungraded ASSISTANT messages, cost ceiling $1/run |

### Frontend (`apps/web/app/[locale]/admin/label/`)

- `page.tsx` — main dashboard (progress + strategy + queue)
- `loading.tsx`, `error.tsx` — Next.js automatic
- Components in `apps/web/components/admin/labeling/` and `apps/web/components/consent/`

---

## Core invariants (must never be violated)

1. **Single-entry-point** — `prisma.consultationMessage.create` only called inside `capture.service.ts`. Enforced by husky pre-commit.
2. **Consent-gated redaction** — `redactedContent` populated only when `dataTrainingConsentAt !== null`. Otherwise null (the consultation is NOT training-eligible).
3. **Idempotent redaction** — `redactMessageContent(redactMessageContent(x))` === `redactMessageContent(x)`. Property-tested with 500 fuzz cases.
4. **Idempotent judge runs** — `gradeMessage()` skips if a SUCCESS run exists for same (messageId, promptVersion, rubricVersion). Pass `force=true` to override after version bump.
5. **Versioned mutations** — Any change to redaction rules, judge prompt, judge rubric, or consent text requires a semver bump and migration plan.

---

## What this pipeline does NOT do (yet)

- **Export to S3** — Schema is ready (`exportedToTrainingAt`, `exportBatchId`), but the export cron is **deferred to Month 6** (when ≥2k labels accumulated).
- **RAG / vector embeddings** — `embeddingId` column reserved, populated by future Task #132 (Month 5).
- **Fine-tune execution** — Future Task #133 (Month 10–12). Pipeline produces JSONL; RunPod / Together AI executes.
- **Multi-labeler agreement** — `TrainingLabel.tier` enum and `agreementScore` field ready, but only Mayank labels today. Schema ready for Prasanth co-founder week N+1.

---

## Common operations

### Trigger manual judge grade for a specific message

POST /api/admin/labeling/judge/grade { "messageId": "<uuid>", "force": false }

### Check eligibility for a consultation

node -e "import('@repo/db/lib').then(({training}) => console.log(training.isEligibleForTraining({...})))"

### Compute dataset content hash before exporting (Month 6)

node -e "import('@repo/db/lib').then(({training}) => console.log(training.hashDataset(records)))"

---

## Where to look when things break

- **Capture failing silently?** Check `apps/api/src/services/training/capture.service.ts` logs for `[Capture]` prefix.
- **Judge not running?** Verify `JUDGE_GRADING_ENABLED !== false` in env. Check worker logs for `[Judge cron]`.
- **PII leaking into redactedContent?** Run `pnpm --filter @repo/db test redaction` — property tests should fail loudly.
- **Patient consented but row not eligible?** Run `eligibilityInputFromConsultation` + `isEligibleForTraining` to see structured blockers.

---

## See also

- `docs/adr/0003-training-data-architecture.md` — Design rationale and alternatives
- `docs/dpdp/training-data-dpia.md` — Data Protection Impact Assessment (legal artifact)
- `docs/runbooks/training-pipeline-emergency.md` — Operational runbook for incidents
