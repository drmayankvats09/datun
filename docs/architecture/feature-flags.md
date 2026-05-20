# Feature Flag Platform Architecture

> Status: **Active** • Owner: Platform / CTO • Last reviewed: 2026-05-19 • Task: #49

Datun's feature flag platform is a four-layer hybrid that lets a single admin toggle propagate to every running API instance within one second, while guaranteeing that the request path keeps serving traffic even when every external dependency is down. This document explains the layers, the decision flow inside the evaluator, the operational surfaces, and the trade-offs that shape every choice.

---

## TL;DR

- Four read layers, falling through on miss: **in-process LRU → Redis → Postgres → hard-coded defaults**.
- One vendor-agnostic write source: **PostHog admin UI → 60-second mirror into the `feature_flags` table**.
- One propagation channel: **Redis pub/sub on the `datun:flags:invalidate` channel** wipes the per-process L1 across every replica on every admin mutation, so 1-second convergence is the steady-state floor.
- Deterministic per-user bucketing uses **FNV-1a 32-bit** keyed on `(flagKey, userId|clinicId)`. Same user, same flag, same number, forever — no flicker.
- Every evaluation answers with a stable **`FlagEvaluationReason`** string. Dashboards, audits, and runbooks key off these reasons. Never renamed without a deprecation cycle.
- One-percent of evaluations are persisted to `feature_flag_evaluations` for DPDP audit and drift detection. The rest are fire-and-forget — the audit table is telemetry, not source of truth.

---

## The Four Read Layers

```
                       ┌───────────────────────────────┐
   client request  →   │ evaluator.evaluate(key, ctx)  │
                       └───────────────┬───────────────┘
                                       ▼
            ┌───────────────────────────────────────────────┐
            │ L1: in-process LRU (50K entries, 30s TTL)     │  hot-path hit  ~1µs
            └───────────────┬───────────────────────────────┘
                            ▼ miss
            ┌───────────────────────────────────────────────┐
            │ L2: Redis (Upstash REST, 60s TTL)             │  warm hit     ~5ms
            └───────────────┬───────────────────────────────┘
                            ▼ miss
            ┌───────────────────────────────────────────────┐
            │ L3: Postgres (feature_flags table)            │  cold hit    ~10ms
            └───────────────┬───────────────────────────────┘
                            ▼ miss / archived
            ┌───────────────────────────────────────────────┐
            │ L4: hard-coded defaults (flag-defaults.ts)    │  always answers
            └───────────────────────────────────────────────┘
```

Each layer has one job and is independently swappable:

| Layer | Purpose                                                                                           | Failure mode                                                                                              | Tuning knob                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| L1    | Eliminate the network round-trip on the hot path. Per-process LRU, lazy eviction on read.         | Process restart wipes; warms in <1s.                                                                      | `FLAG_CACHE_L1_TTL_SECONDS` (default 30). LRU capacity hard-coded in `flag-cache-l1.service.ts`. |
| L2    | Share warm results across API replicas in the same region.                                        | Upstash REST 5xx → degrades to L3.                                                                        | `FLAG_CACHE_L2_TTL_SECONDS` (default 60).                                                        |
| L3    | Authoritative cache. PostHog admin UI mirrors here every 60s; admin mutations land here directly. | Postgres outage → degrades to L4. The evaluator's `try/catch` around `findUnique` keeps requests flowing. | None — sized by Railway plan.                                                                    |
| L4    | Last-resort defaults. Pure code, no I/O.                                                          | Cannot fail.                                                                                              | `flag-defaults.ts` — one diff to change.                                                         |

