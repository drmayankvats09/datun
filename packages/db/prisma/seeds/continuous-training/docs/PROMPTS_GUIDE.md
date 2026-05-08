# Prompts Guide — Datun Prompt Versioning + Rollout

How to safely change a Claude system prompt without breaking production.

## Why versioning matters

A 10-character change to the system prompt can change Claude's behaviour across millions of consultations. Without versioning + staged rollout:

- No before/after diff for incident review
- No way to A/B test the change
- Rollback requires git revert + redeploy (5-15 min outage window)
- No audit trail of "who changed the prompt and why"

The PromptVersion + PromptRolloutPlan tables solve all four. Every prompt update follows the same lifecycle: **draft → activate → rollout (5% → 25% → 50% → 100%) → measure → rollback if needed**.

## Lifecycle states

| Status     | Meaning                                                               |
| ---------- | --------------------------------------------------------------------- |
| `draft`    | Created but not active. Visible only to admins.                       |
| `active`   | Currently serving traffic per rollout plan. At most ONE per `key`.    |
| `archived` | Was active, replaced by newer version. Retained for audit + rollback. |

## Workflow: "I want to change the consultation prompt"

### 1. Create a draft

```bash
echo "$(cat new-prompt.txt)" | pnpm prompt:create -- consultation-system \
  --stdin \
  --description "Add 'never recommend prescription painkillers' clause" \
  --created-by mayank
# → Created draft: cm5xxx (v8)
```

### 2. Activate (replaces current active version)

```bash
pnpm prompt:activate -- cm5xxx --activated-by mayank
# → Activated cm5xxx (v8) — previous active versions archived
```

The activation does NOT immediately serve all traffic — it only registers the version as the candidate. Traffic routing follows the rollout plan.

### 3. Define rollout plan

```bash
pnpm prompt:rollout-plan -- cm5xxx \
  --stages 5,25,50,100 \
  --hours-per-stage 6
# → Rollout plan: stages=[5 → 25 → 50 → 100]%, 6h between stages
```

This means: at hour 0, 5 % of traffic gets v8. At hour 6, if guardrails are green, advance to 25 %. And so on. Total rollout duration ≈ 24 h.

### 4. Advance through stages (automated by worker)

The drift-orchestrator + guardrail-check runs every hour. The rollout-advance subcommand checks:

- Drift: no critical drift on `consultation-system` traffic in last 6 h
- Guardrails: no critical violations from v8 traffic
- Latency: p95 within 25 % of baseline

If all green, advance:

```bash
pnpm prompt:rollout-advance -- cm5xxx
# → ROLLOUT DECISION for cm5xxx
#   action: advanced
#   reason: All guardrails green, drift OK, latency p95 within tolerance
#   new stage: 25%
```

If any check fails, the orchestrator either holds at current stage OR auto-rolls-back to the previous active version (configurable via `autoRollbackOnCritical`).

### 5. Measurement during rollout

While rollout is in progress, every Claude call records `promptVersionId` in `consultation_message`. This enables:

```sql
-- Per-version completion rate during rollout
SELECT prompt_version_id, COUNT(*) AS total,
       AVG(CASE WHEN urgency_correct THEN 1 ELSE 0 END) AS accuracy
FROM consultation_message
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY prompt_version_id;
```

### 6. Emergency rollback

If a regression is detected mid-rollout:

```bash
pnpm prompt:rollback -- cm5xxx \
  --rolled-back-by mayank \
  --reason "v8 caused 8% drop in correct urgency classification (saw at stage=25%)"
# → 🔴 Rolled back cm5xxx. Previous active version restored.
#    Reviewer must add post-mortem within 24h.
```

Rollback is instant — the previous archived version is re-activated, no deploy required.

## What goes IN the prompt vs config

**In the prompt:** clinical reasoning instructions, safety constraints, persona, locale handling, output format.

**Out of the prompt:** model name, max tokens, temperature, tools list, API keys. These live in `apps/api/src/services/ai/claude.config.ts` and are managed via env vars.

Reason: prompt content needs version control + diff + rollback. Config values need fast restart, not gradual rollout.

## Naming conventions

Prompt keys are `kebab-case`, scoped by surface area:

- `consultation-system` — main consultation system prompt
- `triage-followup-3day` — WhatsApp 3-day followup template generation
- `triage-followup-7day` — 7-day followup
- `summary-pdf-generator` — PDF report summary
- `admin-labeling-instructions` — for /admin/label-data UI

## Anti-patterns

- ❌ Editing prompts directly in code (`apps/api/src/prompts/*.ts`) without DB version
- ❌ Activating with no rollout plan (= 100 % traffic immediately)
- ❌ Skipping the post-mortem after rollback
- ❌ Leaving multiple drafts for the same key without resolution

## Future (Task #170+)

When the model registry lands, prompt versions will be tied to specific Claude model versions:
PromptVersion(key=consultation-system, version=8) → ModelRegistry(claude-sonnet-4-20250514)
This enables full reproducibility: "show me exactly what AI we ran on August 1st 2026 for consultation X" — query joins reproduce the exact (prompt, model) pair.
