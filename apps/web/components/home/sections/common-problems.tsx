// apps/web/components/home/sections/common-problems.tsx
import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import { Container, Grid, Section } from '@repo/ui';
import { CategoryIcon, lp, tileTint, type SectionProps } from '../_shared';
import { PROBLEMS } from '../data';

/** Common problems — enriched, answer-first condition tiles (duotone icons, a
 *  calm per-tile tint) that each link into a consult. */
export async function CommonProblems({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <Section id="learn" className="dtn-band--clay dtn-band--bordered">
      <Container>
        <div className="dtn-head">
          <span className="eyebrow">{t('home.problems.eyebrow')}</span>
          <h2 className="sh">{t('home.problems.title')}</h2>
          <p className="lede">{t('home.problems.lede')}</p>
        </div>
        <Grid min="15rem" gap="16" style={{ marginTop: 'var(--space-40)' }}>
          {PROBLEMS.map((p, i) => (
            <a className="tile" href={lp(locale, '/consult')} key={p.id}>
              <div className="tile__top">
                <span className="ic" style={{ '--_h': tileTint(i) } as CSSProperties}>
                  <CategoryIcon id={p.id} />
                </span>
                <span className="tile__label">{p.label}</span>
                {locale === 'hi' && <span className="hi">{p.hi}</span>}
              </div>
              <p className="tile__blurb">{p.blurb}</p>
            </a>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
