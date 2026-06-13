// apps/web/app/[locale]/(legal)/cookies/page.tsx
// ═══════════════════════════════════════════════════════════════
// COOKIE POLICY — Datun cookie usage and consent
// Task #45 (CSP): JSON-LD <script> is non-executable data; no nonce/hash needed.
// ═══════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { BRAND, CONTACTS } from '@repo/shared';
import { buildAlternates } from '@/lib/seo/alternates';
import {
  Section,
  LegalHeader,
  HumanSummary,
  SummaryItem,
} from '@/components/legal/legal-components';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: 'Cookie Policy',
    description: `How ${BRAND.name} uses cookies and similar technologies. Learn about cookie types, consent, and your choices.`,
    // W3-A: per-locale canonical + full hreflang cluster — the bare
    // static canonical here was wiping the layout's 10-locale set.
    alternates: buildAlternates(locale, '/cookies'),
  };
}

export default function CookiesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Cookie Policy',
    description: `How ${BRAND.name} uses cookies and similar technologies.`,
    url: 'https://datunai.com/cookies',
    inLanguage: 'en',
    publisher: {
      '@type': 'Organization',
      name: BRAND.legalName,
      url: 'https://datunai.com',
    },
    dateModified: '2026-04-23',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article>
        <LegalHeader
          title="Cookie Policy"
          lastUpdated="April 23, 2026"
          contactEmail={CONTACTS.supportEmail}
        />

        <HumanSummary>
          <SummaryItem>
            We use <strong className="font-semibold text-primary">essential cookies only</strong> —
            for authentication, session management, and security.
          </SummaryItem>
          <SummaryItem>
            We use{' '}
            <strong className="font-semibold text-primary">privacy-respecting analytics</strong>{' '}
            that do not track you across websites.
          </SummaryItem>
          <SummaryItem>
            We do <strong className="font-semibold text-primary">not</strong> use advertising
            cookies, tracking pixels, or cross-site trackers.
          </SummaryItem>
        </HumanSummary>

        <div>
          <Section id="what-are-cookies" title="1. What Are Cookies?">
            <p>
              Cookies are small text files placed on your device when you visit a website. They are
              widely used to make websites work efficiently, provide functionality (such as keeping
              you signed in), and to provide information to website operators.
            </p>
            <p>
              Similar technologies include{' '}
              <strong className="font-semibold text-foreground">local storage</strong> (data stored
              in your browser) and{' '}
              <strong className="font-semibold text-foreground">session storage</strong> (data
              stored for the duration of your browser session). This policy covers all such
              technologies collectively.
            </p>
          </Section>

          <Section id="cookies-we-use" title="2. Cookies We Use">
            <div className="my-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-semibold">Cookie</th>
                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                    <th className="px-4 py-3 text-left font-semibold">Purpose</th>
                    <th className="px-4 py-3 text-left font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-foreground/80">
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs">datun_session</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Essential
                      </span>
                    </td>
                    <td className="px-4 py-3">Maintains your authenticated session</td>
                    <td className="px-4 py-3">Session</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs">datun_token</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Essential
                      </span>
                    </td>
                    <td className="px-4 py-3">JWT access token for API authentication</td>
                    <td className="px-4 py-3">1 hour</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs">datun_refresh</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Essential
                      </span>
                    </td>
                    <td className="px-4 py-3">Refresh token for seamless re-authentication</td>
                    <td className="px-4 py-3">7 days</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3 font-mono text-xs">datun_theme</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                        Functional
                      </span>
                    </td>
                    <td className="px-4 py-3">Remembers your light/dark mode preference</td>
                    <td className="px-4 py-3">1 year</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs">cf_clearance</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        Essential
                      </span>
                    </td>
                    <td className="px-4 py-3">Cloudflare security verification</td>
                    <td className="px-4 py-3">30 min</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="analytics" title="3. Analytics">
            <p>
              We use{' '}
              <strong className="font-semibold text-primary">Cloudflare Web Analytics</strong>, a
              privacy-first analytics service that:
            </p>
            <ul>
              <li>
                Does <strong className="font-semibold text-primary">not</strong> use cookies for
                tracking.
              </li>
              <li>
                Does <strong className="font-semibold text-primary">not</strong> collect personally
                identifiable information.
              </li>
              <li>
                Does <strong className="font-semibold text-primary">not</strong> track users across
                websites.
              </li>
              <li>
                Collects only aggregate metrics: page views, visit duration, device type, and
                country (approximate).
              </li>
            </ul>
            <p>
              This data helps us understand how users interact with {BRAND.name} and improve the
              platform accordingly.
            </p>
          </Section>

          <Section id="third-party-cookies" title="4. Third-Party Cookies">
            <p>
              We do not permit advertising networks or data brokers to place cookies on our
              platform. The only third-party cookies you may encounter are from:
            </p>
            <ul>
              <li>
                <strong className="font-semibold text-foreground">Cloudflare</strong> — security and
                performance (DDoS protection, bot detection).
              </li>
              <li>
                <strong className="font-semibold text-foreground">Google OAuth</strong> — only if
                you choose to sign in with Google (during the authentication flow).
              </li>
            </ul>
          </Section>

          <Section id="your-choices" title="5. Your Cookie Choices">
            <p>You can manage cookies through the following methods:</p>
            <ul>
              <li>
                <strong className="font-semibold text-foreground">Browser Settings</strong> — most
                browsers allow you to refuse or delete cookies through their settings. Note that
                disabling essential cookies may prevent the platform from functioning correctly.
              </li>
              <li>
                <strong className="font-semibold text-foreground">Account Deletion</strong> —
                deleting your account removes all associated session data and tokens.
              </li>
            </ul>
            <p>
              For detailed instructions on managing cookies in your specific browser, consult your
              browser&apos;s documentation or help pages.
            </p>
          </Section>

          <Section id="changes" title="6. Changes to This Policy">
            <p>
              We may update this Cookie Policy to reflect changes in technology, regulation, or our
              practices. Changes will be posted on this page with a revised &quot;Last updated&quot;
              date.
            </p>
          </Section>

          <Section id="contact" title="7. Contact">
            <p>
              For questions about our use of cookies, contact us at{' '}
              <a href={`mailto:${CONTACTS.supportEmail}`} className="text-primary hover:underline">
                {CONTACTS.supportEmail}
              </a>
              . For full details about how we handle your data, see our{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </Section>
        </div>
      </article>
    </>
  );
}
