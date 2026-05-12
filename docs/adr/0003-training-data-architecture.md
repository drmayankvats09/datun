# ADR-0003 — Training Data Capture & Lineage Architecture

**Status:** Accepted
**Date:** 2026-05-12
**Deciders:** Mayank Vats (CEO), Claude (CTO)
**Task:** #44 (+ #131 labeling UI bundled)

---

## Context

Datun v2 had functioning AI consultations (Claude → GPT → Gemini failover) but **zero structured capture of training-eligible data**. Every consultation produced an AI response that was returned to the patient and then lost. This creates three structural problems:

1. **No proprietary moat.** Without a captured dataset, Datun has no defensible advantage vs any other Claude-API wrapper. Series A pitch dies on "What's your moat?"
2. **No cost optimization path.** API cost ~$0.06/consultation today × scale = ₹2cr/year by Year 3. The only escape is a fine-tuned own model, which requires labeled data starting **now**.
3. **No DPDP audit trail.** DPDP Act 2023 enforcement (May 2027) requires demonstrable evidence of consent, redaction, lineage, withdrawal propagation. Capturing this retroactively is impossible.

This ADR establishes the capture, labeling, judging, and lineage architecture.

---

## Decision

### 1. Single-entry-point capture (`captureMessage`)

All `ConsultationMessage` writes route through `apps/api/src/services/training/capture.service.ts:captureMessage()`. **No other function in the repository may call `prisma.consultationMessage.create` directly.** Enforced by `.husky/pre-commit` grep invariant.

**Why:** Privacy/audit invariants must hold for every row. Multiple write paths = inevitable bypass. Stripe's "one place creates a Charge" principle applied to message rows.

### 2. Runtime PII redaction at write-time, not export-time

Every captured message produces `redactedContent` JSONB at write time using `packages/db/src/lib/training/redaction.ts`. Raw `content` is retained for clinical context; only `redactedContent` is downstream training-eligible.

**Why:** Export-time redaction is fragile — a missed pass exposes raw PII in JSONL files at rest. Write-time guarantees zero raw PII ever enters a training-eligible derivation.

**Trade-off:** Storage cost +~30% per row (raw + redacted). Acceptable at 100M rows/year projected (Year 5).

### 3. Postgres-native dataset versioning (no DVC/lakeFS)

`DataAssetVersion` table content-addresses each export batch via SHA-256 over canonical-JSON. Lineage via `parentVersionId`.

**Why:** At Datun's scale (sub-1TB datasets through Year 3), DVC's git-centric workflow adds friction without scale benefit. lakeFS requires separate infrastructure ($). Postgres-native: zero new infra, $0 ongoing cost, FAANG companies use this pattern internally pre-100TB.

**Alternatives considered:**

- DVC — Rejected (Git-centric workflow, lakeFS acquired in 2025 stewardship risk)
- lakeFS — Rejected (separate paid infra, premature at current scale)
- Dolt — Rejected (custom DB, divergence from Postgres ecosystem)

**Reversal trigger:** When dataset size > 1TB OR cross-team dataset collaboration emerges → reconsider lakeFS.

### 4. LLM-as-judge from Day 1 (not human-only)

Claude Haiku 4.5 grades ASSISTANT messages on a 1-5 rubric via `apps/api/src/services/training/judge.service.ts:gradeMessage()`. Daily cron at 04:00 IST processes last 24h messages with $1/run cost ceiling.

**Why:** Solo founder bottleneck. Mayank can label 50/day = 12.5k/year. Judge labels 100/day = 25k/year at ~₹85/day cost. Croxford et al. 2025 (medRxiv) validates ICC 0.818 for clinical LLM-as-judge — equivalent to human-pair agreement.

**Alternatives considered:**

- Human-only — Rejected (12.5k/year ceiling, no path to scale)
- Crowd-only — Rejected (clinical context requires domain expert)
- Decision: Two-tier with Mayank reviewing conflicts (delta ≥ 2 from judge)

### 5. Active learning queue (TypiClust + Margin auto-switch)

`apps/api/src/services/training/queue.service.ts` implements 4 strategies. Default `typi_clust` (diversity, low-data regime) auto-switches to `margin` (uncertainty, high-data regime) at 1000 labels per TCM paper threshold.

**Why:** Random labeling wastes 90% of labeler effort. TCM is 2024 SOTA per published benchmarks.

### 6. Three-tier consent model

- `Consultation.dataTrainingConsentAt` — granted-once timestamp
- `Consultation.dataTrainingConsentVersion` — semver of consent text shown
- `ConsentLog` rows with `purpose=DATA_TRAINING` — chronological audit trail

**Why:** DPDP Act 2023 requires (a) explicit purpose-specific consent, (b) of-equal-simplicity withdrawal, (c) audit trail with 7-year retention. Treatment consent and training consent are distinct purposes — bundling them would violate purpose limitation.

### 7. Reserved schema columns for future tasks

The migration adds nullable columns that won't be used until later tasks:

- `embeddingId` — Task #132 RAG (Month 5)
- `judgeScore` — populated by Task #44 judge cron itself
- `exportedToTrainingAt`, `exportBatchId` — Task #44 future export pipeline (Month 6)

**Why:** Adding a column later requires a separate migration + PR + zero-downtime deploy. Adding nullable columns now = zero cost, lifetime save.

---

## Consequences

### Positive

- **Day 1 data flywheel.** Every consultation now produces a labeled training-eligible record after Mayank labels it.
- **DPDP-defensible.** Full consent + audit + redaction stack legible to auditors.
- **Cost optimization unblocked.** When labeled count ≥ 10k (estimated Month 12), LoRA fine-tune becomes viable.
- **No new infra cost.** Postgres-native versioning, judge runs on existing Anthropic API key.

### Negative

- **Storage overhead** ~30% per message (raw + redacted).
- **Single-entry-point invariant** must be enforced by tooling, not relying on developer discipline.
- **Judge cost scales linearly** with consultation volume — needs review at 1000+ consultations/day.

### Reversal triggers

- **Dataset > 1TB:** Switch to lakeFS for cross-team workflows.
- **Judge cost > ₹10k/month:** Reduce cron frequency or batch size.
- **Mayank labeling discipline < 30 days streak:** Reconsider whether human labels add value beyond judge.

---

## References

- Croxford et al. 2025 (medRxiv) — Clinical LLM-as-judge ICC 0.818
- Hacohen et al. 2022 — TypiClust active learning paper
- Lewis & Gale 1994 — Uncertainty sampling original paper
- DPDP Rules 2025 (notified 13 Nov 2025) — India enforcement framework
- RFC 8785 — JSON Canonicalization Scheme (content-hash basis)
- Anthropic HH-RLHF dataset documentation (preference pair patterns)
