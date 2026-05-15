# ADR-0006 — Media Storage Architecture

**Status:** Accepted
**Date:** 2026-05-15
**Deciders:** Mayank Vats (CEO, BDS), Claude (CTO)
**Task:** #46

---

## Context

Datun v2 needs an end-to-end media pipeline supporting:

1. **Clinical photos** (CONSULTATION_PHOTO, PRESCRIPTION_DOC) — private, PHI-grade, DPDP-regulated retention.
2. **Public marketing media** (BLOG_IMAGE, OG_IMAGE, CLINIC_COVER, DOCTOR_AVATAR, BRAND_ASSET) — CDN-delivered, SEO-indexable.
3. **Avatars** (USER_AVATAR, DOCTOR_AVATAR) — short-lived, signed-URL-protected for users; public for verified doctors.

The pipeline must be:

- FAANG-grade at Day 1 (consultant-grade quality, never blame the user).
- Compatible with the 5-year scaling target (1L → 10L users, 100k → 1M monthly uploads).
- Provider-agnostic to satisfy memory rule #27 (no single point of failure).
- Cost-bounded — current revenue is ₹0, infra must stay <$30/month at 100 users and <$300/month at 10k users.

## Decision

### 1. Provider stack

| Layer          | Day-1 primary                 | Fallback (standby) | Reason                                                                                                                                |
| -------------- | ----------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Origin storage | **Cloudflare R2**             | Cloudinary         | S3-compatible; we already use AWS SDK in `@repo/db`. ~3–5× cheaper than Cloudinary at our scale. No egress fees to Cloudflare Images. |
| Delivery / CDN | **Cloudflare Images**         | Cloudinary         | AVIF/WebP auto-negotiate; global edge; signed delivery for private kinds. Single vendor billing with R2.                              |
| Worker compute | Railway-hosted BullMQ workers | (n/a)              | Reuses existing worker fleet from Task #41.                                                                                           |

A single environment variable `STORAGE_PROVIDER_PRIMARY` toggles between R2 and Cloudinary. Both adapters implement the same `StorageProvider` interface (`apps/api/src/services/media/storage.types.ts`). Cloudinary adapter is **dormant** in Day 1 but covered by tests and a documented activation runbook.

### 2. Canonical image parameters

Locked after the BDS approval gate (see `apps/api/src/scripts/image-quality-calibration.ts`):

| Parameter             | Value                               | Reason                                                                                                                                                                                            |
| --------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Longest edge          | **1568 px**                         | Claude Vision optimal — 1568 is the largest dimension Claude resizes inputs to internally; sending larger wastes vision tokens; sending smaller loses detail.                                     |
| JPEG quality          | **92**                              | Medical-grade — preserves caries dots, gum-line gradient detail. Verified via parity check against q95 — no diagnostic regression.                                                                |
| Chroma subsampling    | **4:4:4**                           | No chroma downsample. Default mozjpeg uses 4:2:0 which softens fine clinical detail. 4:4:4 adds ~10% size, kept under our 1.5 MB ceiling.                                                         |
| Output format         | **JPEG**                            | Universal device support, smaller than PNG for photographic content, accepted by Cloudflare Images as origin. AVIF/WebP delivery handled by CDN layer.                                            |
| EXIF strip            | **Yes (orientation tag PRESERVED)** | Strips GPS, camera-ID, timestamps. Keeps orientation tag because browsers and Claude Vision both handle orientation correctly — manipulating it adds rotation-bug risk for zero clinical benefit. |
| Perceptual hash dedup | **No**                              | Two patients photographing the same dental condition produce visually similar images — false positives risk denying legitimate uploads. We use a hard 5-photo-per-consultation cap instead.       |

### 3. Per-MediaKind access model

Two access classes, encoded in `MEDIA_KIND_CONFIG`:

- **Private** (CONSULTATION_PHOTO, PRESCRIPTION_DOC, USER_AVATAR): land in `datun-media-prod-private` bucket. Reads always go through short-lived (5-minute) signed URLs from `R2Provider.getSignedReadUrl`. CF Images signed delivery enabled when on Pro tier.
- **Public** (BLOG_IMAGE, OG_IMAGE, CLINIC_COVER, CLINIC_GALLERY, DOCTOR_AVATAR, BRAND_ASSET): land in `datun-media-prod-public` bucket. Resolved by permanent CDN URLs with 1-year `Cache-Control: public, max-age=31536000`.

Routing is automatic in `R2Provider.bucketFor(kind)` — no caller chooses a bucket.

### 4. DPDP compliance

