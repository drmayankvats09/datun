# Runbook: Training Pipeline Emergency

When the training data pipeline misbehaves — capture, judge, queue, consent, or export.

**Audience:** On-call engineer (currently solo: Mayank Vats).
**SLA targets:** Initial response 15 min; mitigation within 4 hours; root cause documented within 24 hours.

---

## Quick triage decision tree

Symptom → Section
─────────────────────────────────────────────────
"Judge cron failing" → §1
"Redaction property test red in CI" → §2
"Patient DPDP withdrawal received" → §3
"Consent version updated, backfill?" → §4
"PII leak detected in redactedContent" → §5 (CRITICAL — page Mayank immediately)
"Judge cost spiking past ₹100/day" → §6
"Capture writes failing silently" → §7
"Active learning queue empty" → §8

---

## §1. Judge cron failing

**Symptom:** Daily 04:00 IST `judge-grading-daily` job not producing `JudgeRun` rows. `/admin/labeling/stats` shows zero recent judge agreement signal.

**Step 1 — Confirm cron is firing:**

```powershell
# Check worker logs for the daily run
curl -u $env:BULL_BOARD_USER:$env:BULL_BOARD_PASSWORD `
  "https://api.datunai.com/admin/queues/queue/judge-grading/active"
# Look for jobs with name "judge-grading-daily"

# Or check BullMQ dashboard: https://api.datunai.com/admin/queues/queue/judge-grading
```

**Step 2 — Check feature flag:**

```powershell
# In Railway env, verify JUDGE_GRADING_ENABLED is not set to "false"
railway variables --service worker | Select-String "JUDGE_GRADING_ENABLED"
```

If `JUDGE_GRADING_ENABLED=false`, this is intentional. Reset to `true` only after confirming budget allows.

**Step 3 — Check Anthropic API health:**

```powershell
curl -s "https://status.anthropic.com/api/v2/status.json" | ConvertFrom-Json
```

**Step 4 — Inspect last failed run:**

```sql
SELECT id, status, "errorMessage", "startedAt", "completedAt"
FROM judge_runs
WHERE status = 'FAILED'
ORDER BY "startedAt" DESC
LIMIT 10;
```

**Step 5 — Manual retry:**

```powershell
# Trigger a single test grade via admin endpoint
curl -X POST "https://api.datunai.com/api/admin/labeling/judge/grade" `
  -H "Authorization: Bearer $ADMIN_JWT" `
  -H "Content-Type: application/json" `
  -d '{"messageId":"<recent-assistant-message-uuid>","force":true}'
```

**Escalation:** If 5 retries fail with consistent error, set `JUDGE_GRADING_ENABLED=false` (stop bleeding cost), file Sentry issue, resume after fix.

---

## §2. Redaction property test red in CI

**Symptom:** GitHub Action `training-data-fuzz.yml` blocked the PR. Property test claims a PII leak under specific fuzz seed.

**Step 1 — Reproduce locally with exact seed:**

```powershell
# Seed is logged in failing test output as: "seed: <number>"
cd packages\db
pnpm vitest run src/__tests__/training/redaction.test.ts --reporter=verbose
```

**Step 2 — Identify the failing case:**
The fast-check failure output prints the shrunk minimal failing input. Copy that exact string.

**Step 3 — Two paths:**

**Path A (redaction has a real gap):**

1. Add a regression test case to `redaction.test.ts` Section 4 (hand-crafted cases) with the failing input
2. Update `SUBSTRING_PATTERNS` in `redaction.ts` to handle this case
3. Bump `REDACTION_VERSION` (v1.0.0 → v1.0.1)
4. Re-run property suite locally with `--numRuns 5000` to confirm robust fix
5. PR with the new test + redaction + version bump

**Path B (test was over-aggressive, false positive):**

1. Verify the "leak" is actually a leak by manually inspecting the redacted output
2. If genuinely not a leak (e.g., the string happens to look like a phone number but is part of a longer numeric ID), refine the pattern's `minLength` or add a negative lookahead
3. Document the false-positive case in test comments

**Never** disable a property test to merge a PR. Either fix the redaction or fix the test.

---

## §3. Patient DPDP withdrawal received

**Symptom:** Email to `privacy@datunai.com` requesting withdrawal of `DATA_TRAINING` consent.

**Step 1 — Verify identity:**

- Withdrawal must come from the **registered account email**
- If not from registered email, reply asking for verification token sent to registered email
- Confirm within 24 hours

**Step 2 — Find user record:**

```sql
SELECT id, email, "createdAt"
FROM users
WHERE email = '<patient_email>';
-- Note the user UUID
```

**Step 3 — Find all consultations:**

