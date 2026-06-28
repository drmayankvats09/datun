// apps/web/components/home/sections/why-datun.tsx
import { getTranslations } from 'next-intl/server';
import { Container, Grid, Section } from '@repo/ui';
import { Check, Globe, Lock, Report, Scale, Shield, ShieldCheck, type SectionProps } from '../_shared';
import { COMPARE_ROWS } from '../data';

const POINTS = [
  {
    icon: <Shield />,
    h: 'Every dentist is verified',
    p: 'We primary-source-check credentials before any clinic joins.',
  },
  {
    icon: <ShieldCheck />,
    h: 'Dentist-backed assessments',
    p: 'Every assessment follows protocols written and reviewed by practising dentists.',
  },
  {
    icon: <Lock />,
    h: 'Your data stays yours',
    p: 'Encrypted, consent-logged, deletable any time, fully DPDP 2023 compliant.',
  },
  {
    icon: <Scale />,
    h: 'Honest about scope',
    p: "A remote check can't fully replace an in-person exam, so we always tell you when to see someone.",
  },
  {
    icon: <Globe />,
    h: 'Care in your language',
    p: 'Ask in any language you speak. Datun understands you and gives your assessment back in your own language.',
  },
  {
    icon: <Report />,
    h: 'A report you keep',
    p: 'Every consult gives you a clear, dentist-backed report. Yours to keep, share, or take to any dentist.',
  },
];

/**
 * Why Datun + honest comparison. One h2 (the trust thesis); the comparison is a
 * labelled h3 sub-region. The comparison is a generic, non-disparaging industry
 * contrast (ASCI-safe) and reads as self-contained rows for GEO. On mobile each
 * criterion is its own card; md+ collapses into an aligned table (home.css).
 */
export async function WhyDatun({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const head = t('home.comparison.head');
  const headDatun = t('home.comparison.headDatun');
  return (
    <Section className="dtn-band--bordered">
      <Container>
        <div className="dtn-head">
          <span className="eyebrow">{t('home.why.eyebrow')}</span>
          <h2 className="sh">
            {t('home.why.title1')}
            <em>{t('home.why.title2')}</em>
          </h2>
        </div>

        <Grid min="18rem" gap="32" style={{ marginTop: 'var(--space-40)' }}>
          {POINTS.map((pt, i) => (
            <div className="why__pt" key={i}>
              <span className="ic">{pt.icon}</span>
              <div>
                <h3>{pt.h}</h3>
                <p>{pt.p}</p>
              </div>
            </div>
          ))}
        </Grid>

        <div className="dtn-head" style={{ marginTop: 'var(--space-56)' }}>
          <span className="eyebrow">{t('home.comparison.eyebrow')}</span>
          <h3 className="sh">{t('home.comparison.title')}</h3>
        </div>
        <div className="cmp">
          <div className="cmp__head" aria-hidden="true">
            <div className="cmp__c" />
            <div className="cmp__c">{head}</div>
            <div className="cmp__c cmp__c--datun">{headDatun}</div>
          </div>
          {COMPARE_ROWS.map((r, i) => (
            <div className="cmp__row" key={i}>
              <div className="cmp__k">{r.k}</div>
              <div className="cmp__opts">
                <div className="cmp__c">
                  <span className="cmp__lbl">{head}</span>
                  <span className="cmp__no">{r.no}</span>
                </div>
                <div className="cmp__c cmp__c--datun">
                  <span className="cmp__lbl">{headDatun}</span>
                  <span className="cmp__yes">
                    <Check />
                    {r.yes}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
