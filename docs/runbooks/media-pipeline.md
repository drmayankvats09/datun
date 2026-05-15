# Runbook: Media Pipeline Operations

**Audience:** On-call engineer.
**Estimated time to triage:** 10–30 minutes per incident.
**Last reviewed:** 2026-05-15.

## Symptoms covered

This runbook handles three categories of incidents:

1. **Upload failures** — patients report photos won't upload.
2. **Processing stuck** — `MediaAsset.status` rows stuck in `UPLOADED` or `PROCESSING`.
3. **Moderation backlog** — `MediaModerationStatus = FLAGGED` rows accumulating.

## Pre-flight diagnostic

Always start here before diving into specific scenarios.

```bash
# From an API container shell (Railway dashboard → API service → "Open shell")
psql $DATABASE_URL <<'SQL'
SELECT
  status,
  count(*) as count,
  count(*) FILTER (WHERE created_at < now() - interval '1 hour') as older_than_1h,
  count(*) FILTER (WHERE created_at < now() - interval '24 hour') as older_than_24h
FROM media_assets
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY count DESC;
SQL
```

Expected healthy distribution:

- `READY`: ~95% of recent rows.
- `INITIATED`: a small ongoing trickle (last few minutes).
- `UPLOADED`: very few (worker latency window, <60s).
- `PROCESSING`: very few.
- `FAILED` + `REJECTED`: <2% combined.

If any non-`READY` count > 5% AND has rows older than 1 hour, an incident is ongoing.

---

## Scenario 1: Upload failures (4xx/5xx from `/api/media/upload-intent`)

### Likely causes

1. R2 credentials rotated / lapsed.
2. Cloudflare Images token revoked.
3. ConsentLog references rejected (DPDP cascade in flight).
4. Per-entity limit reached (legitimate user behaviour, not an incident).

### Triage

Check API logs for the failing endpoint:

```bash
# Better Stack query
service:api AND path:"/api/media/upload-intent" AND statusCode:>=400
```

Common error codes:

| `error.code`                                     | Meaning                                                | Action                                                                           |
| ------------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `MEDIA_ENTITY_LIMIT_REACHED`                     | User hit per-entity cap (e.g., 5 consultation photos). | No action — expected behaviour.                                                  |
| `VALIDATION_ERROR`                               | Oversized request, bad MIME.                           | Inspect details; if a pattern, possible buggy client release — page web on-call. |
| `EXTERNAL_SERVICE_ERROR` with service: `Storage` | R2 sign-URL minting failed.                            | See Scenario 1A below.                                                           |
| `FORBIDDEN` with details mentioning consent      | Consent rejected or wrong user.                        | No action — DPDP path working.                                                   |

### Scenario 1A: R2 sign failures

```bash
# Check the R2 dashboard for token expiry
# https://dash.cloudflare.com/<account>/r2/api-tokens

# If the token is valid, test a curl against R2 directly from the API container:
aws s3 ls s3://datun-media-prod-private --endpoint-url=https://<account>.r2.cloudflarestorage.com
# Should list the bucket. If 403, regenerate the token.
```

If credentials are bad:

1. Generate a new R2 API token in the Cloudflare dashboard.
2. Update `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` in Railway env vars (API + worker).
3. Redeploy API + worker.
4. Verify with a fresh upload-intent call via `curl`.

---

## Scenario 2: Processing stuck (rows in `UPLOADED` or `PROCESSING` > 1h)

### Likely causes