- Every clinical upload requires a `ConsentLog` row with `purpose ∈ {AI_CONSULTATION, DATA_TRAINING}`. The service refuses uploads without one.
- `retentionExpiresAt` is set per-kind at create time (7 years default for clinical, never for public marketing). A nightly cron (Task #57 follow-up) purges past horizon.
- DPDP deletion requests cascade through `media.service.deleteMedia()` with `hardPurge: true`: CF Images variants → R2 origin → DB soft-delete → AuditLog row. All four are atomic in a Prisma `$transaction` for the DB portion; external resources are best-effort with explicit Sentry capture on failure.

### 5. Async processing pipeline

Client-side (Web Worker, `apps/web/lib/media/client-resize.worker.ts`):

1. Magic-byte verify.
2. HEIC decode (lazy WASM via `heic2any`).
3. createImageBitmap decode (orientation: 'none').
4. OffscreenCanvas resize to 1568px longest edge.
5. JPEG q92 encode via convertToBlob.
6. Blurhash compute (4×3 components).
7. SHA-256 hash.

Server-side (BullMQ worker, `apps/worker/src/processors/media-processing.processor.ts`):

1. Re-verify magic bytes (defense in depth).
2. Sharp defensive re-pass — EXIF strip, dimension probe, q92 re-encode (idempotent if client already did it correctly).
3. Moderation via Claude Vision (per-kind prompts in `moderation.service.ts`).
4. Cloudflare Images upload — variants generated lazily at the edge.
5. DB row finalised: status READY, variant URLs persisted.

The server-side re-pass exists so that a buggy or malicious client cannot bypass our PHI safety guarantees.

### 6. Cloudinary activation runbook (when needed)

Pre-conditions:

- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` set on API + worker environments.
- Upload presets `datun-private` and `datun-public` created in the Cloudinary dashboard with `signed` mode.

Activation:

1. Flip `STORAGE_PROVIDER_PRIMARY=cloudinary` in Vercel (web) + Railway (api + worker).
2. Redeploy api + worker. Web does not need redeploy (no Cloudinary direct calls from FE).
3. Verify: upload a test file via `/api/media/upload-intent` and confirm the response targets a `*.cloudinary.com` URL.
4. Backfill: existing R2 objects continue to render through their cached variant URLs; no migration is required. R2 origin remains queryable for any cold-load.

Reversal: same procedure with `STORAGE_PROVIDER_PRIMARY=r2`.

### 7. Cost analysis

At 100 users with ~30 photos/month each = 3 k uploads/month:

| Line item                 | R2 + CF Images         | Cloudinary       |
| ------------------------- | ---------------------- | ---------------- |
| Origin storage (3 GB)     | $0.045/mo              | $0/mo (bundled)  |
| Egress to CF Images       | $0 (intra-network)     | (n/a)            |
| Delivery (5 GB CDN)       | $0/mo (CF free tier)   | included in plan |
| CF Images ingest (3 k/mo) | $1.50/mo (CF Pro tier) | included         |
| Cloudinary equivalent     | (n/a)                  | $89/mo Plus plan |
| **Total**                 | **~$1.55/mo**          | **~$89/mo**      |

At 10 k users (300 k uploads/month):

| Line item                | R2 + CF Images | Cloudinary                  |
| ------------------------ | -------------- | --------------------------- |
| Storage (~300 GB)        | $4.50/mo       | included up to 10 GB only   |
| CF Images ingest (300 k) | $150/mo        | included                    |
| Cloudinary equivalent    | (n/a)          | $549/mo Advanced + overages |
| **Total**                | **~$155/mo**   | **~$549–$1200/mo**          |

R2 + CF Images is ~3.5–8× cheaper at scale. The Cloudinary fallback is a resilience option, not a cost-driven default.

## Consequences

**Positive**

- Single-vendor billing (Cloudflare) for the production stack.
- One env-flag failover to Cloudinary if Cloudflare has a sustained outage.
- BDS-approved clinical parameter set, locked in this ADR.
- DPDP-compliant from Day 1 (consent gate, retention horizon, hard-purge cascade).
- Web Worker keeps UI responsive on mid-range Android phones.

**Negative**

- Two providers in the trust boundary (R2 + CF Images) — both must be healthy for the pipeline to run. Mitigated by the Cloudinary dual-role fallback adapter.
- WASM HEIC decode adds ~3–4 MB to the first-HEIC-encounter download. Mitigated by lazy import + browser cache.
- Sharp native binary adds ~50 MB to the worker container image. Acceptable for Railway, monitored in worker deploy size.

**Open follow-ups**

- Task #57 — retention cron (purge `MediaAsset` past `retentionExpiresAt`).
- Phase 5 CSP patch — `imagedelivery.net` + `*.datunai.com` to be added to `IMG_ORIGINS` AFTER Task #45 CSP enforce flip lands in production.
- Cloudflare Images signed delivery requires Pro tier — Day-1 deployment relies on app-layer auth instead; upgrade tracked under Task #62 once revenue allows.

## References

- Task #46 master plan — section 5 (Image Optimization)
- Cloudflare R2 docs — https://developers.cloudflare.com/r2/
- Cloudflare Images docs — https://developers.cloudflare.com/images/
- Anthropic Vision image sizing — https://docs.anthropic.com/en/docs/build-with-claude/vision
- DPDP Act 2023 — Section 11 (Right to Erasure)
