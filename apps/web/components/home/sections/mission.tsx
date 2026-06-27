// apps/web/components/home/sections/mission.tsx
import { getTranslations } from 'next-intl/server';
import { Container, Section } from '@repo/ui';
import { type SectionProps } from '../_shared';

/** Mission — three deliberate centered lines beneath a soft glow. */
export async function Mission({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <Section className="dtn-glow dtn-band--teal dtn-band--bordered">
      <Container>
        <div className="mission dtn-head">
          <span className="eyebrow">{t('home.mission.eyebrow')}</span>
          <div className="mission__lines">
            <p className="mission__line mission__line--1">{t('home.mission.line1')}</p>
            <p className="mission__line mission__line--2">{t('home.mission.line2')}</p>
            <p className="mission__line mission__line--3">{t('home.mission.line3')}</p>
          </div>
          <span className="mission__est">{t('home.mission.est')}</span>
        </div>
      </Container>
    </Section>
  );
}
