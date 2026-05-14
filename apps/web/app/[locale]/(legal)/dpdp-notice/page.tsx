// apps/web/app/[locale]/(legal)/dpdp-notice/page.tsx
// ═══════════════════════════════════════════════════════════════
// DPDP ACT NOTICE — Digital Personal Data Protection Act 2023 notice
// Task #45 (CSP): JSON-LD <script> is non-executable data; no nonce/hash needed.
// ═══════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { BRAND, CONTACTS } from '@repo/shared';
import {
  Section,
  LegalHeader,
  HumanSummary,
  SummaryItem,
  RightCard,
} from '@/components/legal/legal-components';

export const metadata: Metadata = {
  title: 'DPDP Act Notice',
  description: `${BRAND.name}'s notice under the Digital Personal Data Protection Act, 2023. Your rights as a Data Principal.`,
  alternates: { canonical: '/dpdp-notice' },
};

export default function DpdpNoticePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'DPDP Act Notice',
    description: `${BRAND.name}'s notice under the Digital Personal Data Protection Act, 2023.`,
    url: 'https://datunai.com/dpdp-notice',
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
          title="DPDP Act Notice"
          subtitle="Digital Personal Data Protection Act, 2023"
          lastUpdated="April 23, 2026"
          contactEmail={CONTACTS.supportEmail}
        />

        <HumanSummary>
          <SummaryItem>
            You are a <strong className="font-semibold text-primary">Data Principal</strong> — your
            personal data belongs to you.
          </SummaryItem>
          <SummaryItem>
            You have the right to{' '}
            <strong className="font-semibold text-primary">access, correct, erase, and port</strong>{' '}
            your personal data.
          </SummaryItem>
          <SummaryItem>
            You can{' '}
            <strong className="font-semibold text-primary">withdraw consent at any time</strong> —
            we will stop processing your data.
          </SummaryItem>
          <SummaryItem>
            You can file a <strong className="font-semibold text-primary">grievance with us</strong>{' '}
            or with the Data Protection Board of India.
          </SummaryItem>
          <SummaryItem>
            Your health data is treated as{' '}
            <strong className="font-semibold text-primary">sensitive personal data</strong> with
            enhanced protections.
          </SummaryItem>
        </HumanSummary>

        <div>
          <Section id="about-notice" title="1. About This Notice">
            <p>
              This notice is issued pursuant to the{' '}
              <strong className="font-semibold text-primary">
                Digital Personal Data Protection Act, 2023
              </strong>{' '}
              (DPDP Act) enacted by the Parliament of India. It explains how {BRAND.legalName}{' '}
              processes your personal data, your rights as a Data Principal, and how to exercise
              those rights.
            </p>
            <p>
              This notice should be read in conjunction with our{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>
              , which provide additional detail on data handling practices.
            </p>
          </Section>

          <Section id="data-fiduciary" title="2. Data Fiduciary Information">
            <div className="rounded-lg bg-muted/50 p-5">
              <p className="text-sm text-muted-foreground">
                <strong className="font-semibold text-foreground">Data Fiduciary:</strong>{' '}
                {BRAND.legalName}
                <br />
                <strong className="font-semibold text-foreground">Registered Address:</strong> New
                Delhi, India
                <br />
                <strong className="font-semibold text-foreground">Contact Email:</strong>{' '}
                <a
                  href={`mailto:${CONTACTS.supportEmail}`}
                  className="text-primary hover:underline"
                >
                  {CONTACTS.supportEmail}
                </a>
                <br />
                <strong className="font-semibold text-foreground">Phone:</strong>{' '}
                {CONTACTS.supportPhoneDisplay}
                <br />
                <strong className="font-semibold text-foreground">
                  Founder &amp; Data Protection Officer:
                </strong>{' '}
                Dr. Mayank Vats, BDS
              </p>
            </div>
            <p className="mt-4">
              Under the DPDP Act, {BRAND.legalName} is the{' '}
              <strong className="font-semibold text-primary">Data Fiduciary</strong> — the entity
              that determines the purpose and means of processing your personal data. As a platform
              handling health-related information, we implement enhanced safeguards appropriate to
              the sensitivity of the data we process.
            </p>
          </Section>

          <Section id="categories-of-data" title="3. Categories of Personal Data Processed">
            <p>We process the following categories of personal data:</p>
            <ul>
              <li>
                <strong className="font-semibold text-foreground">Identity Data</strong> — name,
                email address, phone number, age, gender.
              </li>
              <li>
                <strong className="font-semibold text-foreground">Health Data (Sensitive)</strong> —
                dental symptoms, medical history, current medications, known allergies, pregnancy
                status, dental photographs. This data receives{' '}
                <strong className="font-semibold text-primary">enhanced protection</strong> as
                sensitive personal data.
              </li>
              <li>
                <strong className="font-semibold text-foreground">Authentication Data</strong> —
                hashed passwords, OAuth tokens, session identifiers.
              </li>
              <li>
                <strong className="font-semibold text-foreground">Communication Data</strong> —
                consultation messages, support correspondence, WhatsApp interactions.
              </li>
              <li>
                <strong className="font-semibold text-foreground">Technical Data</strong> — device
                type, browser information, IP address (anonymised), and access logs for security
                monitoring.
              </li>
            </ul>
          </Section>

          <Section id="purpose-of-processing" title="4. Purpose of Processing">
            <p>Your personal data is processed for the following specific, stated purposes:</p>
            <div className="my-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left font-semibold">Purpose</th>
                    <th className="px-4 py-3 text-left font-semibold">Data Categories</th>
                    <th className="px-4 py-3 text-left font-semibold">Legal Basis</th>
                  </tr>
                </thead>
                <tbody className="text-foreground/80">
                  <tr className="border-b border-border">
                    <td className="px-4 py-3">AI dental health guidance</td>
                    <td className="px-4 py-3">Health, Identity</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary">Consent</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3">Account creation &amp; authentication</td>
                    <td className="px-4 py-3">Identity, Authentication</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary">Consent</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3">Follow-up &amp; appointment reminders</td>
                    <td className="px-4 py-3">Identity, Communication</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary">Consent</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3">AI model improvement (anonymised)</td>
                    <td className="px-4 py-3">Anonymised Health Data</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary">Legitimate Use</span>
                    </td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-3">Platform security &amp; abuse prevention</td>
                    <td className="px-4 py-3">Technical</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary">Legitimate Use</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Legal compliance</td>
                    <td className="px-4 py-3">All (as required)</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary">Legal Obligation</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="your-rights" title="5. Your Rights as Data Principal">
            <p>
              Under{' '}
              <strong className="font-semibold text-primary">
                Chapter III of the DPDP Act, 2023
              </strong>
              , you have the following enforceable rights:
            </p>

            <RightCard
              icon="📋"
              title="Right to Access (Section 11)"
              description="You may request a summary of your personal data being processed by us, along with the identities of all Data Processors and Data Fiduciaries with whom your data has been shared."
            />
            <RightCard
              icon="✏️"
              title="Right to Correction &amp; Erasure (Section 12)"
              description="You may request correction of inaccurate or misleading personal data, completion of incomplete data, updating of outdated data, or complete erasure of your personal data (subject to legal retention requirements)."
            />
            <RightCard
              icon="🔕"
              title="Right to Withdraw Consent (Section 6(6))"
              description="You may withdraw consent for any or all purposes at any time. Upon withdrawal, we will cease processing the relevant data. Withdrawal does not affect the lawfulness of processing performed before withdrawal."
            />
            <RightCard
              icon="📢"
              title="Right to Grievance Redressal (Section 13)"
              description="You may raise a grievance with our Data Protection Officer. If unsatisfied with our response within 30 days, you may file a complaint with the Data Protection Board of India."
            />
            <RightCard
              icon="👤"
              title="Right to Nominate (Section 14)"
              description="You may nominate another individual to exercise your data rights in the event of your death or incapacity. Nomination can be submitted in writing to our Data Protection Officer."
            />

            <p className="mt-4">
              To exercise any of these rights, email{' '}
              <a
                href={`mailto:${CONTACTS.supportEmail}`}
                className="font-semibold text-primary hover:underline"
              >
                {CONTACTS.supportEmail}
              </a>{' '}
              with the subject line &quot;DPDP Rights Request&quot;. Include your registered email
              address and the specific right(s) you wish to exercise. We will acknowledge receipt
              within <strong className="font-semibold text-primary">48 hours</strong> and fulfil
              valid requests within <strong className="font-semibold text-primary">30 days</strong>.
            </p>
          </Section>

          <Section id="consent-management" title="6. Consent Management">
            <ul>
              <li>
                Consent is obtained at the{' '}
                <strong className="font-semibold text-foreground">point of data collection</strong>{' '}
                — when you create an account, begin a consultation, or upload dental photographs.
              </li>
              <li>
                Consent is{' '}
                <strong className="font-semibold text-primary">
                  specific, informed, and unambiguous
                </strong>
                . We describe what data we collect and why before you provide consent.
              </li>
              <li>
                Consent records are{' '}
                <strong className="font-semibold text-foreground">timestamped and stored</strong> as
                part of your account for audit purposes.
              </li>
              <li>
                You can{' '}
                <strong className="font-semibold text-primary">withdraw consent at any time</strong>{' '}
                by contacting {CONTACTS.supportEmail} or through your account settings.
              </li>
            </ul>
          </Section>

          <Section id="data-breach" title="7. Data Breach Notification">
            <p>In the event of a personal data breach that is likely to cause harm to you:</p>
            <ul>
              <li>
                We will notify the{' '}
                <strong className="font-semibold text-primary">
                  Data Protection Board of India
                </strong>{' '}
                as mandated by the DPDP Act.
              </li>
              <li>
                We will notify{' '}
                <strong className="font-semibold text-primary">
                  affected Data Principals (you)
                </strong>{' '}
                without unreasonable delay, and in any case within{' '}
                <strong className="font-semibold text-primary">72 hours</strong> of becoming aware
                of the breach.
              </li>
              <li>
                Notification will include: nature of the breach, data categories affected, likely
                consequences, and remedial measures taken or proposed.
              </li>
            </ul>
          </Section>

          <Section id="duties-of-data-principal" title="8. Your Duties as Data Principal">
            <p>
              Under{' '}
              <strong className="font-semibold text-primary">Section 15 of the DPDP Act</strong>,
              Data Principals also have certain duties:
            </p>
            <ul>
              <li>
                Provide{' '}
                <strong className="font-semibold text-foreground">
                  accurate and complete information
                </strong>{' '}
                when sharing personal data with us.
              </li>
              <li>
                Do not{' '}
                <strong className="font-semibold text-foreground">
                  impersonate another person
                </strong>{' '}
                or provide false identity information.
              </li>
              <li>
                Do not{' '}
                <strong className="font-semibold text-foreground">
                  file frivolous or false complaints
                </strong>{' '}
                with the Data Protection Board.
              </li>
              <li>
                Do not{' '}
                <strong className="font-semibold text-foreground">
                  suppress material information
                </strong>{' '}
                when exercising data rights.
              </li>
            </ul>
          </Section>

          <Section id="grievance-redressal" title="9. Grievance Redressal Mechanism">
            <div className="rounded-lg bg-muted/50 p-5">
              <p className="text-sm">
                <strong className="font-semibold text-foreground">Step 1:</strong> Contact our Data
                Protection Officer
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Email:{' '}
                <a
                  href={`mailto:${CONTACTS.supportEmail}`}
                  className="text-primary hover:underline"
                >
                  {CONTACTS.supportEmail}
                </a>
                <br />
                Subject: &quot;DPDP Grievance&quot;
                <br />
                Response: Within 30 days
              </p>
              <div className="my-4 border-t border-border" />
              <p className="text-sm">
                <strong className="font-semibold text-foreground">Step 2:</strong> Data Protection
                Board of India
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                If unsatisfied with our response, you may file a complaint with the Data Protection
                Board of India as constituted under Section 18 of the DPDP Act, 2023.
              </p>
            </div>
          </Section>

          <Section id="changes" title="10. Changes to This Notice">
            <p>
              This notice may be updated to reflect changes in our data processing activities,
              applicable law, or regulatory guidance. Material changes will be communicated through
              the platform and, where appropriate, via email to registered users. The current
              version will always be available at{' '}
              <Link href="/dpdp-notice" className="text-primary hover:underline">
                datunai.com/dpdp-notice
              </Link>
              .
            </p>
          </Section>
        </div>
      </article>
    </>
  );
}
