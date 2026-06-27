// apps/web/components/home/sections/how-it-works.tsx
import { getTranslations } from 'next-intl/server';
import { Container, Grid, Section } from '@repo/ui';
import { Chat, Pin, Report, lp, type SectionProps } from '../_shared';
const STEPS = [
  {
    icon: <Chat />,
    h: 'Describe it',
    p: "Tell Datun what's bothering you, in your own words, any hour.",
  },
  {
    icon: <Report />,
    h: 'Get a dentist-backed assessment',
    p: 'A clear, medically-reviewed read, plus a report you keep.',
  },
  {
    icon: <Pin />,
    h: 'Get care',
    p: 'Medicine in your consult, or a verified dentist booked nearby.',
  },
];
/** How it works — three calm steps. */
export async function HowItWorks({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <Section id="how" className="dtn-band--teal dtn-band--bordered">
      <Container>
        <div className="dtn-head">
          <span className="eyebrow">{t('home.how.eyebrow')}</span>
          <h2 className="sh">
            {t('home.how.title1')}
            <em>{t('home.how.title2')}</em>
          </h2>
        </div>
        <Grid min="15rem" gap="24" style={{ marginTop: 'var(--space-40)' }}>
          {STEPS.map((s, i) => (
            <div className="step" key={i}>
              <div className="step__n">{i + 1}</div>
              <span className="step__ic">{s.icon}</span>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </Grid>
        <div className="dtn-head" style={{ marginTop: 'var(--space-40)' }}>
          <a className="dtn-btn dtn-btn--primary dtn-btn--lg" href={lp(locale, '/consult')}>
            {t('home.cta.ask')}
          </a>
        </div>
      </Container>
    </Section>
  );
}
