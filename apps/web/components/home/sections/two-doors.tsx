// apps/web/components/home/sections/two-doors.tsx
import { getTranslations } from 'next-intl/server';
import { Container, Grid, Section } from '@repo/ui';
import { Chat, Pin, lp, type SectionProps } from '../_shared';

const DOORS = {
  ask: {
    title: 'Not sure? Ask Datun',
    body: "Describe it, get a dentist-backed assessment plus a report, then medicine or a verified clinic. Best when something hurts and you're unsure.",
  },
  find: {
    title: 'Know what you need? Find and book',
    body: 'Search verified dentists and book directly: cleaning, RCT, aligners, and more. No consult step required.',
  },
} as const;

/** Two doors — ask Datun, or find and book directly. The core dual-entry brand
 *  element. The second card carries id="find" (header + footer anchor target). */
export async function TwoDoors({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <Section className="dtn-band--warm dtn-band--bordered">
      <Container>
        <div className="dtn-head">
          <span className="eyebrow">{t('home.doors.eyebrow')}</span>
          <h2 className="sh">{t('home.doors.title')}</h2>
        </div>
        <Grid min="20rem" gap="20" style={{ marginTop: 'var(--space-40)' }}>
          <div className="dtn-card dtn-card--elevated door">
            <div className="imgph" aria-hidden="true" />
            <div className="door__in">
              <div className="door__ic">
                <Chat />
              </div>
              <h3>{DOORS.ask.title}</h3>
              <p>{DOORS.ask.body}</p>
              <a className="dtn-btn dtn-btn--primary dtn-btn--md" href={lp(locale, '/consult')}>
                {t('home.cta.ask')}
              </a>
            </div>
          </div>
          <div className="dtn-card dtn-card--elevated door">
            <div className="imgph" aria-hidden="true" />
            <div className="door__in">
              <div className="door__ic">
                <Pin />
              </div>
              <h3>{DOORS.find.title}</h3>
              <p>{DOORS.find.body}</p>
              <a className="dtn-btn dtn-btn--secondary dtn-btn--md" href="#find">
                {t('home.cta.find')}
              </a>
            </div>
          </div>
        </Grid>
      </Container>
    </Section>
  );
}
