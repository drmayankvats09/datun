# Runbook: CSP Violation Spike

**Audience:** On-call engineer.
**Estimated time to triage:** 15–30 minutes.
**Last reviewed:** May 13, 2026.

## Symptom

One or more of the following is true:

- A Sentry alert titled "[CSP CRITICAL]" has fired.
- Better Stack reports an unusual rate of `POST /api/security/csp-report` requests (more than ten times the baseline).
- The admin security dashboard at `/{locale}/admin/security` shows a "critical today" count significantly above the 7-day rolling average.

## Severity Assessment

Use the table below to assign severity.

| Indicator                                                                                                                    | Severity  | Action Window                              |
| ---------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------ |
| Sustained critical-severity violations from many distinct `ipHash` values, blocking unknown external script                  | **SEV-1** | Begin investigation immediately. Page CTO. |
| Single user impacted; violations confined to one `ipHash`                                                                    | **SEV-3** | Investigate within 24 hours.               |
| Critical-severity violations whose blocked URI is a known vendor not yet allowlisted                                         | **SEV-2** | Add allowlist entry within 4 hours.        |
| Style or image source violations, or violations whose `blocked-uri` is `chrome-extension://`, `moz-extension://`, or similar | **SEV-4** | No action. Filter is working as designed.  |

## Triage Decision Tree

### Step 1: Identify the blocked URI

Open the admin dashboard at `/{locale}/admin/security`. Sort by severity (critical first). Click the most recent critical violation.

Note the `blockedUri`, `effectiveDirective`, and `documentUri`.

### Step 2: Determine the source

- **If `blockedUri` matches a known vendor in `docs/security/csp-third-party-vendors.md`:** This is a missing allowlist entry. Skip to Step 4.
- **If `blockedUri` is a `chrome-extension://`, `moz-extension://`, `safari-extension://`, or similar URI:** This is a user's browser extension. The integration filter in `apps/web/lib/csp/sentry-integration.ts` is expected to drop these from Sentry. If a critical alert fired anyway, file a bug against the filter regex; no production action needed.
- **If `blockedUri` is an unfamiliar third-party domain:** Treat as potential attack until proven otherwise. Proceed to Step 3.

### Step 3: Investigate potential attack

1. Search the `csp_violations` table for the same `blockedUri` across the last 30 days:

```sql
   SELECT
     COUNT(*) AS hits,
     COUNT(DISTINCT "ipHash") AS unique_sources,
     MIN("createdAt") AS first_seen
   FROM csp_violations
   WHERE "blockedUri" = '<the URI>';
```

2. If `unique_sources` is greater than 50 or `first_seen` is within the last hour, treat as an active attack:
   - Page the CTO.
   - Inspect the `documentUri` to identify which pages serve the malicious payload.
   - Check recent deployments (`git log --since='6 hours ago' apps/web`) for any third-party script additions.

3. If the violation appears isolated, document the URI in this runbook's "Known Benign URIs" section below and proceed.

### Step 4: Add the missing allowlist entry

1. Edit `apps/web/lib/csp/allowed-origins.ts` and add the origin under the appropriate category.
2. Run `pnpm --filter web test apps/web/__tests__/lib/csp` to confirm invariants still hold.
3. Open a PR with the title `chore(csp): allowlist <vendor> <directive>`. Reference this runbook in the description.
4. Merge and deploy. Confirm the violation count drops within 30 minutes.

### Step 5: Confirm resolution

After the fix is deployed, watch the admin dashboard for 60 minutes. If the violation count for that blocked URI has dropped to zero, the incident is closed. Update the on-call log.

## Known Benign URIs

Add entries here as they are confirmed harmless. Empty as of this writing.

## Escalation

- **First responder:** On-call engineer.
- **Escalation tier 1:** CTO (Mayank Vats).
- **External:** If a confirmed attack involves stolen credentials or breached data, follow the DPDP breach-notification procedure in `docs/dpdp/breach-notification-sop.md` (out of scope for this runbook).
