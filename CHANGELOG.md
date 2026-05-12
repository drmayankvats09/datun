# Changelog

All notable changes to Datun will be documented in this file.

## [Unreleased] — v2.0.0

### Added

- **Task #44 Phase 4 (Tests + Docs + DPIA + CI + Hygiene)** — Training pipeline ship-ready:
  - 6 test files covering PII redaction (500 fuzz cases × 5 categories), eligibility gate (64 combinations), content-hash determinism, capture service consent gating, judge idempotency + cost ceiling, queue strategy auto-switch
  - 4 docs: ADR-0003 (architecture decision record), `docs/training-data-pipeline.md` (engineer onboarding), `docs/dpdp/training-data-dpia.md` (DPDP Act 2023 Data Protection Impact Assessment, legal artifact), `docs/runbooks/training-pipeline-emergency.md` (operational runbook with 8 scenarios)
  - `.github/workflows/training-data-fuzz.yml` — 2000-case privacy fuzz on every PR touching redaction; sticky PR comments; merge-blocking on PII leak
  - `.husky/pre-commit` Step 7 — capture invariant enforcement: any direct `prisma.consultationMessage.create` outside `capture.service.ts` blocks commit
  - **Task #44 status: SHIPPED.** All 53 file touches across Phase 1–4 delivered. Master plan progress: 43/215 tasks complete.
- **Task #44 Phase 2 (Services + routes + worker)** — Training pipeline runtime live:
  - `captureMessage()` — single entry point for `ConsultationMessage` writes (serializable txn, consent-gated redaction, correlation ID propagation)
  - `gradeMessage()` — LLM-as-judge auto-grader via Claude Haiku 4.5 (₹0.85/message, ICC 0.818 validated, JUDGE_PROMPT_VERSION v1.0.0)
  - `buildLabelingQueue()` — TypiClust + Margin + Conflicts + Random strategies (auto-switch at 1k labels)
  - `submitLabel()` — idempotent label submission with judge-conflict detection
  - Admin endpoints `/api/admin/labeling/*` (queue, submit, stats, conflicts, judge/grade) — RBAC ADMIN
  - Worker cron `judge-grading-daily` — runs 04:00 IST, grades last 24h messages, $1/run cost ceiling
  - `consultation.router.ts` + `chat.router.ts` stubs implemented — full runtime capture pipeline live
  - New shared queue contract: `JUDGE_GRADING` queue + `JUDGE_GRADING_DAILY` scheduled job
- **Task #44 Phase 1 (Schema + DB helpers + types)** — Training data pipeline foundation:
  - 3 new enums (`LabelerTier`, `JudgeRunStatus`, `DataAssetKind`)
  - 12 new columns on `ConsultationMessage` (per-message AI metadata, redacted content, judge score, lineage)
  - 2 new columns on `Consultation` (`dataTrainingConsentAt`, `dataTrainingConsentVersion`) — DPDP Act 2023 compliance
  - 3 new columns on `TrainingLabel` (`tier`, `agreementScore`, `disputedWithLabelId`) — multi-tier labeling
  - 2 new tables: `JudgeRun` (LLM-as-judge audit trail) and `DataAssetVersion` (content-addressed dataset versioning)
  - New helper library `@repo/db/lib/training`:
    - `redactMessageContent` — runtime PII redaction (RFC 8785 canonical, idempotent, versioned `v1.0.0`)
    - `isEligibleForTraining` — pure eligibility gate (6 blockers checked, structured output)
    - `hashDataset` — SHA-256 content-addressed dataset hashing (DVC-equivalent, Postgres-native)
    - `computeUncertainty` — black-box uncertainty estimation (Kuhn 2023 + Margatina 2023 research-validated)
  - Shared types `@repo/shared/types/training` + `@repo/shared/types/judge` — branded types for quality scores + judge agreement metrics
  - Migration: `20260512000000_task_44_training_pipeline` — backward-compatible, additive only, zero downtime
- Monorepo architecture (Turborepo + pnpm)
- Own auth system (JWT + bcrypt, Google OAuth, Phone OTP)
- Multi-provider AI fallback (Claude → GPT-4 → Gemini)
- i18n support (English + Hindi)
- WhatsApp Business integration
- Sentry error tracking + Better Stack logging

### Changed

- Frontend: Next.js 16, React 19, Tailwind v4, shadcn/ui
- Backend: Express 5, Prisma 6, TypeScript strict
- Brand: "Datun AI" → "Datun"

### Removed

- Auth0 dependency
- googleapis library
