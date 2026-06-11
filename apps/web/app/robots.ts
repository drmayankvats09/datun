// apps/web/app/robots.ts
// ═══════════════════════════════════════════════════════════════
// ROBOTS.TXT — native App Router route (Task #53.5 W3-A · PDF #10)
//
// Replaces next-sitemap's postbuild-generated robots.txt, which
// NEVER reached production: Vercel collects static assets during
// `next build`, and postbuild writes to public/ after collection —
// the file existed on the build machine and nowhere else
// (live proof 11 Jun 2026: www.datunai.com/robots.txt served pure
// Cloudflare managed content, zero origin directives).
//
// GEO POLICY (founder mandate, 11 Jun 2026): Datun WANTS AI
// crawlers. 600M underserved Indians increasingly ask ChatGPT /
// Claude / Perplexity / Gemini health questions — being citable
// there IS distribution. Every major AI crawler below is therefore
// explicitly allowed. User-agent strings are vendor-canonical
// (a typo silently fails — names verified against vendor docs,
// Jun 2026). The explicit groups also self-document policy and
// out-vote Cloudflare's prepended Disallow groups under Google's
// longest-match tie-break while the managed-robots toggle is
// being turned off (see EXTERNAL_SETUP doc, step 1).
//
// /api, /admin and /auth stay out of EVERY group — crawl budget
// belongs to patient-facing pages, and admin surfaces have no
// business in any index, human or AI.
// ═══════════════════════════════════════════════════════════════

import type { MetadataRoute } from 'next';
import { URLS } from '@repo/shared';

const BASE = process.env.NEXT_PUBLIC_APP_URL || URLS.websiteHttps;

const PRIVATE_PATHS = ['/api/', '/admin/', '/auth/'];

/** Vendor-canonical AI crawler user-agents (verified Jun 2026). */
const AI_CRAWLERS = [
  // OpenAI — training, ChatGPT search index, user-triggered visits
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  // Anthropic — training, Claude user fetches, Claude search index
  'ClaudeBot',
  'Claude-User',
  'Claude-SearchBot',
  // Perplexity — index builder + human-triggered visits
  'PerplexityBot',
  'Perplexity-User',
  // Google AI (Gemini / AI Overviews grounding; Googlebot is separate)
  'Google-Extended',
  // Apple Intelligence
  'Applebot',
  'Applebot-Extended',
  // Meta AI
  'meta-externalagent',
  'Meta-ExternalFetcher',
  // Common Crawl (feeds many research/lab models)
  'CCBot',
  // Amazon (Alexa / Rufus answers)
  'Amazonbot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: AI_CRAWLERS,
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
