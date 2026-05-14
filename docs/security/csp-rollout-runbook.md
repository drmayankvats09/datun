# CSP Rollout Runbook

**Purpose:** Step-by-step procedure for deploying the strict Content Security Policy to production. Use this document during Phase 2 (report-only) and Phase 3 (enforce) deployments.

> **Architecture note (ADR-0005, May 14, 2026):** CSP is now nonce-only — every route receives a per-request nonce. The earlier hybrid hash/nonce model was removed. Steps below that mention "static" vs "dynamic" routes no longer apply; all routes behave identically. The `report-only` → `enforce` flip is still a single `NEXT_PUBLIC_CSP_MODE` env-var change.

**Owner:** CTO.
**Last reviewed:** May 13, 2026.

## Pre-Deployment Checklist

Before beginning Phase 2, confirm the following:

- [ ] All Phase 1 files (M1: 31 files; M2: 30 files) merged to `main`.
- [ ] `pnpm test` green on `main` for both `apps/web` and `apps/api`.
- [ ] `pnpm --filter web run build` succeeds. (Note: the hash registry was removed in ADR-0005 — CSP is nonce-only; there is no longer a hash-generation build step.)
- [ ] Migration `add_csp_violation` applied to Railway production database. Verify with:

```bash
  pnpm db:migrate:deploy
```

- [ ] Environment variable `CSP_IP_HASH_SALT` set on the API service (Railway). Generate a 32-byte random string and do not reuse this value elsewhere.
- [ ] Environment variable `NEXT_PUBLIC_CSP_MODE` set on the web service. Initial value: `report-only`.
- [ ] UptimeRobot configured to alert on a 5xx rate increase on the production homepage and `/en/consult/*` after deploy.

## Phase 2: Report-Only Deployment (Days 2–4)

### Day 2: Deploy

1. Ensure the latest `main` is at the commit that includes all CSP changes.
2. Trigger a production deploy on Vercel (web) and Railway (API).
3. Within 5 minutes of deploy, confirm the production response headers:

```bash
   curl -sI https://datunai.com/ | grep -i 'content-security-policy'
   curl -sI https://datunai.com/en/consult/test-id | grep -i 'content-security-policy'
```

Both should return `Content-Security-Policy-Report-Only` (not `Content-Security-Policy`). If `Report-Only` is missing, roll back immediately and investigate.

4. Open `/{locale}/admin/security` as the founder account. Confirm the dashboard renders without errors.
5. Verify the API endpoint accepts reports:

```bash
   curl -s -o /dev/null -w "%{http_code}\n" \
     -X POST https://api.datunai.com/api/security/csp-report \
     -H 'Content-Type: application/csp-report' \
     -d '{"csp-report":{"blocked-uri":"https://test.example.com/x.js","violated-directive":"script-src","effective-directive":"script-src","original-policy":"default-src self","disposition":"report"}}'
```

Expected: `204`.

### Days 2–4: Observation

For 72 hours, monitor the admin security dashboard and Sentry. Focus on:

1. **Critical-severity violations.** Each one is a Sentry alert. Most will be either a real attack attempt or a missed allowlist entry. Inspect the blocked URI:
   - If it is a vendor we use (Sentry, Cloudflare Insights, Vercel Analytics, Cloudinary), add the origin to `apps/web/lib/csp/allowed-origins.ts` and ship a follow-up.
   - If it is unknown, leave it in place; the `report-only` header is not blocking, so user experience is unaffected.

2. **High-volume violations from a single `ipHash`.** This usually indicates a bot or a misconfigured user. Verify the `userAgent` field.

3. **Style-src and img-src noise.** Browser extensions, ad blockers, and translation tools inject inline styles. These should be classified as low severity and not require action.

### End of Phase 2

After 72 hours of report-only deployment, do not proceed to Phase 3 until the following are true:

- [ ] No new critical-severity violations from production for at least 24 hours.
- [ ] All vendor-related violations resolved by allowlist additions.
- [ ] `pnpm test` still green on `main`.

## Phase 3: Enforce Deployment (Day 5)

### Step 1: Flip the Mode

On the Vercel web service environment variables, change:
NEXT_PUBLIC_CSP_MODE=report-only
to:
NEXT_PUBLIC_CSP_MODE=enforce
Trigger a new production deploy. The change is a single environment-variable update and does not require a code change.

### Step 2: Immediate Verification

Within 5 minutes of deploy:

```bash
curl -sI https://datunai.com/ | grep -i 'content-security-policy'
```

Expected: `Content-Security-Policy: ...` (not `-Report-Only`).

### Step 3: Grade Verification

Run an external scan:

- securityheaders.com: `https://securityheaders.com/?q=https%3A%2F%2Fdatunai.com&followRedirects=on`
- Mozilla Observatory: `https://observatory.mozilla.org/analyze/datunai.com`

Both should return **Grade A or A+**.

### Step 4: 30-Minute Monitor

Watch the admin dashboard and Sentry for 30 minutes. If a real user encounters a CSP block (visible as an increase in 5xx-equivalent client-side errors via Sentry), proceed to rollback.

## Rollback Procedure

If at any point during Phase 3 a real user impact is detected:

1. On Vercel, revert `NEXT_PUBLIC_CSP_MODE` to `report-only`.
2. Trigger redeploy.
3. Confirm within 5 minutes that the header is back to `Content-Security-Policy-Report-Only`.
4. Investigate the cause via the admin dashboard. Resolve. Restart Phase 3 once fixed.

A code rollback is **not required** for CSP misconfiguration. The mode flag is sufficient.

## Post-Deployment

After 7 days of stable enforce-mode operation:

- [ ] Submit `datunai.com` to the HSTS preload list at https://hstspreload.org/.
- [ ] Schedule a quarterly review of `allowed-origins.ts` to remove unused entries.
- [ ] Update `docs/adr/0005-csp-nonce-only.md` with the deployment date and any lessons learned.
