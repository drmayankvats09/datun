// apps/web/components/home/sections/verified-dentists.tsx
import { getTranslations } from 'next-intl/server';
import { Container, Grid, Section } from '@repo/ui';
import { Pin, lp, type SectionProps } from '../_shared';
import { CITIES } from '../data';

/** Verified dentists near you — the on-page "find a dentist" destination
 *  (id="find"). Each city card starts a consult (the live on-ramp that routes to
 *  a verified clinic). Per-city directory pages are Task #56. */
export async function VerifiedDentists({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <Section id="find" className="dtn-band--warm dtn-band--bordered">
      <Container>
        <div className="dtn-head">
          <span className="eyebrow">{t('home.cities.eyebrow')}</span>
          <h2 className="sh">{t('home.cities.title')}</h2>
          <p className="lede">{t('home.cities.lede')}</p>
        </div>
        <Grid min="14rem" gap="16" style={{ marginTop: 'var(--space-40)' }}>
          {CITIES.map((c) => (
            <a className="city" href={lp(locale, '/consult')} key={c.city}>
              <div className="city__top">
                <Pin />
                <span className="city__name">{c.city}</span>
              </div>
              <span className="city__region">{c.region}</span>
              <span className="city__meta">Verified clinics</span>
            </a>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
