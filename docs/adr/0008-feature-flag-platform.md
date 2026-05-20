# ADR-0008: Feature Flag Platform — Four-Layer Hybrid Architecture

**Status:** Accepted.
**Date:** May 19, 2026.
**Deciders:** CTO (Mayank Vats).
**Supersedes:** None.
**Superseded by:** None.

## Context

Datun's v2 surface area is expanding faster than its release cadence. Within the 70-day v2 sprint we already have streaming chat, photo analysis v2, multilingual locales, clinic dashboard v2, family thread, voice input, and four vendor integrations each capable of failing independently (Anthropic, OpenAI, Gemini, Razorpay, MSG91, WhatsApp Cloud). Each of these needs to ship behind a gate — for staged rollout, A/B measurement, kill-switch on vendor outage, or per-clinic enable for early adopters.

Until now, gating has lived in two places:

1. `apps/api/src/config/feature-flags.ts` — boot-time env-var booleans for six platform integrations (outbox, drift tracking, prompt versioning, data quality, shadow comparison, admin routes). These flags require an env-var change + Railway redeploy to flip. Acceptable for once-a-month rollouts; unacceptable for incident response.
2. Ad-hoc `if (process.env.X)` checks scattered across route handlers and services. Untestable, hard to discover, and impossible to flip in production without a code change.

The Phase 7 feature-flag table (`feature_flags`) exists as a Prisma schema artefact but is not wired to any read path. The seed factory builds 30 fake rows; the seed module records them as `recordsSkipped` with a `"persisted only if schema supports"` comment. The table is dead weight.

We need a feature-flag platform that:

