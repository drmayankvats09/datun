// apps/web/components/home/sections/dental-tourism.tsx
import { getTranslations } from 'next-intl/server';
import { Container, Section } from '@repo/ui';
import { Check, lp, type SectionProps } from '../_shared';

/** Dental tourism — a calm, two-up band inviting a treatment estimate. The
 *  estimate begins in the consult on-ramp; the dedicated estimate flow is Task #56. */
export async function DentalTourism({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <Section id="tourism" className="dtn-band--bordered">
      <Container>
        <div className="tourism dtn-head">
          <span className="eyebrow">{t('home.tourism.eyebrow')}</span>
          <h2 className="sh">{t('home.tourism.title')}</h2>
          <p className="lede">{t('home.tourism.desc')}</p>
          <ul className="tourism__points">
            <li>
              <Check />
              {t('home.tourism.point1')}
            </li>
            <li>
              <Check />
              {t('home.tourism.point2')}
            </li>
            <li>
              <Check />
              {t('home.tourism.point3')}
            </li>
          </ul>
          <a className="dtn-btn dtn-btn--primary dtn-btn--lg" href={lp(locale, '/consult')}>
            {t('home.cta.estimate')}
          </a>
        </div>
      </Container>
    </Section>
  );
}
