// apps/web/app/[locale]/(legal)/terms/page.tsx
// ═══════════════════════════════════════════════════════════════
// TERMS OF SERVICE — Datun usage terms + medical disclaimers
// Task #45 (CSP): JSON-LD <script> is non-executable data; no nonce/hash needed.
// ═══════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { BRAND, CONTACTS } from '@repo/shared';
import {
  Section,
  InfoBox,
  WarnBox,
  LegalHeader,
  HumanSummary,
  SummaryItem,
} from '@/components/legal/legal-components';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms governing the use of ${BRAND.name}, an AI-powered dental health platform. Includes medical disclaimers and service limitations.`,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Terms of Service',
    description: `Terms governing the use of ${BRAND.name}, an AI-powered dental health platform.`,
    url: 'https://datunai.com/terms',
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article>
        <LegalHeader
          title="Terms of Service"
          lastUpdated="April 23, 2026"
          contactEmail={CONTACTS.supportEmail}
        />

        <HumanSummary>
          <SummaryItem>
            {BRAND.name} provides{' '}
            <strong className="font-semibold text-primary">
              AI-assisted dental health guidance
            </strong>{' '}
            — not medical diagnosis, prescription, or treatment.
          </SummaryItem>
          <SummaryItem>
            You must be <strong className="font-semibold text-primary">18 or older</strong>, or use
            the platform under parental supervision.
          </SummaryItem>
          <SummaryItem>
            In a <strong className="font-semibold text-primary">medical emergency, call 112</strong>{' '}
            immediately. Do not rely on AI for emergencies.
          </SummaryItem>
          <SummaryItem>
            All disputes are governed by the{' '}
            <strong className="font-semibold text-primary">laws of India</strong>, with exclusive
            jurisdiction in the courts of New Delhi.
          </SummaryItem>
        </HumanSummary>

        <div>
          <Section id="acceptance" title="1. Acceptance of Terms">
            <p>
              By accessing or using {BRAND.name} at{' '}
              <a href="https://datunai.com" className="text-primary hover:underline">
                datunai.com
              </a>{' '}
              or any associated applications (collectively, the &quot;Platform&quot;), you agree to
              be bound by these Terms of Service (&quot;Terms&quot;) and our{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              . If you do not agree, you must discontinue use immediately.
            </p>
            <p>
              These Terms constitute a legally binding agreement between you (&quot;User,&quot;
              &quot;you,&quot; or &quot;your&quot;) and{' '}
              <strong className="font-semibold text-primary">{BRAND.legalName}</strong> (&quot;
              {BRAND.name},&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;).
            </p>
          </Section>

          <Section id="nature-of-service" title="2. Nature of Service">
            <p>
              {BRAND.name} is an{' '}
              <strong className="font-semibold text-primary">
                AI-powered dental health information and triage platform
              </strong>
              . We provide technology-assisted guidance to help users understand dental symptoms,
              receive preliminary assessments, and make informed decisions about seeking
              professional care.
            </p>
            <WarnBox>
              <strong>Critical Distinction:</strong> {BRAND.name} is <strong>not</strong> a medical
              practice. We do <strong>not</strong> provide clinical diagnoses, write prescriptions,
              or deliver treatment. We are <strong>not</strong> a substitute for a licensed dental
              professional. In a medical emergency, call <strong>112</strong> immediately.
            </WarnBox>
          </Section>

          <Section id="ai-limitations" title="3. AI Limitations &amp; Disclaimer">
            <p>
              Our AI system is designed to assist with dental health information but has inherent
              limitations:
            </p>
            <ul>
              <li>
                AI-generated assessments are{' '}
                <strong className="font-semibold text-primary">probabilistic in nature</strong> and
                may contain inaccuracies, especially with incomplete information.
              </li>
              <li>
                AI cannot perform{' '}
                <strong className="font-semibold text-foreground">physical examination</strong>,
                take X-rays, conduct vitality tests, or perform any hands-on diagnostic procedure.
              </li>
              <li>
                AI guidance is based on the information you provide.{' '}
                <strong className="font-semibold text-foreground">
                  Incomplete or inaccurate input
                </strong>{' '}
                will result in less relevant guidance.
              </li>
              <li>
                AI does <strong className="font-semibold text-primary">not</strong> account for
                clinical findings visible only through in-person examination.
              </li>
              <li>
                Drug dosage information, when provided, is for{' '}
                <strong className="font-semibold text-foreground">
                  general informational purposes
                </strong>{' '}
                and must be verified by a licensed practitioner before use.
              </li>
            </ul>
            <p>
              <strong className="font-semibold text-primary">You acknowledge and agree</strong> that
              all clinical decisions — including whether to seek professional care, which treatment
              to pursue, and whether to take any medication — remain solely your responsibility in
              consultation with a licensed dental or medical professional.
            </p>
          </Section>

          <Section id="eligibility" title="4. User Eligibility">
            <ul>
              <li>
                You must be{' '}
                <strong className="font-semibold text-primary">18 years of age or older</strong> to
                use {BRAND.name} independently.
              </li>
              <li>
                Users between 13 and 17 may use the platform only under direct{' '}
                <strong className="font-semibold text-foreground">
                  parental or guardian supervision
                </strong>
                .
              </li>
              <li>Users under 13 are not permitted to use the platform.</li>
              <li>
                By using {BRAND.name}, you represent that you meet these eligibility requirements.
              </li>
            </ul>
          </Section>

          <Section id="user-responsibilities" title="5. User Responsibilities">
            <p>When using {BRAND.name}, you agree to:</p>
            <ul>
              <li>
                Provide{' '}
                <strong className="font-semibold text-foreground">
                  accurate and complete information
                </strong>{' '}
                about your symptoms, medical history, and medications to receive relevant guidance.
              </li>
              <li>
                <strong className="font-semibold text-primary">Not rely solely</strong> on
                AI-generated guidance for clinical decisions — always consult a licensed
                professional.
              </li>
              <li>
                Seek{' '}
                <strong className="font-semibold text-primary">immediate emergency care</strong>{' '}
                (call 112) for symptoms suggesting cardiac events, severe allergic reactions,
                uncontrolled bleeding, or airway obstruction, even if they initially appear dental
                in nature.
              </li>
              <li>
                Not use the platform for any{' '}
                <strong className="font-semibold text-foreground">
                  unlawful, fraudulent, or harmful purpose
                </strong>
                .
              </li>
              <li>
                Not attempt to reverse-engineer, extract, or scrape AI models, data, or proprietary
                systems.
              </li>
              <li>
                Not upload content that is illegal, abusive, defamatory, or violates the rights of
                others.
              </li>
            </ul>
          </Section>

          <Section id="account-access" title="6. Account &amp; Access">
            <ul>
              <li>
                You are responsible for maintaining the{' '}
                <strong className="font-semibold text-foreground">
                  confidentiality of your account credentials
                </strong>
                .
              </li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>
                We reserve the right to{' '}
                <strong className="font-semibold text-primary">suspend or terminate</strong>{' '}
                accounts that violate these Terms, without prior notice.
              </li>
              <li>
                Upon account termination, your personal data will be handled in accordance with our{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </li>
            </ul>
          </Section>

          <Section id="intellectual-property" title="7. Intellectual Property">
            <ul>
              <li>
                All content, design, code, AI models, branding, and technology comprising{' '}
                {BRAND.name} are the exclusive property of{' '}
                <strong className="font-semibold text-primary">{BRAND.legalName}</strong> and are
                protected under applicable intellectual property laws.
              </li>
              <li>
                Your consultation content belongs to you. We are granted a limited licence to
                process it solely for service delivery and improvement as described in our Privacy
                Policy.
              </li>
              <li>
                You may not copy, modify, distribute, sell, or lease any part of the platform or its
                content without our prior written consent.
              </li>
            </ul>
          </Section>

          <Section id="limitation-of-liability" title="8. Limitation of Liability">
            <p>To the maximum extent permitted by applicable Indian law:</p>
            <ul>
              <li>
                {BRAND.legalName} shall{' '}
                <strong className="font-semibold text-primary">not be liable</strong> for any
                direct, indirect, incidental, special, consequential, or punitive damages arising
                from your use of or inability to use the platform.
              </li>
              <li>
                We make <strong className="font-semibold text-primary">no warranty</strong>, express
                or implied, regarding the accuracy, completeness, reliability, or suitability of
                AI-generated guidance for any particular purpose.
              </li>
              <li>
                Our total aggregate liability for any claims arising from use of the platform shall
                not exceed <strong className="font-semibold text-primary">INR 5,000</strong> (Indian
                Rupees Five Thousand).
              </li>
            </ul>
            <InfoBox>
              This limitation of liability does not exclude or limit liability for fraud, gross
              negligence, or any liability that cannot be excluded under applicable Indian law.
            </InfoBox>
          </Section>

          <Section id="indemnification" title="9. Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless {BRAND.legalName}, its officers,
              directors, employees, and agents from any claims, damages, losses, liabilities, and
              expenses (including legal fees) arising from your use of the platform, violation of
              these Terms, or infringement of any third-party rights.
            </p>
          </Section>

          <Section id="third-party-services" title="10. Third-Party Services">
            <p>
              {BRAND.name} integrates with third-party services including AI model providers, cloud
              hosting, messaging platforms, and analytics tools. These services operate under their
              own terms and privacy policies. We are not responsible for the practices of
              third-party service providers beyond our contractual agreements with them.
            </p>
          </Section>

          <Section id="modifications" title="11. Modifications to Service &amp; Terms">
            <ul>
              <li>
                We reserve the right to{' '}
                <strong className="font-semibold text-foreground">
                  modify, suspend, or discontinue
                </strong>{' '}
                any aspect of the platform at any time without prior notice.
              </li>
              <li>
                We may update these Terms from time to time. Material changes will be communicated
                through the platform or email.
              </li>
              <li>Continued use after changes constitutes acceptance of revised Terms.</li>
              <li>
                The current version of these Terms will always be available at{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  datunai.com/terms
                </Link>
                .
              </li>
            </ul>
          </Section>

          <Section id="governing-law" title="12. Governing Law &amp; Jurisdiction">
            <p>
              These Terms are governed by and construed in accordance with the{' '}
              <strong className="font-semibold text-primary">laws of India</strong>. Any disputes
              arising from or related to these Terms or your use of {BRAND.name} shall be subject to
              the exclusive jurisdiction of the courts located in{' '}
              <strong className="font-semibold text-primary">New Delhi, India</strong>.
            </p>
          </Section>

          <Section id="severability" title="13. Severability">
            <p>
              If any provision of these Terms is found to be unenforceable or invalid by a court of
              competent jurisdiction, the remaining provisions shall continue in full force and
              effect. The unenforceable provision shall be modified to the minimum extent necessary
              to make it enforceable while preserving its intent.
            </p>
          </Section>

          <Section id="contact" title="14. Contact">
            <div className="rounded-lg bg-muted/50 p-5">
              <p className="mb-3 text-sm">
                <strong className="font-semibold text-foreground">
                  Questions About These Terms?
                </strong>
              </p>
              <p className="text-sm text-muted-foreground">
                {BRAND.legalName}
                <br />
                New Delhi, India
                <br />
                Email:{' '}
                <a
                  href={`mailto:${CONTACTS.supportEmail}`}
                  className="text-primary hover:underline"
                >
                  {CONTACTS.supportEmail}
                </a>
                <br />
                Phone: {CONTACTS.supportPhoneDisplay}
              </p>
            </div>
          </Section>
        </div>
      </article>
    </>
  );
}