```sql
SELECT id, "dataTrainingConsentAt", "dataTrainingConsentVersion"
FROM consultations
WHERE "patientId" IN (
  SELECT id FROM patients WHERE "userId" = '<user_uuid>'
)
AND "dataTrainingConsentAt" IS NOT NULL;
```

**Step 4 — Execute withdrawal (within 24h SLA):**

```sql
BEGIN;

-- 4a. Insert ConsentLog row recording the withdrawal
INSERT INTO consent_logs (
  id, "userId", purpose, status, "grantedAt", "revokedAt",
  "revocationReason", "createdAt"
) VALUES (
  gen_random_uuid()::text,
  '<user_uuid>',
  'DATA_TRAINING',
  'REVOKED',
  -- pull grantedAt from existing consent row
  (SELECT "grantedAt" FROM consent_logs
   WHERE "userId" = '<user_uuid>' AND purpose = 'DATA_TRAINING'
   ORDER BY "grantedAt" DESC LIMIT 1),
  NOW(),
  'PATIENT_REQUEST_EMAIL',
  NOW()
);

-- 4b. Null out consent timestamps so eligibility gate excludes future use
UPDATE consultations
SET "dataTrainingConsentAt" = NULL
WHERE "patientId" IN (
  SELECT id FROM patients WHERE "userId" = '<user_uuid>'
);

-- 4c. Mark any already-exported records for exclusion in next training cycle
UPDATE consultation_messages
SET "exportBatchId" = '__REVOKED__'
WHERE "consultationId" IN (
  SELECT id FROM consultations
  WHERE "patientId" IN (
    SELECT id FROM patients WHERE "userId" = '<user_uuid>'
  )
)
AND "exportedToTrainingAt" IS NOT NULL;

COMMIT;
```

**Step 5 — Confirm via email reply:**
Send confirmation to patient: "Your withdrawal has been processed. Effective immediately, none of your data will be used in future AI training. Past training cycles that already incorporated your data cannot be reversed but no future cycle will include your contribution."

**Step 6 — Log in DPDP register:**
Append entry to `docs/dpdp/withdrawal-register.md` (create if not exists): `<date> | <user_uuid> | DATA_TRAINING | processed via SQL`.

---

## §4. Consent version updated — backfill procedure

**Symptom:** Consent text materially changed, `CONSENT_CURRENT_VERSION` bumped from `v1.0.0` to `v1.1.0`.

**Step 1 — Do NOT auto-update existing consents.**
Patients consented to v1.0.0. Their grant remains valid against v1.0.0. The bump applies to **future grants only**.

**Step 2 — Re-issue notice to existing consented users (DPDP Rule 3):**

- If change is MAJOR (scope expansion): email all currently-consented users with the new notice; require fresh opt-in for new scope
- If change is MINOR (clarification, no scope expansion): email notification only, no re-consent required
- If change is PATCH (typo fix): no notification needed

**Step 3 — Document the bump:**

- Update `CONSENT_VERSION_HISTORY` in `consent-copy.ts`
- Update DPIA Section 4.3 revision history
- Update `CHANGELOG.md`

---

## §5. CRITICAL — PII leak detected in production `redactedContent`

**Symptom:** Manual query or external report finds raw PII (phone, email, etc.) in `consultation_messages.redactedContent` JSONB.

**SEVERITY: CRITICAL. Page Mayank immediately if found by anyone other than Mayank.**

**Step 1 — Stop the bleed:**

```powershell
# Disable judge cron to prevent the leaked PII from propagating into JudgeRun records
railway variables set JUDGE_GRADING_ENABLED=false --service worker

# If export pipeline is live (Month 6+), pause it as well
railway variables set EXPORT_PIPELINE_ENABLED=false --service worker
```

**Step 2 — Quantify scope:**

```sql
-- Find all rows where redactedContent might contain raw PII
SELECT COUNT(*) FROM consultation_messages
WHERE "redactedContent" IS NOT NULL
AND ("redactedContent"->>'text' ~ '\+?91[6-9]\d{9}'
  OR "redactedContent"->>'text' ~ '[A-Za-z0-9]+@[A-Za-z0-9]+\.[A-Za-z]+'
  OR "redactedContent"->>'text' ~ '[2-9]\d{3}[-\s]?\d{4}[-\s]?\d{4}');
```

**Step 3 — Re-redact affected rows:**

```powershell
# Run a one-off batch re-redaction script (Phase 5 deferred — write inline if needed)
cd apps\api
pnpm tsx scripts/re-redact-leaked-rows.ts --dry-run
# Inspect output, then:
pnpm tsx scripts/re-redact-leaked-rows.ts --apply
```

