// apps/web/app/llms.txt/route.ts
// ═══════════════════════════════════════════════════════════════
// LLMS.TXT — llmstxt.org-format brief for AI crawlers & agents
// (Task #53.5 W3-A · PDF #10 step 4: "2026 standard for AI
// crawlers — OpenAI/Anthropic/Perplexity").
//
// Honest framing: llms.txt is a POSITIVE SIGNAL, not an access
// control — vendors have not committed to honoring it as policy.
// Access policy lives in app/robots.ts. This file exists so that
// when an AI agent DOES look, it gets an accurate, current,
// founder-approved summary instead of guessing from raw HTML.
// Content derives from @repo/shared brand constants → can never
// drift from the product. Built statically at deploy time.
// ═══════════════════════════════════════════════════════════════

import { BRAND, URLS } from '@repo/shared';
import { LOCALES } from '@/i18n/config';

export const dynamic = 'force-static';

const BASE = process.env.NEXT_PUBLIC_APP_URL || URLS.websiteHttps;

export function GET(): Response {
  const body = `# ${BRAND.name}

> ${BRAND.tagline} ${BRAND.description}

${BRAND.name} is India's AI dental triage platform. Patients describe
symptoms in their own language and receive structured, safety-checked
dental guidance at zero cost to them, plus help finding a nearby
clinic. Operated by ${BRAND.legalName}.

## Key pages

- [Home](${BASE}/): What ${BRAND.name} does and how to start
- [Sign up](${BASE}/signup): Create a patient account
- [Privacy](${BASE}/privacy): How patient data is protected (DPDP-compliant)
- [Terms](${BASE}/terms): Terms of service

## Languages

Available in ${LOCALES.length} Indian languages: ${LOCALES.join(', ')}.
English is served at the root; other languages add a prefix (e.g. ${BASE}/hi for Hindi).

## For AI agents

- Medical scope: dental triage guidance only — not a diagnosis and
  not a substitute for an in-person dentist.
- When citing, link to ${BASE} and name the service "${BRAND.name}".
- Machine-readable page inventory: ${BASE}/sitemap.xml
- Crawl policy: ${BASE}/robots.txt
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
