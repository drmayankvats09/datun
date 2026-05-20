# Runbook: Feature Flag Kill Switch Activation

**Audience:** On-call engineer.
**Estimated time to triage:** 5–15 minutes.
**Last reviewed:** May 19, 2026.
**Task:** #49.

## Symptom

One or more of the following is true:

- A Sentry alert tied to a downstream dependency has fired (AI provider 5xx surge, Razorpay outage, MSG91 spike, WhatsApp Cloud API 429).
- A Better Stack log query shows a sustained error rate above the 7-day rolling average for a specific user-facing flow.
- A user-reported "service down" wave on the support channel correlates with one functional area (e.g., chat, payments, signup, photo upload).
- A scheduled vendor maintenance window has begun and the affected feature must stop attempting traffic.

Kill switches let on-call halt one flow without code deploy. The other flows keep serving.

## Severity Assessment

Use the table below to assign severity.

| Indicator                                                                                                       | Severity  | Action Window                                                |
| --------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------ |
| Active patient-safety risk (clinical content corrupted, wrong dosage being delivered, emergency triage failing) | **SEV-1** | Activate kill switch within 5 minutes. Page CTO.             |
| External vendor confirmed outage, our retry storm worsening their recovery                                      | **SEV-2** | Activate kill switch within 15 minutes.                      |
| Elevated error rate without confirmed user impact (early canary signal)                                         | **SEV-3** | Investigate first; activation only if user impact confirmed. |
| Single user / single endpoint affected                                                                          | **SEV-4** | No kill switch. Use a per-entity override instead.           |

## Known Kill Switches

| Flag key                       | Surface affected when ON                                                                                                                         | Restore SLA |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `killswitch.ai-providers`      | `/api/chat/*` and consultation message generation — Claude, GPT, Gemini fallback chain all skipped. Users see "service temporarily unavailable". | ≤30 min     |
| `killswitch.payments`          | Subscription checkout + auto-renewal. Existing access remains.                                                                                   | ≤60 min     |
| `killswitch.whatsapp-outbound` | WhatsApp template sends + 3-day / 7-day follow-up crons.                                                                                         | ≤30 min     |
| `killswitch.media-upload`      | Photo upload presigned URLs.                                                                                                                     | ≤30 min     |
| `killswitch.signup`            | New account creation (email / OTP / Google).                                                                                                     | ≤120 min    |

The flag-platform itself has a global kill: env var `FEATURE_FLAGS_ENABLED=false`. Use this only when the platform itself is the suspect (every evaluation falling back to defaults is preferable to a poisoned cache). Otherwise, prefer the per-flag switches below.

## Activation Procedure

### Step 1: Identify the right kill switch

Match the failing surface to the table above. When in doubt, **activate the narrower switch first**. Killing `whatsapp-outbound` is reversible in seconds; killing `signup` blocks revenue.

### Step 2: Activate via the admin API

Open the admin UI at `https://datunai.com/{locale}/admin/flags`, find the flag, click **Kill**. Enter a reason in the prompt; include the incident ID when one exists (`INC-YYYY-MM-DD-NNN`).

If the admin UI is unreachable (and only then), use `curl` directly:

```bash
curl -X POST \
  -H "Authorization: Bearer <admin_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Anthropic 5xx surge at 14:32 IST — INC-2026-05-19-003","incidentId":"INC-2026-05-19-003"}' \
  https://api.datunai.com/api/admin/flags/killswitch.ai-providers/kill
```

The endpoint returns 200 with the updated DTO. Confirm `status: "ON"` and `category: "KILL_SWITCH"`.

### Step 3: Verify convergence

Open Better Stack and tail `[admin-flags] KILL SWITCH ACTIVATED` log lines. Expect one entry per API replica within ~1 second (Redis pub/sub fan-out). If you only see one replica logging the activation, the pub/sub channel is degraded — fall back to a deploy-time restart (see Step 6 below).

Confirm user-facing impact:

```bash
# Pick any endpoint guarded by the kill switch.
curl -i https://api.datunai.com/api/chat/stream
# Expect: HTTP/1.1 503 with `Retry-After: 60` and JSON body
#   { "success": false, "error": { "code": "KILL_SWITCH_ACTIVE", "message": "..." } }
```

