// apps/web/components/home/sections/final-cta.tsx
import { getTranslations } from 'next-intl/server';
import { Container, Section } from '@repo/ui';
import { lp, type SectionProps } from '../_shared';

/** Final CTA — teal gradient band with an inverse, high-contrast call to action. */
export async function FinalCta({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <Section>
      <Container>
        <div className="band">
          <div className="band__glow" aria-hidden="true" />
          <h2>
            {t('home.finalCta.title1')}
            <br />
            {t('home.finalCta.title2')}
          </h2>
          <p>{t('home.finalCta.desc')}</p>
          <a className="dtn-btn dtn-btn--lg band__cta" href={lp(locale, '/consult')}>
            {t('home.finalCta.cta')}
          </a>
        </div>
      </Container>
    </Section>
  );
}
