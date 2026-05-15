# Runbook: Cloudflare Setup for Task #46

**Audience:** Mayank (CEO) — one-time setup before first production media upload.
**Estimated time:** 45–60 minutes.
**Pre-requisite:** Cloudflare account with `datunai.com` already on Cloudflare DNS.
**Last reviewed:** 2026-05-15.

This runbook walks through the one-time Cloudflare dashboard configuration that the media pipeline depends on. Run this **before** the first production deploy of Task #46.

## Overview of resources created

| Resource                                    | Where                        | Why                                          |
| ------------------------------------------- | ---------------------------- | -------------------------------------------- |
| R2 bucket — `datun-media-prod-private`      | R2 → Buckets                 | Clinical PHI storage.                        |
| R2 bucket — `datun-media-prod-public`       | R2 → Buckets                 | Marketing + public assets.                   |
| R2 API token                                | R2 → Manage API Tokens       | Read/Write credential for API + worker.      |
| Cloudflare Images plan                      | Images → Plans               | CDN delivery + variant generation.           |
| Image variants — thumbnail / medium / large | Images → Variants            | Per-size delivery URLs.                      |
| Custom hostname binding (R2 public)         | R2 → bucket → Custom Domains | Public bucket served at `media.datunai.com`. |

## Step 1 — Create R2 buckets

1. Navigate to **R2 → Buckets** in the Cloudflare dashboard.
2. Click **Create bucket**.
3. **Name:** `datun-media-prod-private`. **Location hint:** Asia-Pacific (APAC). **Storage class:** Standard. Click **Create**.
4. Repeat for `datun-media-prod-public` with the same location and storage class.

For staging:

- `datun-media-staging-private` and `datun-media-staging-public`. Same APAC location.

**Confirm:** Both buckets appear in the R2 → Buckets list. Each is empty (0 objects).

## Step 2 — Bind a custom hostname to the public bucket

1. Open `datun-media-prod-public` → **Settings** → **Custom Domains**.
2. Click **Connect Domain**.
3. Enter `media.datunai.com`.
4. Cloudflare adds the necessary DNS records automatically (since `datunai.com` is on Cloudflare).
5. Wait ~60 seconds. The domain status should turn green ("Connected").

**Verify:** Open `https://media.datunai.com` in a browser. You should see an XML response listing bucket contents (or `404` for an empty bucket). Either is fine — it means routing works.

**Important:** Do NOT bind a custom hostname to the **private** bucket. Private bucket access goes exclusively through signed URLs minted by the API.

## Step 3 — Generate R2 API token

1. Navigate to **R2 → Manage API Tokens**.
2. Click **Create API Token**.
3. **Permissions:** Object Read & Write.
4. **Specify buckets:** select **only** the four buckets created above (prod private + public, staging private + public). Do not grant cross-account access.
5. **TTL:** No expiry (we rotate manually per security runbook).
6. Click **Create**.
7. Cloudflare displays four values **once** — copy all four immediately:
   - Access Key ID
   - Secret Access Key
   - Endpoint (`https://<account-id>.r2.cloudflarestorage.com`)
   - Account ID

Store these in your password manager AND paste into Railway env vars:

| Env var                | Value                      |
| ---------------------- | -------------------------- |
| `R2_ACCOUNT_ID`        | Account ID                 |
| `R2_ACCESS_KEY_ID`     | Access Key ID              |
| `R2_SECRET_ACCESS_KEY` | Secret Access Key          |
| `R2_BUCKET_PRIVATE`    | `datun-media-prod-private` |
| `R2_BUCKET_PUBLIC`     | `datun-media-prod-public`  |
| `R2_PUBLIC_HOSTNAME`   | `media.datunai.com`        |

Set these on **both** the API service and the worker service in Railway.

## Step 4 — Activate Cloudflare Images

1. Navigate to **Images** in the dashboard sidebar.
2. Click **Subscribe**. Day-1 plan: **Cloudflare Images Pro** ($5/mo + $1 per 1000 ingestions).
3. After subscription, the dashboard shows your **Account Hash** (a string like `qZQ81-AbCdEf-GhIjKl-MnOpQrSt`). Copy it.
4. Navigate to **Images → API tokens**. Click **Create token**.
5. **Permissions:** Cloudflare Images Edit. **Account:** select Datun. **Zone:** All. Click **Create**.
6. Copy the token (shown once).

Set these env vars on the API + worker:

| Env var                       | Value                               |
| ----------------------------- | ----------------------------------- |
| `CLOUDFLARE_ACCOUNT_ID`       | Same as R2 account ID.              |
| `CLOUDFLARE_ACCOUNT_HASH`     | The Account Hash from step 3 above. |
| `CLOUDFLARE_IMAGES_API_TOKEN` | The token from step 6.              |

## Step 5 — Configure image variants

In the Cloudflare Images dashboard, navigate to **Variants**. We need three named variants that match what `cloudflare-images.provider.ts` references:

### Variant `thumbnail`

