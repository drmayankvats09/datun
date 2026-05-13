# CSP Third-Party Vendor Registry

**Purpose:** A complete inventory of every external service the Datun web application calls from the browser, with the rationale for each CSP directive entry.

**Owner:** CTO.
**Last reviewed:** May 13, 2026.

This registry is the operational counterpart to `apps/web/lib/csp/allowed-origins.ts`. Update both when adding or removing a vendor.

## Active Vendors

### Sentry — Error Tracking and Session Replay

- **What it does:** Captures unhandled exceptions, console errors, and (sampled) user-session replays for debugging.
- **Why it requires CSP entries:** The browser SDK is loaded from `browser.sentry-cdn.com` and posts error events to `*.ingest.sentry.io`.
- **CSP entries:**
  - `script-src`: `https://browser.sentry-cdn.com`, `https://js.sentry-cdn.com`
  - `connect-src`: `https://*.ingest.sentry.io`, `https://*.sentry.io`
- **Wildcard rationale:** Sentry assigns per-organization subdomains under `ingest.sentry.io`. The wildcard is restricted to that one second-level domain.

### Cloudflare Insights — Web Analytics

- **What it does:** Reports basic page-view and performance metrics. Privacy-respecting; no individual user tracking.
- **CSP entries:**
  - `script-src`: `https://static.cloudflareinsights.com`
  - `connect-src`: `https://cloudflareinsights.com`

### Vercel Analytics — Web Vitals

- **What it does:** Captures Core Web Vitals (LCP, CLS, INP) for performance monitoring.
- **CSP entries:**
  - `script-src`: `https://va.vercel-scripts.com`
  - `connect-src`: `https://vitals.vercel-insights.com`

### Cloudinary — Image Hosting and Upload

- **What it does:** Stores and serves dental photos, clinic photos, and other user-uploaded media. Direct browser-to-Cloudinary upload via signed URLs.
- **CSP entries:**
  - `img-src`: `https://res.cloudinary.com`
  - `connect-src`: `https://api.cloudinary.com`

### Google Fonts — Typography

- **What it does:** Serves the Inter font (Latin scripts) and the Noto Sans family (Devanagari, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Gurmukhi).
- **CSP entries:**
  - `style-src`: `https://fonts.googleapis.com`
  - `font-src`: `https://fonts.gstatic.com`

### Datun API — Internal

- **What it does:** Backend served from `api.datunai.com`. Receives all application API calls and CSP violation reports.
- **CSP entries:**
  - `connect-src`: `https://api.datunai.com`

## Pre-Staged Vendors

The following vendors are referenced in `allowed-origins.ts` but commented out. They become active when the linked task ships.

### PostHog — Feature Flags and Product Analytics

- **Task:** #49 (Feature Flags).
- **Anticipated CSP entries:**
  - `script-src`: `https://app.posthog.com`, `https://us-assets.i.posthog.com`
  - `connect-src`: `https://app.posthog.com`, `https://us.i.posthog.com`

### Razorpay — Payment Gateway

- **Task:** #53 (Razorpay Subscription).
- **Anticipated CSP entries:**
  - `script-src`: `https://checkout.razorpay.com`
  - `connect-src`: `https://api.razorpay.com`, `https://lumberjack.razorpay.com`
  - `frame-src`: `https://api.razorpay.com`, `https://checkout.razorpay.com`

### Google Tag Manager / Google Analytics 4

- **Task:** #58 (GA4 via GTM).
- **Anticipated CSP entries:**
  - `script-src`: `https://www.googletagmanager.com`, `https://www.google-analytics.com`

## Removed Vendors

When a vendor is decommissioned, move its entry here (rather than deleting outright) with the removal date and reason. Empty as of this writing.

## Review Schedule

This registry is reviewed:

- After every quarterly third-party vendor audit.
- Before every annual SOC 2 / ISO 27001 evidence collection cycle.
- When any new vendor is integrated or an existing vendor is removed.

The reviewer must confirm that every listed entry corresponds to a current production dependency and that no entry in `allowed-origins.ts` is missing from this document.