1. Lets an admin flip any flag in production within seconds, with no deploy.
2. Survives every single dependency failing — vendor outage, Redis down, Postgres dropped, network partition.
3. Provides deterministic per-user bucketing for percentage rollouts. Same user, same flag, same answer, forever.
4. Honours per-clinic targeting (enable for clinic_id X, disable for clinic_id Y) without rebuilding the bucketing math.
5. Surfaces kill switches as a first-class architectural primitive (one decorator on a route).
6. Operates entirely from Indian-data-sovereignty infrastructure where possible (Postgres on Railway APAC; Redis on Upstash AP-south or Railway's bundled Redis).
7. Stays vendor-agnostic. Today's choice (PostHog) must be swappable in one provider file without touching the read path or the admin UI.

### Alternatives Considered

#### A. Pure PostHog (no own DB layer)

Read path goes directly to PostHog's `/decide/` endpoint every request. Browser bundles include the PostHog SDK that reads its own bootstrap payload.

- **Pro:** Smallest code surface. Admin UI already exists.
- **Con:** PostHog is the single point of failure for every request. PostHog's published SLA is 99.9% (≈8 hours downtime/year); a 30-minute outage during an incident response means we cannot disable the kill switch that is currently keeping the system from melting down. Unacceptable for a healthcare product whose own kill switches must stay reachable.
- **Con:** Every request pays a network round-trip to PostHog. At ~80ms p95 from Mumbai → US-East PostHog Cloud, this would dwarf our own request budgets.
- **Con:** Per-user evaluation logic lives behind a vendor's black box. Bucketing tweaks (e.g., "include free-tier users with phone_verified=true") require either PostHog's targeting builder (limited) or filing a vendor support ticket.

#### B. Pure DB (no PostHog)

Admin UI is our own. Flags live in `feature_flags`. No vendor dependency.

- **Pro:** Zero external SPOF.
- **Pro:** Lowest cost — no PostHog seat.
- **Con:** Admin UX is something we must build, maintain, and train ops staff on. PostHog's flag UI is a polished product with audit log, change history, and per-environment views.
- **Con:** Analytics events (funnel measurement, retention, $pageview) still want a vendor. Choosing nothing means re-implementing event capture later.
- **Con:** Misses the gravity of PostHog's experiment-design surface — A/B test setup, statistical significance reporting — that we will eventually need.

#### C. LaunchDarkly Pro

The industry incumbent.

- **Pro:** Polished UX, mature SDKs, strong audit trail.
- **Con:** Price floor is ≈$10K USD / year for the Pro tier with audit logging. At our current revenue (zero) this is unjustifiable.
- **Con:** Their published bucketing algorithm is opaque — we cannot pin a "user X always gets bucket 47" invariant across runtimes.
- **Con:** All data flows to US infrastructure. DPDP compliance review would need a re-evaluation when we add patient context fields.

#### D. Unleash (self-hosted OSS)

Open-source flag platform.

- **Pro:** Strong feature surface; flexible targeting.
- **Pro:** Self-hosted — data sovereignty trivially solved.
- **Con:** One more service to run, monitor, patch, and pay for (compute + Postgres for its own metadata). Operational overhead for a 1-engineer team.
- **Con:** Phase 7 already has a schema-level `feature_flags` table; adopting Unleash means abandoning it AND running parallel Postgres.

## Decision

Adopt a **four-layer hybrid** that uses PostHog as the admin source-of-truth and own infrastructure as the read path. Specifically:

1. **Read path: L1 → L2 → L3 → L4 cache stack.**
   - L1 in-process LRU (50K entries, 30s TTL) — sub-microsecond hot path.
   - L2 Redis (Upstash REST + Railway pub/sub fallback, 60s TTL) — cross-replica sharing.
   - L3 Postgres `feature_flags` table — authoritative cache.
   - L4 hard-coded defaults in `apps/api/src/services/flag/flag-defaults.ts` — last resort, cannot fail.
2. **Write path: admin actions land directly in Postgres** via `/api/admin/flags/*`. PostHog is **not** in the write path of admin mutations — we never wait on PostHog to acknowledge a kill switch.
3. **Mirror path: PostHog → Postgres every 60s** via a server-side sync worker. PostHog is the long-term admin UI; the mirror keeps Postgres fresh so the read path never reaches out to PostHog. When `POSTHOG_API_KEY` is unset, the worker is a no-op and the platform runs in **DB-only mode**.
4. **Propagation: Redis pub/sub** on `datun:flags:invalidate` fans out every admin mutation to every API replica's L1 in ~100ms. Worst-case convergence = L2 TTL (60s).
5. **Bucketing: FNV-1a 32-bit** over `${flagKey}:${userId|clinicId}`. Deterministic, uniform, stable across V8 versions.
6. **Kill switches: `requireFlagOff` middleware decorator** on guarded routes. Activation returns HTTP 503 with `Retry-After` per RFC 7231 §7.1.3.
7. **Hygiene: daily cron at 03:00 IST** scans for stale flags (`staleAt <= now`) and emails a digest. Archived flags older than 180 days are physically purged.
8. **Vendor seam: `OpenFeatureProvider` interface.** PostHog is one implementation; the bare `NullProvider` is another. Swapping PostHog for LaunchDarkly or Unleash later is a one-file change.

## Consequences

### Positive

- **Zero single point of failure on the read path.** Postgres + Redis + L1 + defaults all fail independently. Even with Postgres unreachable, every flag evaluates to its hard-coded default and the API keeps serving.
- **Sub-second convergence.** Redis pub/sub puts an admin toggle in front of every replica's L1 within ~100ms. The TTL is the safety net, not the steady state.
- **Cost discipline.** PostHog's free tier (1M events / month) covers Datun's traffic for the foreseeable future. Migration to a paid tier is a UI-only flip when admin user count grows.
- **DPDP compliance preserved.** Session replay is hardcoded OFF in the browser SDK. The audit table (`feature_flag_evaluations`) is sampled at 1% and contains no PHI.
- **Backwards-compatible exit.** Today's six boot-time flags (in `config/feature-flags.ts`) keep working unchanged. The new platform sits next to them. Future migration is per-flag opt-in.

### Negative

- **Complexity floor.** The four-layer stack is more code than a one-layer fetch. ~3,000 net new lines across the API + web. Justified by the failure-mode invariants; less justified if the platform stays at <10 flags forever.
- **Per-environment drift risk.** PostHog has flags in three projects (dev / staging / prod). The sync worker reads only the project keyed by `POSTHOG_PROJECT_KEY`. Configuration mismatch between environments would silently produce different runtime behaviour.
- **Audit-table volume.** At 1K req/s × 1% sampling × 86,400 s/day = 864K rows/day. Manageable today; will need partitioning by `evaluatedAt` once total exceeds ~50M rows. Acceptance criterion deferred to Phase F.
- **PostHog mirror is one-way.** Local admin edits to `targetingRules` are NOT pushed back to PostHog. The PostHog UI may therefore show stale rule data. We accept this for Day 1; bidirectional sync is a Phase G consideration when admin staff > 3 people.

### Neutral

- **Bucketing change requires a one-off migration if reverted.** FNV-1a buckets differ from PostHog's djb2 buckets, so a user in PostHog's "50%" bucket might or might not be in ours. We are the source of truth, so this is fine — but cross-tool A/B comparisons are not directly meaningful.
- **Kill switches require deliberate wiring.** A route only stops on kill switch ON if `requireFlagOff(FLAG_KEYS.X)` is on its chain. There is no implicit gating; everything is explicit. We accept the verbosity for the auditability.

## Implementation Surface

Direct-touch files (see `docs/architecture/feature-flags.md` for the full index):

- `packages/shared/src/flags/*` — registry, types, context schema.
- `packages/db/prisma/schema.prisma` — 3 models + 4 enums (Task #49 markers).
- `apps/api/src/services/flag/*` — cache layers, evaluator, bucketing, sync, pub/sub, defaults.
- `apps/api/src/middleware/{flags,kill-switch}.middleware.ts` — request-time attach + decorators.
- `apps/api/src/routes/flags.router.ts` — public `GET /api/flags`.
- `apps/api/src/routes/admin/flags.router.ts` — admin CRUD + overrides + kill switch + cache flush + sync trigger.
- `apps/api/src/crons/flag-hygiene.cron.ts` — daily stale + purge.
- `apps/web/lib/posthog/*` — browser SDK lazy wrappers.
- `apps/web/components/{providers/posthog-provider,feature-gate}.tsx` — provider + declarative gate.
- `apps/web/hooks/{queries/use-feature-flags,mutations/use-admin-flag-mutations}.ts` — TanStack Query hooks.
- `apps/web/app/[locale]/admin/flags/page.tsx` + supporting components — admin dashboard UI.

## Reversal Plan

If this architecture fails to scale, the reversal path is clear:

1. **Move to pure PostHog.** Delete the read-path cache layers. Point browser + server SDKs at PostHog directly. Cost: lose the failure-mode guarantees; gain operational simplicity.
2. **Move to LaunchDarkly.** Implement a `LaunchDarklyProvider` matching `OpenFeatureProvider`. Re-point `flagProviderRegistry`. Cost: $10K/year; gain audit log + change history.
3. **Move to pure DB.** Delete the sync worker and the PostHog SDK imports. The platform already runs in DB-only mode when `POSTHOG_API_KEY` is unset — the reversal is removing dead code.

Each path is a finite, scoped refactor — no big-bang re-architecture required. The seam at `OpenFeatureProvider` is what buys us this option.

## References

- ADR-0003 — BullMQ + Redis architecture (same pub/sub Redis instance reused here).
- `docs/architecture/feature-flags.md` — design context.
- `docs/runbooks/feature-flag-kill-switch.md` — on-call activation procedure.
- Werner Vogels, "Everything fails, all the time" — AWS principles, 2014.
- LaunchDarkly "Flag debt" cleanup playbook, 2018.
- PostHog Feature Flags v1.6 documentation.
- OpenFeature provider specification v0.7, January 2026.
