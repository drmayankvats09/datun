// apps/web/components/home/sections/patient-reviews.tsx
import { getTranslations } from 'next-intl/server';
import { Container, Section } from '@repo/ui';
import type { SectionProps } from '../_shared';
import { REVIEWS } from '../data';
import { ReviewsCarousel } from './reviews-carousel';

/**
 * Patient reviews — RSC shell (eyebrow, heading, consent) around the accessible
 * client carousel. The 12 reviews are real, founder-provided v1 data (all 5
 * stars, consented); their authentic Hinglish voice is preserved verbatim.
 */
export async function PatientReviews({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <Section className="dtn-band--warm dtn-band--bordered">
      <Container>
        <div className="dtn-head">
          <span className="eyebrow">{t('home.reviews.eyebrow')}</span>
          <h2 className="sh">{t('home.reviews.title')}</h2>
        </div>
        <div style={{ marginTop: 'var(--space-40)' }}>
          <ReviewsCarousel
            reviews={REVIEWS}
            labels={{
              region: t('home.reviews.title'),
              prev: t('home.reviews.prevLabel'),
              next: t('home.reviews.nextLabel'),
              pageTemplate: t.raw('home.reviews.pageLabel') as string,
              rating: t('home.reviews.ratingLabel'),
            }}
          />
        </div>
        <p
          className="dtn-head"
          style={{
            marginTop: 'var(--space-24)',
            font: 'var(--type-caption)',
            color: 'var(--color-text-faint)',
          }}
        >
          {t('home.reviews.consent')}
        </p>
      </Container>
    </Section>
  );
}
