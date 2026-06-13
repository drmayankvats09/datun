// apps/web/app/[locale]/(legal)/accessibility/page.tsx
// ═══════════════════════════════════════════════════════════════
// ACCESSIBILITY STATEMENT — Task #54 (WCAG 2.2 AA)
//
// WHY THIS PAGE EXISTS (beyond being the right thing):
//   • EAA Article 13(2) requires service providers to publicly
//     explain HOW their service is accessible, in language everyone
//     can understand. EN 301 549 (the EAA's presumptive standard)
//     is adopting WCAG 2.2 — the exact bar Datun's CI now enforces.
//   • India's RPwD Act 2016 + IS 17802 point the same direction for
//     the home market.
//   • For Datun specifically: "Everyone Deserves a Doctor" is hollow
//     if a blind patient can't finish a consultation. This page is
//     that promise, in writing, with a feedback channel.
//
// PATTERN: byte-level sibling of privacy/page.tsx — hardcoded
// professional English (legal-surface convention in this repo),
// generateMetadata + buildAlternates, JSON-LD WebPage (non-executable
// data; CSP-safe per Task #45 note), LegalHeader/HumanSummary/Section
// composition. The route self-registers in the Task #54 E2E sweep
// (e2e/a11y/public-pages.a11y.spec.ts) in this same PR — the
// statement page itself is audit-gated. Practice what we publish.
// ═══════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import { BRAND, CONTACTS } from '@repo/shared';
import { buildAlternates } from '@/lib/seo/alternates';
import {
  Section,
  InfoBox,
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
    title: 'Accessibility Statement',
    description: `How ${BRAND.name} is built so that every patient — including those using screen readers, keyboards, or magnification — can get dental guidance. WCAG 2.2 AA.`,
    alternates: buildAlternates(locale, '/accessibility'),
  };
}

