// apps/web/lib/seo/indexnow.ts
// ═══════════════════════════════════════════════════════════════
// INDEXNOW — fast change-discovery for Bing / Yandex / Naver (and, via Bing,
// ChatGPT Search + Copilot). Google does NOT support IndexNow, so for Google we
// rely on the clean content-based sitemap + internal linking (Task #55 D).
//
// FOUNDATION ONLY — gated + dormant until configured (no-op without a key, so
// importing this is always inert and ships nothing harmful). To activate:
//   1. Generate an IndexNow key; set INDEXNOW_KEY in the deploy environment.
//   2. Host the ownership proof at the site root:
//        https://datunai.com/<KEY>.txt   (body = exactly <KEY>)
//   3. From the post-deploy hook, call submitUrls([...changedUrls]) with ONLY
//      the URLs whose content actually changed — never the whole sitemap
//      (IndexNow rate-limits / distrusts spammy floods).
// The deploy-hook wiring + key file are CI/infra steps (owned by the founder);
// this module is the typed, tested integration point.
// ═══════════════════════════════════════════════════════════════

import { URLS } from '@repo/shared';

const ENDPOINT = 'https://api.indexnow.org/indexnow';

/**
 * Submit changed URLs to IndexNow. Safe no-op (returns false) unless
 * INDEXNOW_KEY is set and at least one URL is given. Returns whether the
 * endpoint accepted the batch. Never throws — discovery is best-effort.
 */
export async function submitUrls(urls: readonly string[]): Promise<boolean> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || urls.length === 0) return false;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: URLS.website,
        key,
        keyLocation: `${URLS.websiteHttps}/${key}.txt`,
        urlList: [...urls],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
