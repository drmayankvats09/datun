import type { Metadata } from 'next';
import Link from 'next/link';
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
  title: 'Privacy Policy',
  description: `How ${BRAND.name} collects, uses, and protects your personal and health data. DPDP Act 2023 compliant.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Privacy Policy',
    description: `How ${BRAND.name} collects, uses, and protects your personal and health data.`,
    url: 'https://datunai.com/privacy',
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
          title="Privacy Policy"
          lastUpdated="April 23, 2026"
          contactEmail={CONTACTS.supportEmail}
        />

        <HumanSummary>
          <SummaryItem>
            We collect{' '}
            <strong className="text-primary font-semibold">
              only the health data you voluntarily share
            </strong>{' '}
            — symptoms, age, gender, medications, and dental photos.
          </SummaryItem>
          <SummaryItem>
            Your data is used <strong className="text-primary font-semibold">exclusively</strong> to
            generate AI-powered dental guidance. We do not advertise. We do not sell data. We never
            will.
          </SummaryItem>
          <SummaryItem>
            All data is{' '}
            <strong className="text-primary font-semibold">encrypted in transit (TLS 1.3)</strong>{' '}
            and at rest. Health data is treated as sensitive personal data under DPDP Act 2023.
          </SummaryItem>
          <SummaryItem>
            You can <strong className="text-primary font-semibold">request deletion</strong> of all
            your personal data at any time by emailing {CONTACTS.supportEmail}.
          </SummaryItem>
          <SummaryItem>
            AI provides{' '}
            <strong className="text-primary font-semibold">guidance, not diagnosis</strong>. Always
            consult a licensed dental professional for clinical decisions.
          </SummaryItem>
        </HumanSummary>

        <div>
          <Section id="who-we-are" title="1. Who We Are">
            <p>
              <strong className="text-primary font-semibold">{BRAND.legalName}</strong> (&quot;
              {BRAND.name},&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates an{' '}
              <strong className="text-primary font-semibold">
                AI-powered dental health platform
              </strong>{' '}
              accessible at{' '}
              <a href="https://datunai.com" className="text-primary hover:underline">
                datunai.com
              </a>{' '}
              and associated applications. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our platform.
            </p>
            <p>
              We are committed to complete transparency about how we handle your personal data. If
              you have questions after reading this policy, contact our Data Protection Officer at{' '}
              <a href={`mailto:${CONTACTS.supportEmail}`} className="text-primary hover:underline">
                {CONTACTS.supportEmail}
              </a>
              .
            </p>
          </Section>

          <Section id="what-we-collect" title="2. What We Collect">
            <p>
              We collect only what you voluntarily provide during the course of using our services:
            </p>
            <ul>
              <li>
                <strong className="text-foreground font-semibold">Health Information</strong> —
                symptoms, age, gender, medical history, current medications, known allergies, and
                pregnancy status as shared during your AI-guided dental consultation.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Dental Photographs</strong> —
                images you optionally upload for visual evaluation by our AI system.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Conversation Content</strong> —
                messages exchanged during your consultation, used solely to generate your
                personalised assessment.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Account Information</strong> —
                name, email address, phone number, and authentication credentials when you create an
                account.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Usage Analytics</strong> —
                anonymised interaction data (page views, session duration, device type) through
                privacy-respecting analytics. No personally identifiable information is collected
                through analytics.
              </li>
            </ul>
            <p>
              We do <strong className="text-primary font-semibold">not</strong> collect financial
              information, government identification numbers, or biometric data beyond dental
              photographs you voluntarily upload.
            </p>
          </Section>

          <Section id="how-we-use" title="3. How We Use Your Data">
            <p>Your data is processed exclusively for the following purposes:</p>
            <ul>
              <li>
                <strong className="text-foreground font-semibold">Service Delivery</strong> —
                generating AI-powered dental health guidance tailored to your symptoms and medical
                context.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Consultation Records</strong> —
                maintaining your consultation history for continuity of care when you return.
              </li>
              <li>
                <strong className="text-foreground font-semibold">AI Improvement</strong> —
                improving our AI models using anonymised and aggregated data only. Individual health
                records are never used in model training without explicit separate consent.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Safety &amp; Compliance</strong> —
                fulfilling legal obligations, preventing misuse, and ensuring platform security.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Communication</strong> — sending
                appointment reminders, follow-up messages, and service updates through WhatsApp or
                email, only with your consent.
              </li>
            </ul>
            <InfoBox>
              We do <strong>not</strong> use your data for advertising. We do <strong>not</strong>{' '}
              sell your personal or health data to any third party. We never will.
            </InfoBox>
          </Section>

          <Section id="legal-basis" title="4. Legal Basis for Processing">
            <p>
              Under the{' '}
              <strong className="text-primary font-semibold">
                Digital Personal Data Protection Act, 2023
              </strong>{' '}
              (DPDP Act), we process your data on the following lawful bases:
            </p>
            <ul>
              <li>
                <strong className="text-foreground font-semibold">Consent</strong> — you provide
                explicit consent when you begin a consultation, create an account, or upload dental
                photographs.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Legitimate Use</strong> —
                processing necessary to provide the service you have requested.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Legal Obligation</strong> —
                compliance with applicable Indian law, including data protection and healthcare
                regulations.
              </li>
            </ul>
            <p>
              You may{' '}
              <strong className="text-primary font-semibold">withdraw consent at any time</strong>{' '}
              by contacting us at{' '}
              <a href={`mailto:${CONTACTS.supportEmail}`} className="text-primary hover:underline">
                {CONTACTS.supportEmail}
              </a>
              . Withdrawal of consent does not affect the lawfulness of processing performed prior
              to withdrawal.
            </p>
          </Section>

          <Section id="ai-transparency" title="5. AI Transparency &amp; Limitations">
            <WarnBox>
              {BRAND.name} uses artificial intelligence to provide dental health guidance. AI is{' '}
              <strong>assistive only</strong> — it does not replace a licensed dental professional.
              AI-generated assessments may contain inaccuracies. Always seek in-person clinical
              evaluation for treatment decisions.
            </WarnBox>
            <ul>
              <li>
                Our AI models are developed and maintained by licensed dental professionals working
                in collaboration with AI engineers.
              </li>
              <li>
                AI responses are based on the information you provide. Incomplete or inaccurate
                input may lead to less relevant guidance.
              </li>
              <li>
                We employ a{' '}
                <strong className="text-foreground font-semibold">
                  multi-provider AI architecture
                </strong>{' '}
                with built-in safety checks to ensure clinical accuracy and minimise errors.
              </li>
              <li>
                AI-generated guidance undergoes continuous clinical review and improvement cycles.
              </li>
              <li>
                We do not use your identifiable health data for AI model training. Only anonymised,
                aggregated patterns may be used, and only with appropriate safeguards.
              </li>
            </ul>
          </Section>

          <Section id="data-sharing" title="6. Data Sharing &amp; Third Parties">
            <p>We share your data only in the following limited circumstances:</p>
            <ul>
              <li>
                <strong className="text-foreground font-semibold">AI Service Providers</strong> —
                your consultation messages are processed by our AI providers (Anthropic, OpenAI,
                Google) under strict data processing agreements. These providers do not retain or
                train on your data.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Infrastructure Providers</strong>{' '}
                — hosting (Railway, Vercel), database (PostgreSQL), monitoring (Sentry), and
                communication (WhatsApp Business API, Resend) providers process data as necessary to
                operate the platform.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Legal Requirements</strong> — if
                required by law, regulation, or valid legal process such as a court order.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Safety</strong> — if we believe in
                good faith that disclosure is necessary to prevent imminent harm to health or
                safety.
              </li>
            </ul>
            <p>
              We do <strong className="text-primary font-semibold">not</strong> share your personal
              health data with advertisers, data brokers, marketing companies, or any entity seeking
              to use your data for commercial purposes beyond providing our service.
            </p>
          </Section>

          <Section id="data-security" title="7. Data Security">
            <ul>
              <li>
                <strong className="text-foreground font-semibold">Encryption in Transit</strong> —
                all data transmitted between your device and our servers is encrypted using{' '}
                <strong className="text-primary font-semibold">TLS 1.3</strong> with HSTS
                enforcement.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Encryption at Rest</strong> —
                database-level encryption protects stored data.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Access Controls</strong> —
                role-based access control (RBAC) limits data access to authorised personnel only.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Password Security</strong> —
                passwords are hashed using bcrypt with per-user salts. We never store plaintext
                passwords.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Infrastructure</strong> — DDoS
                protection, bot detection, web application firewall (WAF), and rate limiting are
                active across all endpoints.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Monitoring</strong> — automated
                error tracking, security scanning, and dependency auditing are performed
                continuously.
              </li>
            </ul>
            <p>
              While we implement industry-standard security measures, no system is completely immune
              to breaches. In the event of a data breach affecting your personal data, we will
              notify you and the relevant authorities within{' '}
              <strong className="text-primary font-semibold">72 hours</strong> as required by law.
            </p>
          </Section>

          <Section id="data-retention" title="8. Data Retention">
            <ul>
              <li>
                <strong className="text-foreground font-semibold">Consultation Data</strong> —
                retained for 24 months from the date of consultation to support continuity of care.
                You may request earlier deletion at any time.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Account Data</strong> — retained
                for as long as your account is active. Upon account deletion, personal data is
                erased within 30 days.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Anonymised Data</strong> —
                aggregated, de-identified data may be retained indefinitely for service improvement
                and public health research.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Legal Holds</strong> — data
                subject to legal obligations or disputes may be retained beyond standard retention
                periods as required by law.
              </li>
            </ul>
          </Section>

          <Section id="your-rights" title="9. Your Rights Under DPDP Act 2023">
            <p>
              As a <strong className="text-primary font-semibold">Data Principal</strong> under the
              Digital Personal Data Protection Act, 2023, you have the following rights:
            </p>
            <ul>
              <li>
                <strong className="text-foreground font-semibold">Right to Access</strong> — request
                a copy of all personal data we hold about you.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Right to Correction</strong> —
                request correction of inaccurate or incomplete personal data.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Right to Erasure</strong> —
                request complete deletion of your personal data, subject to legal retention
                requirements.
              </li>
              <li>
                <strong className="text-foreground font-semibold">Right to Withdraw Consent</strong>{' '}
                — withdraw previously given consent at any time.
              </li>
              <li>
                <strong className="text-foreground font-semibold">
                  Right to Grievance Redressal
                </strong>{' '}
                — file a complaint with us or with the{' '}
                <strong className="text-primary font-semibold">
                  Data Protection Board of India
                </strong>
                .
              </li>
              <li>
                <strong className="text-foreground font-semibold">Right to Nominate</strong> —
                nominate another individual to exercise your data rights in the event of your death
                or incapacity.
              </li>
            </ul>
            <p>
              To exercise any of these rights, email{' '}
              <a href={`mailto:${CONTACTS.supportEmail}`} className="text-primary hover:underline">
                {CONTACTS.supportEmail}
              </a>
              . We will respond within{' '}
              <strong className="text-primary font-semibold">30 days</strong> of receiving your
              request.
            </p>
            <p>
              For full details of your rights and our obligations, see our{' '}
              <Link href="/dpdp-notice" className="text-primary hover:underline">
                DPDP Act Notice
              </Link>
              .
            </p>
          </Section>

          <Section id="children" title="10. Children's Privacy">
            <p>
              {BRAND.name} is not intended for use by individuals under the age of{' '}
              <strong className="text-primary font-semibold">18</strong> without parental or
              guardian supervision. We do not knowingly collect personal data from children without
              verifiable parental consent. If you believe a child has provided us personal data
              without appropriate consent, contact us immediately at{' '}
              <a href={`mailto:${CONTACTS.supportEmail}`} className="text-primary hover:underline">
                {CONTACTS.supportEmail}
              </a>{' '}
              and we will delete such data promptly.
            </p>
          </Section>

          <Section id="international-transfers" title="11. International Data Transfers">
            <p>
              Your data is primarily stored on servers located in{' '}
              <strong className="text-primary font-semibold">India</strong>. However, certain
              service providers (AI model providers, cloud infrastructure) may process data in
              jurisdictions outside India. In such cases, we ensure adequate data protection through
              contractual safeguards, including standard data processing agreements that meet the
              requirements of the DPDP Act 2023.
            </p>
          </Section>

          <Section id="cookies" title="12. Cookies &amp; Tracking">
            <p>
              We use essential cookies for authentication and session management. For full details,
              see our{' '}
              <Link href="/cookies" className="text-primary hover:underline">
                Cookie Policy
              </Link>
              .
            </p>
          </Section>

          <Section id="changes" title="13. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect changes in our
              practices, technology, legal requirements, or other factors. When we make material
              changes, we will notify you by posting the updated policy on this page with a revised
              &quot;Last updated&quot; date and, where appropriate, through email or in-app
              notification.
            </p>
            <p>
              Your continued use of {BRAND.name} after changes are posted constitutes acceptance of
              the revised policy.
            </p>
          </Section>

          <Section id="contact" title="14. Contact &amp; Grievance Officer">
            <div className="bg-muted/50 rounded-lg p-5">
              <p className="mb-3 text-sm">
                <strong className="text-foreground font-semibold">
                  Data Protection Officer &amp; Grievance Officer
                </strong>
              </p>
              <p className="text-muted-foreground text-sm">
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
                <br />
                Response time: Within 30 days of receipt.
              </p>
            </div>
            <p className="mt-4">
              If you are not satisfied with our response, you may file a complaint with the{' '}
              <strong className="text-primary font-semibold">Data Protection Board of India</strong>{' '}
              as established under the DPDP Act 2023.
            </p>
          </Section>
        </div>
      </article>
    </>
  );
}