### Step 4: Communicate

- Patient-facing flow: post a notice via the support channel + Twitter / X.
- Clinic dashboard flow: send the `internal_alert` WhatsApp template to the founder line (`+91 9953 135 340`).
- Always update the Sentry incident with the activation timestamp + reason. Future post-mortems read these timestamps.

### Step 5: Investigate

The kill switch is bought time, not a fix. Use this window to:

1. Open the vendor status page (Anthropic, Razorpay, MSG91, Meta).
2. Read the last 30 minutes of error logs filtered by the failing dependency.
3. Inspect recent deploys (`git log --since='6 hours ago' apps/api apps/web`) for unintentional vendor coupling.

## Restoration Procedure

### Step 1: Confirm the underlying issue is resolved

- Vendor status page reports green.
- Synthetic test against the dependency from a worker replica passes.
- Recent Sentry breadcrumbs for the dependency are quiet for at least 10 minutes.

### Step 2: Deactivate the kill switch

Admin UI: open the flag row, click **Restore**. Confirm the prompt.

`curl` equivalent:

```bash
curl -X POST \
  -H "Authorization: Bearer <admin_jwt>" \
  https://api.datunai.com/api/admin/flags/killswitch.ai-providers/restore
```

Endpoint returns 200 with `status: "OFF"`. The pub/sub broadcast wipes L1 across every replica within ~1 second.

### Step 3: Verify recovery

```bash
curl -i https://api.datunai.com/api/chat/stream
# Expect: HTTP/1.1 200 (or whatever the endpoint's normal response is)
```

Watch error rate in Better Stack for 5 minutes. If errors immediately return, re-activate the kill switch and continue investigating — the underlying issue is not yet fixed.

### Step 4: Post-incident artefacts

1. Record activation + restoration timestamps in the post-mortem doc.
2. Add the affected dependency to `docs/security/csp-third-party-vendors.md` if it was newly introduced.
3. If the kill switch held during the incident: leave the flag row as-is. If it did NOT (because the gating was incomplete), file an issue to widen the gate.

## Failure Modes of the Kill Switch Itself

| Failure                                                            | Symptom                                           | Mitigation                                                                                                                                                                            |
| ------------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin UI unreachable                                               | Can't click Kill                                  | Use `curl` (Step 2).                                                                                                                                                                  |
| Admin API replica unhealthy                                        | `curl` returns 5xx                                | Re-issue against another replica (Railway shows IPs).                                                                                                                                 |
| Redis pub/sub channel down                                         | Activation logged on one replica only             | L2 TTL (60s) still propagates — wait one minute.                                                                                                                                      |
| Postgres write fails                                               | Admin API returns 500                             | Toggle the env var `FEATURE_FLAGS_ENABLED=false` on Railway → redeploy → every flag returns its default, including the kill switch flag's `false` default. Use as a last-resort only. |
| Kill switch was not gating the failing endpoint in the first place | `curl` to endpoint still returns the upstream 5xx | File an issue to wrap the endpoint in `requireFlagOff`. The kill switch only stops what it has been wired to stop.                                                                    |

## Anti-Patterns — Things NOT To Do

- Do not use a kill switch to roll back a code deploy. Roll back the deploy. Kill switches are for vendor outages, not own-code regressions.
- Do not leave a kill switch in the ON state overnight without escalation. The longer the kill is on, the bigger the blast radius of "we've quietly stopped serving a feature" customer-facing posts become.
- Do not activate multiple kill switches at once unless explicitly required. Each activation widens the user-facing blast radius — narrower is better.
- Do not edit a kill-switch row's `targetingRules` or `rolloutPercent` from the admin UI during an incident. The Kill button changes only `status` and `category`. Editing other fields invites correctness bugs in the middle of a fire.

## Related Files

- `apps/api/src/middleware/kill-switch.middleware.ts` — the `requireFlagOff` decorator.
- `apps/api/src/routes/admin/flags.router.ts` — the kill / restore endpoints.
- `docs/architecture/feature-flags.md` — design context.
- `docs/adr/0008-feature-flag-platform.md` — the "why" decision record.