The whole stack is wrapped by `flagCacheService` (facade) so callers only see `.get()` and `.set()`. Future regional read-replica caches (per Werner Vogels' "everything fails, all the time") slot in as L1.5 without touching the evaluator.

---

## The 9-Step Decision Flow

The evaluator (`apps/api/src/services/flag/flag-evaluator.service.ts`) walks these steps in order. The first match returns.

1. **Unknown key.** Not in `FLAG_KEYS` registry → return the hard-coded default. Defends the cache from poisoning via misspelled inputs.
2. **Global kill.** `FEATURE_FLAGS_ENABLED=false` → return the hard-coded default. Used during platform-wide incident response when the flag system itself is the suspect.
3. **Cache lookup.** `flagCacheService.get(key, entity)` walks L1 → L2. Hit → return cached `FlagEvaluation`.
4. **DB lookup.** `prisma.featureFlag.findUnique({ where: { flagKey } })`. Wrapped in `try/catch` — Prisma errors degrade to the default; never propagate to the caller.
5. **Archived or absent.** No row OR `archivedAt != null` → return the row's `defaultValue` (or the hard-coded default if no row) with reason `ARCHIVED` / `DEFAULT`.
6. **Override row.** Per-entity exception (USER > CLINIC > ROLE > REGION). Expiry filtered in process. First hit by precedence wins. Reason: `OVERRIDE`.
7. **Clinic enable / disable list.** `enabledClinicIds` / `disabledClinicIds` on the flag row override the status switch — used for "ship to one clinic for QA". Reason: `TARGETED_HIT` / `TARGETED_MISS`.
8. **Status switch.**
   - `OFF` → `STATIC_OFF`.
   - `ON` → `STATIC_ON` (or `KILLSWITCH` when `category=KILL_SWITCH`).
   - `ROLLOUT_BUCKET` → `computeBucket(key, ctx)` against `rolloutPercent`. Reason: `ROLLOUT_HIT` / `ROLLOUT_MISS`.
   - `TARGETED` → `evaluateTargeting(spec, ctx)`. AND/OR combinator over `FlagTargetingRule[]`.
9. **Cache + audit.** Write to L1 and L2 best-effort. Sample 1% to `feature_flag_evaluations` (fire-and-forget — never blocks the caller).

The evaluator NEVER throws. Every branch funnels to a `FlagEvaluation` with a stable reason. This is non-negotiable: a single uncaught throw here would crash every `/api/flags` response.

---

## Deterministic Bucketing

Percentage rollouts depend on the "same user gets the same answer forever" guarantee. Without it, every page navigation could flip a user between treatment and control — analytical poison and a UX nightmare.

We use **32-bit FNV-1a** over the UTF-8 bytes of `${flagKey}:${entityKey}`. Properties:

- **Deterministic** — pure function of bytes; no clock, no randomness.
- **Uniform** — `% 100` distribution stays within ±5% across 10K user IDs (tested in `flag-bucket.test.ts`).
- **Independent across flags** — `(user, flag-A)` and `(user, flag-B)` are uncorrelated (the prefix differs, so the hash diverges).
- **Stable across V8 / Node versions** — no JIT-specific ops; `Math.imul` is the canonical 32-bit multiply.

`bucketKey(ctx)` precedence: `USER > CLINIC > null`. Anonymous contexts cannot bucket; the evaluator treats them as `ROLLOUT_MISS` (defensive default). Targeting rules are the right vehicle for anonymous-traffic rollouts (e.g., `region in ['IN']`).

---

## Propagation: How an Admin Toggle Reaches Every Request

```
   Admin clicks "ON" in /admin/flags
                │
                ▼
   POST /api/admin/flags/:key/kill   (replica A)
                │
                ├──► prisma.featureFlag.update(...)
                │
                ├──► flagCacheService.invalidateFlag(key)  ← wipes L1 + L2 on replica A
                │
                └──► publishFlagInvalidation(key)          ← Redis PUBLISH on channel
                                  │
                                  ▼
   Redis pub/sub fan-out  →  replicas B, C, D, E
                                  │
                                  ▼
                       flagPubsub on each replica wipes L1
```

**Worst case** convergence = `L2 TTL` (60s) when Redis pub/sub is unreachable. **Typical case** = <100ms — the pub/sub delivery floor.

Why pub/sub (TCP) instead of Upstash REST: REST has no `SUBSCRIBE` primitive. We reuse Railway's queue Redis (the same instance BullMQ uses) on dedicated `subscriber` + `publisher` connections. ioredis is already in the deps tree.

---

## PostHog Mirror

PostHog is **not** in the read path. It is the **admin UI source-of-truth**.

- Server-side cron polls `GET /api/projects/@current/feature_flags/` every 60 seconds.
- Each remote row is upserted into `feature_flags` by `flagKey`.
- Only **lifecycle fields** (`status`, `rolloutPercent`, `archivedAt`) are mirrored. Local admin edits to `targetingRules` / `enabledClinicIds` / `description` are preserved.
- On any row change, `invalidateFlag` + `publishFlagInvalidation` fire — same path as a local admin mutation.

When `POSTHOG_API_KEY` is unset, the sync worker is a no-op. The platform runs in **DB-only mode** — flags managed exclusively through `/admin/flags`. This is the day-one default; PostHog is enabled later as the admin team grows.

---

## Kill Switches: First-Class Architectural Primitive

`requireFlagOff(FLAG_KEYS.KILLSWITCH_X)` decorates a route. When the flag is ON:

- Express short-circuits to `AppError` 503 `KILL_SWITCH_ACTIVE`.
- `Retry-After` header set per RFC 7231 §7.1.3.
- The reason supplied by the admin is logged at `error` level with `incidentId` correlation.

The default for every `KILLSWITCH_*` is `false` (kill INACTIVE). The active position requires a deliberate `POST /api/admin/flags/:key/kill` with a non-empty reason. This is intentional: a misbooted system without DB rows must NOT permanently kill itself.

See `docs/runbooks/feature-flag-kill-switch.md` for the activation runbook.

---

## Flag Lifecycle Hygiene

Every flag SHOULD have a `staleAt` date set in the DB. The daily **flag-hygiene cron** (03:00 IST, distributed-locked) does two things:

1. **Stale detection.** Active flags whose `staleAt <= now` are bundled into a single WARNING email digest to the admin. The action item is binary: extend `staleAt` or remove the flag.
2. **Archive purge.** Flags whose `archivedAt < now - 180 days` are physically deleted. By that point the flag's removal has shipped to every running client.

The 90-day "stale" window matches LaunchDarkly's published hygiene recommendation. The 180-day archive grace window matches typical Datun mobile app upgrade tail (95% of users update within 60 days; we double the headroom).

---

## DPDP, Privacy, and Audit

- Browser-side PostHog session replay is **off** unconditionally (`disable_session_recording: true`). Memory rule: never record clinical content into a third-party vendor.
- DNT is respected (`respect_dnt: true`).
- The audit table `feature_flag_evaluations` is **sampled at 1%**. `FLAG_EVALUATION_AUDIT_SAMPLE_RATE` is tunable. At 10K evals/sec with 1% sampling that's ~100K rows/day = ~36M rows/year — partition before crossing.
- Override `reason` field is free-text but bounded to 500 characters. Used for incident correlation only; no PII or clinical content.
- `createdByUserId` is the admin who created the flag — never an end-user id.

---

## Observability

- Every cache layer surfaces `metrics()` (hits, misses, evictions, hit-rate). Phase E will plumb this into `/internal/metrics`.
- Every evaluation result carries `evaluatedAt` (server clock) — useful for ageing cache investigations.
- Sentry breadcrumbs: kill-switch activations are logged at `error` level (Sentry escalates) so on-call sees them in the incident timeline.

---

## Trade-offs and What's Deferred

| Decision                                      | Trade-off                                                 | Why now / Why later                                                           |
| --------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Poll-based browser refresh (60s)              | Up to 60s convergence vs `EventSource` complexity         | Day-one volume doesn't earn SSE; switch when admin churn rate justifies.      |
| FNV-1a (non-cryptographic)                    | Speed vs (irrelevant here) attacker resistance            | Bucket outputs are non-secret; the worst attack is "user knows their bucket". |
| No optimistic UI in admin                     | Slight perceived latency vs flicker / rollback complexity | Admin operations are rare; correctness > perceived speed.                     |
| Server-evaluator does NOT call PostHog inline | One less network call on the hot path                     | Provider fallback is a Phase F task when DB read failure rate justifies.      |
| Audit at 1% (not 100%)                        | Row volume vs perfect timeline                            | Sampling matches what dashboards need; 100% is reserved for incident replays. |

---

## Related Files

| File                                                   | Role                                          |
| ------------------------------------------------------ | --------------------------------------------- |
| `packages/shared/src/flags/flag-keys.ts`               | Canonical key registry (30 keys, kebab-case). |
| `packages/shared/src/flags/flag-types.ts`              | Wire DTOs + Zod context.                      |
| `apps/api/src/services/flag/flag-evaluator.service.ts` | The 9-step decision engine.                   |
| `apps/api/src/services/flag/flag-cache-l1.service.ts`  | In-process LRU.                               |
| `apps/api/src/services/flag/flag-cache.service.ts`     | L1 + L2 facade.                               |
| `apps/api/src/services/flag/flag-bucket.ts`            | FNV-1a 32-bit bucketing.                      |
| `apps/api/src/services/flag/flag-sync.service.ts`      | PostHog → DB mirror (60s).                    |
| `apps/api/src/services/flag/flag-pubsub.service.ts`    | Redis cross-instance invalidation.            |
| `apps/api/src/services/flag/flag-defaults.ts`          | Hard-coded last-resort defaults.              |
| `apps/api/src/middleware/flags.middleware.ts`          | `req.featureFlags` attach.                    |
| `apps/api/src/middleware/kill-switch.middleware.ts`    | `requireFlagOff` / `requireFlagOn`.           |
| `apps/api/src/routes/flags.router.ts`                  | `GET /api/flags`.                             |
| `apps/api/src/routes/admin/flags.router.ts`            | Admin CRUD + overrides + kill switch.         |
| `apps/api/src/crons/flag-hygiene.cron.ts`              | Daily stale + archive purge.                  |
| `apps/web/lib/posthog/*`                               | Browser SDK lazy wrappers.                    |
| `apps/web/components/providers/posthog-provider.tsx`   | App-level provider.                           |
| `apps/web/components/feature-gate.tsx`                 | `<FeatureGate>` + `useFeatureGate`.           |
| `apps/web/hooks/queries/use-feature-flags.ts`          | TanStack Query hook.                          |
| `apps/web/hooks/mutations/use-admin-flag-mutations.ts` | All admin mutations.                          |
| `apps/web/app/[locale]/admin/flags/page.tsx`           | Admin dashboard page.                         |
| `docs/runbooks/feature-flag-kill-switch.md`            | On-call activation procedure.                 |
| `docs/adr/0008-feature-flag-platform.md`               | The "why" decision record.                    |

---

## When to Add a New Flag

1. Add the key to `FLAG_KEYS` in `packages/shared/src/flags/flag-keys.ts`.
2. Add its default to `FLAG_DEFAULTS` in `apps/api/src/services/flag/flag-defaults.ts`. The build fails until this is done (parity test in `flag-defaults.test.ts`).
3. (Optional) Create the row in PostHog OR via `POST /api/admin/flags`. Without this row, the evaluator returns the default — perfectly safe.
4. Gate the call-site:
   - Backend route: `requireFlagOff(FLAG_KEYS.X)` / `requireFlagOn(FLAG_KEYS.X)`.
   - Frontend UI: `<FeatureGate flag={FLAG_KEYS.X}>{...}</FeatureGate>`.
   - Anywhere else: `useFeatureFlag(FLAG_KEYS.X, { userId, fallback })`.
5. Set a `staleAt` date no further than 90 days out. The flag-hygiene cron will nag you when it elapses.

## When to Remove a Flag

1. Confirm 100% rollout has held for ≥ 1 week in production logs.
2. Inline the gated code (delete the gate, keep the gated branch).
3. `POST /api/admin/flags/:key/archive`. Wait 180 days. The cron purges the row.

---

## References

- Werner Vogels, "Everything fails, all the time" — AWS principles, 2014.
- LaunchDarkly "Flag debt" hygiene model, 2018.
- PostHog Feature Flags v1.6 docs.
- OpenFeature provider spec v0.7, January 2026.
- Uber's "experiment graveyard" cleanup playbook.