export default function AccessibilityPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Accessibility Statement',
    description: `How ${BRAND.name} is built to be usable by every patient, including those who rely on assistive technology.`,
    url: 'https://datunai.com/accessibility',
    inLanguage: 'en',
    publisher: {
      '@type': 'Organization',
      name: BRAND.legalName,
      url: 'https://datunai.com',
    },
    dateModified: '2026-06-12',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article>
        <LegalHeader
          title="Accessibility Statement"
          lastUpdated="June 12, 2026"
          contactEmail={CONTACTS.supportEmail}
        />

        <HumanSummary>
          <SummaryItem>
            {BRAND.name} is built to{' '}
            <strong className="font-semibold text-primary">WCAG 2.2 Level AA</strong> — the current
            international accessibility standard (ISO/IEC&nbsp;40500) — and that bar is enforced by
            automated checks on every single code change, not by an annual audit.
          </SummaryItem>
          <SummaryItem>
            The full consultation works with a{' '}
            <strong className="font-semibold text-primary">
              keyboard alone, with screen readers, and with magnification
            </strong>{' '}
            — in light and dark themes, on a budget phone or a desktop, in 10 Indian languages.
          </SummaryItem>
          <SummaryItem>
            If anything blocks you,{' '}
            <strong className="font-semibold text-primary">tell us on WhatsApp or email</strong> —
            accessibility reports are treated as bugs in medical equipment, not as suggestions.
          </SummaryItem>
        </HumanSummary>

        <Section id="commitment" title="1. Our Commitment">
          <p>
            Datun exists for the 600&nbsp;million Indians who cannot easily reach a dentist.
            Disability and distance compound each other: a patient who is blind, low-vision,
            motor-impaired, or relying on an older device often has the <em>fewest</em> alternatives
            when dental pain strikes. For us, accessibility is therefore not a compliance checkbox —
            it is the product working as intended. &ldquo;Everyone Deserves a Doctor&rdquo; includes
            everyone.
          </p>
          <p>
            {BRAND.legalName} commits to conforming with the Web Content Accessibility Guidelines
            (WCAG) 2.2 at Level AA, published by the W3C and standardised as ISO/IEC&nbsp;40500.
            This also aligns {BRAND.name} with India&rsquo;s Rights of Persons with Disabilities
            Act, 2016 and IS&nbsp;17802, and with the European standard EN&nbsp;301&nbsp;549
            referenced by the European Accessibility Act.
          </p>
        </Section>

        <Section id="conformance" title="2. Conformance Status">
          <p>
            <strong className="font-semibold text-foreground">
              {BRAND.name} is partially conformant with WCAG 2.2 Level AA.
            </strong>{' '}
            &ldquo;Partially conformant&rdquo; means most content fully meets the standard, and the
            exceptions are known, listed in Section&nbsp;4 below, and scheduled — not discovered by
            our users.
          </p>
          <p>
            Conformance is verified continuously rather than periodically: every proposed code
            change must pass an automated accessibility gate before it can ship (Section&nbsp;5). A
            change that introduces a WCAG violation is blocked the same way a change that breaks the
            database would be.
          </p>
        </Section>

        <Section id="measures" title="3. What We Have Built">
          <p>
            Accessibility at {BRAND.name} is engineered in layers, each one verified by machines on
            every change:
          </p>
          <ul>
            <li>
              <strong className="font-semibold text-foreground">Keyboard-first operation.</strong>{' '}
              Every interactive element is reachable and operable by keyboard alone, a &ldquo;skip
              to main content&rdquo; link is the first stop on every page, focus is always visible,
              and the sticky header can never hide the element you are focused on.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Screen-reader support.</strong>{' '}
              Semantic landmarks, labelled controls, live announcements for page changes and upload
              progress, and correct language tagging across all 10 supported languages so
              pronunciation engines read Hindi as Hindi, Tamil as Tamil.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Readable by design.</strong> Color
              contrast meets or exceeds the 4.5:1 (text) and 3:1 (interface) ratios in both light
              and dark themes; color is never the only carrier of meaning; layouts reflow without
              horizontal scrolling at 400% zoom.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Touch that forgives.</strong>{' '}
              Interactive targets meet the WCAG 2.2 minimum size on the budget phones most of our
              patients use.
            </li>
            <li>
              <strong className="font-semibold text-foreground">
                Sign-in without memory tests.
              </strong>{' '}
              Password fields accept paste and work with password managers; phone sign-in uses SMS
              codes; nothing requires transcription from memory (WCAG 2.2 Accessible
              Authentication).
            </li>
            <li>
              <strong className="font-semibold text-foreground">Motion that respects you.</strong>{' '}
              Every animation honours the system &ldquo;reduce motion&rdquo; setting.
            </li>
          </ul>
        </Section>

        <Section id="limitations" title="4. Known Limitations">
          <p>
            We list these because hiding them would only outsource the discovery to a patient in
            pain. Each has an owner and a scheduled fix on our public-facing roadmap:
          </p>
          <ul>
            <li>
              <strong className="font-semibold text-foreground">
                Consultation PDFs are not yet tagged.
              </strong>{' '}
              The downloadable summary works visually but does not yet carry the structural tags
              screen readers need. Tagged-PDF generation ships with the consultation-report work;
              until then, the same guidance is fully accessible in the web conversation itself.
            </li>
            <li>
              <strong className="font-semibold text-foreground">
                Photo guidance is visual-first today.
              </strong>{' '}
              Dental-photo capture currently relies on on-screen framing cues; richer non-visual
              capture guidance and AI-written photo descriptions are scheduled alongside the
              photo-upload upgrade.
            </li>
            <li>
              <strong className="font-semibold text-foreground">
                Voice features will launch with captions — not before.
              </strong>{' '}
              Upcoming voice input/output ships with synchronized text equivalents from day one; we
              mention it here so the commitment is on record before the feature exists.
            </li>
          </ul>
        </Section>

        <Section id="assessment" title="5. How We Assess Ourselves">
          <p>
            {BRAND.name} uses a defence-in-depth assessment approach rather than a once-a-year
            audit:
          </p>
          <ul>
            <li>
              <strong className="font-semibold text-foreground">On every code change:</strong>{' '}
              static accessibility linting, component-level audits, and full-page audits with
              axe-core (the industry-standard WCAG engine) across desktop and mobile viewports, in
              light and dark themes — plus Lighthouse accessibility scoring with a hard minimum. A
              failing check blocks the change.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Every month:</strong> a scripted
              manual audit with the NVDA screen reader covering the complete patient journey,
              because roughly half of real-world accessibility barriers are only findable by a
              human.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Evidence, retained:</strong>{' '}
              machine-readable audit results from every change are archived, giving us — and any
              regulator or partner who asks — a continuous conformance trail instead of a stale
              certificate.
            </li>
          </ul>
        </Section>

        <Section id="compatibility" title="6. Compatibility">
          <p>
            {BRAND.name} is tested with current versions of Chrome, Edge, Firefox and Safari, on
            Android and iOS, and with the NVDA screen reader on Windows plus VoiceOver on iOS. The
            interface is designed mobile-first for entry-level Android devices on constrained
            networks, and remains functional with JavaScript execution delayed on slow connections.
          </p>
        </Section>

        <Section id="feedback" title="7. Feedback — Tell Us What Blocked You">
          <p>
            If any part of {BRAND.name} is difficult or impossible for you to use, please tell us.
            Accessibility reports go to the same channel as medical-safety issues and are
            prioritised the same way.
          </p>
          <ul>
            <li>
              <strong className="font-semibold text-foreground">WhatsApp:</strong>{' '}
              <a
                href={`https://wa.me/${CONTACTS.supportPhone}?text=${encodeURIComponent(
                  'Hi Datun! I found an accessibility problem: ',
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-6 items-center font-medium text-primary underline underline-offset-4"
              >
                {CONTACTS.supportPhoneDisplay}
              </a>{' '}
              — the fastest route, and the one most of our patients already use.
            </li>
            <li>
              <strong className="font-semibold text-foreground">Email:</strong>{' '}
              <a
                href={`mailto:${CONTACTS.supportEmail}?subject=${encodeURIComponent(
                  'Accessibility feedback',
                )}`}
                className="inline-flex min-h-6 items-center font-medium text-primary underline underline-offset-4"
              >
                {CONTACTS.supportEmail}
              </a>
            </li>
          </ul>
          <p>
            We aim to respond within{' '}
            <strong className="font-semibold text-foreground">2 business days</strong> and to fix
            confirmed accessibility barriers with the urgency of a product defect — because that is
            what they are.
          </p>
        </Section>

        <Section id="statement-meta" title="8. About This Statement">
          <p>
            This statement was prepared on{' '}
            <strong className="font-semibold text-foreground">June 12, 2026</strong> and reflects an
            engineering-led self-assessment backed by the continuous automated verification
            described in Section&nbsp;5. It is reviewed and updated whenever the product&rsquo;s
            accessibility posture materially changes, and at minimum every six months.
          </p>
          <InfoBox>
            This page itself is part of the automated accessibility test suite — every future change
            to {BRAND.name} re-verifies that the page describing our accessibility still meets the
            standard it describes.
          </InfoBox>
        </Section>
      </article>
    </>
  );
}
