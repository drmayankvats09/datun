// apps/web/components/home/sections/hero.tsx
import { getTranslations } from 'next-intl/server';
import { Container } from '@repo/ui';
import { lp, Pin, ShieldCheck, Spark, type SectionProps } from '../_shared';

/** Demo consult preview. The Datun-side author key is "datun" (never "ai"); the
 *  copy carries no em-dashes and frames the read as dentist-backed. */
const HERO_CARD = {
  name: 'Datun',
  live: 'consultation · just now',
  bubbles: [
    {
      who: 'datun',
      text: "Sorry you're hurting. Is the pain sharp and sudden, or more of a dull ache?",
    },
    { who: 'me', text: 'Sharp, worse with cold water.' },
    { who: 'datun', text: 'Since when, roughly?' },
  ],
  diagTitle: 'Likely sensitivity, manageable',
  diagSub:
    'Dentist-backed assessment plus home-care steps. A dentist should confirm within a few days, and verified clinics are open near you.',
  floatA: 'Answer in minutes',
  floatB: 'SmileCare · 1.2 km',
} as const;

export async function Hero({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <div className="dtn-glow">
      <Container>
        <div className="hero">
          <div className="hero__copy">
            <span className="eyebrow">{t('home.hero.eyebrow')}</span>
            <h1>
              {t('home.hero.title1')}
              <br />
              <em>{t('home.hero.title2')}</em>
            </h1>
            <p className="lede">{t('home.hero.lede')}</p>
            <div className="cta-row">
              <a className="dtn-btn dtn-btn--primary dtn-btn--lg" href={lp(locale, '/consult')}>
                {t('home.cta.ask')}
              </a>
              <a className="dtn-btn dtn-btn--secondary dtn-btn--lg" href="#find">
                {t('home.cta.find')}
              </a>
            </div>
            <span className="trustcue">
              <ShieldCheck />
              {t('home.hero.trustcue')}
            </span>
          </div>

          {/* Illustrative demo only — exposed to AT as a single labelled image
              (role=img makes the subtree presentational), so a screen reader never
              hears a fabricated "real" consultation. */}
          <div className="consult" role="img" aria-label="Example of a Datun consultation">
            <div className="consult__card">
              <div className="consult__bar">
                <span className="consult__ava" aria-hidden="true">
                  {/* Datun brand mark (white-on-teal). Decorative — the adjacent
                      name labels it; the consult subtree is already role=img. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/datun-icon-white.svg" alt="" width={20} height={20} />
                </span>
                <span style={{ flex: 1 }}>
                  <span className="consult__name">{HERO_CARD.name}</span>
                  <span className="consult__live">
                    <span className="dot" aria-hidden="true" /> {HERO_CARD.live}
                  </span>
                </span>
              </div>
              <div className="consult__body">
                {HERO_CARD.bubbles.map((b, i) => (
                  <div key={i} className={`bubble bubble--${b.who === 'datun' ? 'datun' : 'me'}`}>
                    {b.text}
                  </div>
                ))}
                <div className="bubble--type" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="diag">
                  <ShieldCheck />
                  <span>
                    <b>{HERO_CARD.diagTitle}</b>
                    <span className="s">{HERO_CARD.diagSub}</span>
                  </span>
                </div>
              </div>
            </div>
            <div className="float float--a">
              <Spark />
              {HERO_CARD.floatA}
            </div>
            <div className="float float--b">
              <Pin />
              {HERO_CARD.floatB}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