1. Worker container unhealthy or not running.
2. BullMQ `media-processing` queue paused.
3. Sharp native binary missing (worker can't process images).
4. Cloudflare Images REST endpoint failing.

### Triage

```bash
# 1. Is the worker running?
curl -s https://worker.datunai.com/healthz
# Expected: 200 OK with JSON

# 2. Queue health
# Access bull-board at https://api.datunai.com/admin/queues
# (basic auth — see 1Password "Datun Admin")
# Look at media-processing queue: active count, failed count, paused state.
```

### If worker is up but jobs are failing

Pull the most recent failed job:

```bash
psql $DATABASE_URL <<'SQL'
SELECT id, status, processing_error, created_at, processed_at
FROM media_assets
WHERE status = 'FAILED'
  AND processed_at > now() - interval '24 hour'
ORDER BY processed_at DESC
LIMIT 10;
SQL
```

Common `processing_error` patterns:

| Error contains                    | Cause                                                                                 | Fix                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `R2 object not found`             | Client confirmed upload but R2 has no object — race or signed URL expired before PUT. | Soft-delete the row; user re-uploads. No code change.           |
| `Image decode failed`             | Bytes are corrupt or unsupported format that bypassed magic-byte check.               | Investigate the file — usually a malicious upload. Soft-delete. |
| `Cloudflare Images upload failed` | CF Images token revoked, rate limit, or service incident.                             | Check status.cloudflare.com. Rotate token if revoked.           |
| `JPEG re-encode failed`           | Sharp native binary issue.                                                            | Redeploy worker — usually fixes after a clean install.          |

### If the queue is paused

Resume from bull-board UI OR via Redis:

```bash
redis-cli -u $QUEUE_REDIS_URL
> BRPOPLPUSH datun:production:bullmq:media-processing:paused datun:production:bullmq:media-processing:wait 0
> QUIT
```

### Force-retry a single asset

```bash
psql $DATABASE_URL <<'SQL'
UPDATE media_assets
SET status = 'UPLOADED', processed_at = NULL, processing_error = NULL
WHERE id = '<MEDIA_ID>';
SQL
```

Then publish a fresh BullMQ job (use admin script `apps/api/src/scripts/requeue-media.ts` — to be added under Task #57).

---

## Scenario 3: Moderation backlog

### Likely causes

1. Surge of off-topic uploads (e.g., a user testing the system, or a marketing campaign attracting non-dental traffic).
2. Anthropic Vision rate limit or outage.
3. Moderation prompt regression (recent deploy increased false-`FLAGGED` rate).

### Triage

```bash
psql $DATABASE_URL <<'SQL'
SELECT
  moderation_status,
  count(*) as count,
  count(*) FILTER (WHERE created_at > now() - interval '24 hour') as last_24h
FROM media_assets
WHERE deleted_at IS NULL AND status = 'READY'
GROUP BY moderation_status;
SQL
```

If `FLAGGED` count > 100 in last 24h, an investigation is warranted.

Sample 10 recent `FLAGGED` rows:

```bash
psql $DATABASE_URL <<'SQL'
SELECT id, kind, moderation_flags, created_at
FROM media_assets
WHERE moderation_status = 'FLAGGED'
ORDER BY created_at DESC
LIMIT 10;
SQL
```

Inspect `moderation_flags->>'reasoning'` and `moderation_flags->>'category'`. If the rejections look correct (off-topic content), no action. If they're false positives (legitimate dental photos being flagged), file an incident under Task #46 follow-up — prompt tuning needed.

---

## Manual operations

### Hard-purge a media asset (DPDP deletion request)

Use the API endpoint with `hardPurge: true`:

```bash
curl -X DELETE \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "DPDP-request-<ticket-id>", "hardPurge": true}' \
  https://api.datunai.com/api/media/<media-id>
```

The cascade runs delivery → origin → DB soft-delete → AuditLog. An audit row with `action: 'media.hard_delete'` is your evidence trail.

### Verify EXIF is being stripped

```bash
# From a developer machine with sharp installed:
node -e "
  const sharp = require('sharp');
  const fs = require('fs');
  const bytes = fs.readFileSync(process.argv[1]);
  sharp(bytes).metadata().then(m => console.log({exif: m.exif?.length ?? 0, xmp: m.xmp?.length ?? 0}));
" /path/to/downloaded/processed-image.jpg
```

Expected output: `{exif: 0, xmp: 0}`.

### Re-run the calibration script (after parameter changes)

See `apps/api/src/scripts/image-quality-calibration.ts` header for usage. The output report must be reviewed by Mayank before any change to `RESIZE_TARGET_PX`, `JPEG_QUALITY`, or chroma subsampling lands in `@repo/shared/constants/media.constants.ts`.

---

## Escalation

- **Sustained R2 outage:** activate Cloudinary fallback per ADR-0006 §6.
- **Cloudflare Images sustained outage:** same — Cloudinary covers both Storage + Delivery.
- **Moderation prompt regression:** roll back recent deploys touching `moderation.service.ts` or `media-processing.processor.ts`.
- **DPDP deletion SLA at risk:** notify legal / compliance (Mayank). The 48-hour notice + 7-day window in `DeletionRequest` is a hard regulatory deadline.