- **Width:** 200
- **Height:** 200
- **Fit:** `scale-down` (clinical — never crop)
- **Quality:** 80
- **Gravity:** auto

### Variant `medium`

- **Width:** 640
- **Height:** 640
- **Fit:** `scale-down`
- **Quality:** 85
- **Gravity:** auto

### Variant `large`

- **Width:** 1200
- **Height:** 1200
- **Fit:** `scale-down`
- **Quality:** 88
- **Gravity:** auto

### (Optional) Variant `avatar-face`

For face-cropped avatars (DOCTOR_AVATAR, USER_AVATAR):

- **Width:** 200
- **Height:** 200
- **Fit:** `cover`
- **Gravity:** `face` (Cloudflare's auto face-detection)
- **Quality:** 85

Click **Save** after each variant.

**Note on the `scale-down` choice for clinical kinds:** we intentionally do not allow cropping of clinical photos. A wrongly-cropped consultation photo could omit the affected area entirely. `scale-down` only shrinks, never crops.

## Step 6 — Signed delivery (optional, Pro+ feature)

Pro and Enterprise plans support signed delivery URLs. Day-1 deployment does NOT enable this — we rely on app-layer auth instead. To enable later:

1. Navigate to **Images → Settings → Signing keys**.
2. Click **Create signing key**. Copy the value.
3. Set `CLOUDFLARE_IMAGES_SIGNING_KEY` env var on API + worker. The `CloudflareImagesProvider` auto-detects and starts signing URLs.

## Step 7 — Verify end-to-end

Test the full pipeline with a curl request:

```bash
# 1. Request an upload intent (replace <BEARER> with a real access token)
curl -X POST \
  -H "Authorization: Bearer <BEARER>" \
  -H "Content-Type: application/json" \
  -d '{
    "kind": "BLOG_IMAGE",
    "entityId": "00000000-0000-0000-0000-000000000001",
    "mimeType": "image/jpeg",
    "sizeBytes": 200000
  }' \
  https://api.datunai.com/api/media/upload-intent

# Response should contain `uploadUrl` pointing at *.r2.cloudflarestorage.com
```

```bash
# 2. PUT a small JPEG (test fixture)
curl -X PUT \
  -H "Content-Type: image/jpeg" \
  --data-binary @./fixtures/test-photo.jpg \
  '<uploadUrl from step 1>'

# Should return 200 with an ETag header.
```

```bash
# 3. Confirm the upload
curl -X POST \
  -H "Authorization: Bearer <BEARER>" \
  -H "Content-Type: application/json" \
  -d '{
    "finalSizeBytes": 200000,
    "width": 800,
    "height": 600,
    "blurhash": "L6PZfSi_.AyE_3t7t7R**0o#DgR4",
    "sha256": "abc..."
  }' \
  https://api.datunai.com/api/media/<mediaId from step 1>/confirm

# Response should contain `status: "UPLOADED"` and the worker job will run in <60s.
```

```bash
# 4. Poll for READY (should arrive within 60s)
curl -H "Authorization: Bearer <BEARER>" \
  https://api.datunai.com/api/media/<mediaId>

# Eventually: status: "READY", variants: { thumbnail, medium, large }
```

If all four steps succeed, the setup is complete.

## Step 8 — Rotate credentials (post-setup, quarterly cadence)

Set a calendar reminder:

- Quarterly: regenerate R2 API token, update Railway env vars, redeploy.
- Annually: regenerate Cloudflare Images API token, update env vars, redeploy.

Old tokens stay valid until manually revoked, so the rotation has zero downtime when staged correctly.

## Troubleshooting

| Symptom                                               | Likely cause                                             | Fix                                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Upload-intent returns 503 with service: `Storage`     | R2 token invalid or missing                              | Re-verify step 3 env vars                                                              |
| R2 PUT returns 403 `SignatureDoesNotMatch`            | Content-Type mismatch between signed URL and PUT request | Verify the client sends the exact `Content-Type` returned in `requiredHeaders`         |
| CF Images upload returns `Authentication error`       | Token revoked or wrong account                           | Re-verify step 4 env vars                                                              |
| `imagedelivery.net` URLs return 404                   | Wrong account hash in env                                | Re-verify `CLOUDFLARE_ACCOUNT_HASH` matches the dashboard's Account Hash               |
| `media.datunai.com` returns Cloudflare's default page | Custom hostname binding not yet propagated               | Wait 5 minutes; retry                                                                  |
| Worker FAILED rows with `R2 object not found`         | Signed upload URL expired before client PUT completed    | Increase `MEDIA_SIGNED_UPLOAD_TTL_SECONDS` (currently 300 — try 600 for slow networks) |

## References

- ADR-0006 — Media Storage Architecture.
- `docs/runbooks/media-pipeline.md` — operational incidents.
- Cloudflare R2 docs — https://developers.cloudflare.com/r2/
- Cloudflare Images docs — https://developers.cloudflare.com/images/