**Step 4 — Notify Data Principals (DPDP §8 — 72h breach window):**

- If leak was contained internally (no external party saw it): document but no patient notification required
- If leak reached external party (Anthropic API, log aggregator, etc.): notify affected patients within 72 hours via registered email
- Notify Data Protection Board if scope > 1000 records

**Step 5 — Root cause + permanent fix:**

- Add a regression test case to `redaction.test.ts`
- Bump `REDACTION_VERSION`
- File post-incident review document at `docs/postmortems/<date>-pii-leak.md`

---

## §6. Judge cost spiking past ₹100/day

**Symptom:** Anthropic billing dashboard shows judge spend > ₹100/day (3× normal).

**Step 1 — Identify cause:**

```sql
SELECT DATE("startedAt") AS day,
       COUNT(*) AS runs,
       SUM("costUsd") AS total_usd,
       AVG("inputTokens") AS avg_input,
       AVG("outputTokens") AS avg_output
FROM judge_runs
WHERE "startedAt" > NOW() - INTERVAL '7 days'
GROUP BY DATE("startedAt")
ORDER BY day DESC;
```

**Common causes:**

- Spike in consultations → more candidates per run → cost ceiling already enforces $1/run cap; this is by design
- Bug in worker: same messages graded multiple times → check idempotency cache logic in `judge.service.ts`
- Anthropic pricing changed → update `HAIKU_PRICING` constants in `judge.service.ts`

**Step 2 — Apply temporary throttle:**

```powershell
# Lower max messages per run
railway variables set JUDGE_MAX_MESSAGES_PER_RUN=50 --service worker
# Or lower cost ceiling
railway variables set JUDGE_MAX_COST_USD_PER_RUN=0.50 --service worker
```

**Step 3 — File issue:** Track in GitHub issue; review weekly.

---

## §7. Capture writes failing silently

**Symptom:** Patient sees AI response in `/chat`, but `consultation_messages` row count not increasing.

**Step 1 — Search Sentry for capture errors:**
Filter: `[Capture]` prefix + last 1 hour.

**Step 2 — Check audit log:**

```sql
SELECT * FROM audit_logs
WHERE model = 'ConsultationMessage'
AND "createdAt" > NOW() - INTERVAL '15 minutes'
ORDER BY "createdAt" DESC LIMIT 20;
```

**Step 3 — Check if transaction is failing on serializable conflict:**

```sql
SELECT * FROM pg_stat_database
WHERE datname = current_database();
-- Look at xact_rollback count rising
```

If serializable isolation conflicts are spiking, transaction retry may be needed. Open a follow-up issue with stack trace.

---

## §8. Active learning queue empty

**Symptom:** `/admin/labeling/queue` returns empty for all strategies; Mayank can't label.

**Step 1 — Check consent gate impact:**

```sql
-- How many consultations are completed AND consented?
SELECT COUNT(*) FROM consultations
WHERE status = 'COMPLETED'
AND "dataTrainingConsentAt" IS NOT NULL;
```

If this is zero or very low: queue is correctly empty (no eligible data). Patient consent rates may need product attention.

**Step 2 — Check judge graded messages exist:**

```sql
SELECT COUNT(*) FROM consultation_messages
WHERE role IN ('ASSISTANT', 'AI')
AND "judgeScore" IS NOT NULL;
```

If zero: judge cron hasn't run successfully. See §1.

**Step 3 — Check for already-labeled exhaustion:**

```sql
SELECT COUNT(*) FROM consultation_messages cm
WHERE cm.role IN ('ASSISTANT', 'AI')
AND cm."judgeScore" IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM training_labels tl
  WHERE tl."messageId" = cm.id AND tl."labeledById" = '<mayank_user_uuid>'
);
```

If zero, Mayank has labeled every eligible message — wait for more consultations or change strategy.

---

## Escalation contacts

| Severity                        | Contact                      | SLA               |
| ------------------------------- | ---------------------------- | ----------------- |
| CRITICAL (PII leak, prod down)  | Mayank — +91 99531 35340     | Page immediately  |
| HIGH (job failures, cost spike) | Sentry alerts → Mayank email | 4 hours           |
| MEDIUM (cron skip, queue empty) | GitHub issue tracker         | Next business day |

---

## Post-incident template

Every incident produces a postmortem at `docs/postmortems/<YYYY-MM-DD>-<short-title>.md`:

Postmortem — <title>
Date: YYYY-MM-DD
Severity: CRITICAL | HIGH | MEDIUM
Detection: <how was it detected>
Detection-to-mitigation time: <minutes>
Affected users: <count>
Root cause: <one sentence>
What went well: <list>
What went badly: <list>
Action items: <list with owners + deadlines>
