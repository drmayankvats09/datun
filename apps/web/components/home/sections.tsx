// apps/web/components/home/sections.tsx
// ═══════════════════════════════════════════════════════════════
// PATIENT HOMEPAGE SECTIONS (Task #55) — Server Components.
// Built to the locked visual target (docs/design-system/home-preview.html),
// composed on the @repo/ui design system (dtn-* classes from components.css).
// Marketing copy (Part 12: never "AI"; "free" only per 12.5; answer-first)
// comes from i18n `common.home.*`; taxonomy lists are local data.
// No client JS here — interactivity lives in @repo/ui <SiteHeader> only.
// ═══════════════════════════════════════════════════════════════

import { getTranslations } from 'next-intl/server';
import { LanguageSwitcher } from '@/components/language-switcher';

/** Locale-aware internal href (routing is localePrefix: 'as-needed'). */
function lp(locale: string, path: string): string {
  return locale === 'en' ? path : `/${locale}${path}`;
}

type SectionProps = { locale: string };

// ── shared inline icons (match the visual target) ──────────────
const Shield = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 3c3 2 5.5 2.5 8 2.5V12c0 5-3.5 7.5-8 9.5C7.5 19.5 4 17 4 12V5.5C6.5 5.5 9 5 12 3Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);
const Pin = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 10c0 5-5.5 10-8 11-2.5-1-8-6-8-11a8 8 0 0 1 16 0Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 7 9 18l-5-5"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const Lock = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect
      x="4.5"
      y="10.5"
      width="15"
      height="10"
      rx="2.5"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

/** Datun wordmark (brand SVG) — passed to @repo/ui SiteHeader and used in the
 * footer. Theme-aware: ink wordmark on light, off-white wordmark on dark.
 * alt="" because the wrapping links carry aria-label="Datun home". */
export function HomeLogo() {
  return (
    <span className="dtn-wordmark">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="dtn-wordmark__ink" src="/brand/datun-wordmark.svg" alt="" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="dtn-wordmark__white" src="/brand/datun-wordmark-white.svg" alt="" />
    </span>
  );
}

// ── 2 · HERO ───────────────────────────────────────────────────
const HERO_CARD = {
  name: 'Datun',
  live: 'consultation · just now',
  bubbles: [
    {
      who: 'ai',
      text: 'Sorry you’re hurting. Is the pain sharp and sudden, or more of a dull ache?',
    },
    { who: 'me', text: 'Sharp — worse with cold water.' },
    { who: 'ai', text: 'Since when, roughly?' },
  ],
  diagTitle: 'Likely sensitivity — manageable',
  diagSub:
    'Doctor-backed assessment + home-care steps. A dentist should confirm within a few days; 3 verified clinics are open near you.',
  floatA: 'Answer in minutes',
  floatB: 'SmileCare · 1.2 km',
};

export async function Hero({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <div className="wrap">
      <section className="hero">
        <div>
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
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3c3 2 5.5 2.5 8 2.5V12c0 5-3.5 7.5-8 9.5C7.5 19.5 4 17 4 12V5.5C6.5 5.5 9 5 12 3Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
              <path
                d="m9 12 2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t('home.hero.trustcue')}
          </span>
        </div>

        <div className="consult">
          <div className="consult__card">
            <div className="consult__bar">
              <span className="consult__ava" aria-hidden="true">
                d
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ font: 'var(--type-label-l)', fontWeight: 600, display: 'block' }}>
                  {HERO_CARD.name}
                </span>
                <span className="consult__live">
                  <span className="dot" aria-hidden="true" /> {HERO_CARD.live}
                </span>
              </span>
            </div>
            <div className="consult__body">
              {HERO_CARD.bubbles.map((b, i) => (
                <div key={i} className={`bubble bubble--${b.who === 'ai' ? 'ai' : 'me'}`}>
                  {b.text}
                </div>
              ))}
              <div className="bubble--type" aria-hidden="true">
                <i />
                <i />
                <i />
              </div>
              <div className="diag">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M9 12l2 2 4-4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
                </svg>
                <span>
                  <b>{HERO_CARD.diagTitle}</b>
                  <span className="s">{HERO_CARD.diagSub}</span>
                </span>
              </div>
            </div>
          </div>
          <div className="float float--a">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            {HERO_CARD.floatA}
          </div>
          <div className="float float--b">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              style={{ color: 'var(--_clay)' }}
            >
              <path
                d="M20 10c0 5-5.5 10-8 11-2.5-1-8-6-8-11a8 8 0 0 1 16 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            {HERO_CARD.floatB}
          </div>
        </div>
      </section>
    </div>
  );
}

// ── 3 · TRUST STRIP ────────────────────────────────────────────
export async function TrustStrip({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const items = [
    { icon: <Shield />, b: t('home.footer.trustDoctor'), s: 'Reviewed by licensed dentists' },
    { icon: <Pin />, b: t('home.footer.trustVerified'), s: 'Primary-source checked' },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
      b: 'Any dental issue',
      s: 'Toothache to smile makeover',
    },
    { icon: <Lock />, b: 'DPDP secure', s: 'Your data stays yours' },
  ];
  return (
    <div className="strip">
      <div className="strip__in">
        {items.map((it, i) => (
          <div className="strip__i" key={i}>
            {it.icon}
            <b>{it.b}</b>
            <span>{it.s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── (mission manifesto — ported from the visual target) ────────
export async function Manifesto({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <section className="manifesto">
      <div className="manifesto__in">
        <span className="manifesto__tag">{t('home.manifesto.tagLeft')}</span>
        <p className="manifesto__q">
          {t('home.manifesto.lead')} <strong>{t('home.manifesto.strong')}</strong>{' '}
          {t('home.manifesto.rest')}
        </p>
        <span className="manifesto__tag">{t('home.manifesto.tagRight')}</span>
      </div>
    </section>
  );
}

// ── 4 · HOW IT WORKS ───────────────────────────────────────────
export async function HowItWorks({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const steps = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M7.5 19 4 21l1.2-4A8 8 0 1 1 9 19.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      h: 'Describe it',
      p: 'Tell Datun what’s bothering you, in your own words — any hour.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3c4 2.5 7 4 7 8 0 4.5-3 7-7 9-4-2-7-4.5-7-9 0-4 3-5.5 7-8Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="m9 12 2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      h: 'Get a doctor-backed diagnosis',
      p: 'A clear, medically-reviewed assessment, plus a report you keep.',
    },
    {
      icon: <Pin />,
      h: 'Get care',
      p: 'Medicine in your consult, or a verified dentist booked nearby.',
    },
  ];
  return (
    <div className="wrap">
      <section className="sec center" id="how">
        <span className="eyebrow">{t('home.how.eyebrow')}</span>
        <h2 className="sh">
          {t('home.how.title1')}
          <em>{t('home.how.title2')}</em>
        </h2>
        <div className="steps">
          {steps.map((s, i) => (
            <div className="step" key={i}>
              <div className="step__n">{i + 1}</div>
              <span className="step__ic">{s.icon}</span>
              <h3>{s.h}</h3>
              <p>{s.p}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'var(--space-40)' }}>
          <a className="dtn-btn dtn-btn--primary dtn-btn--lg" href={lp(locale, '/consult')}>
            {t('home.cta.ask')}
          </a>
        </div>
      </section>
    </div>
  );
}

// ── 5 · TWO DOORS ──────────────────────────────────────────────
export async function TwoDoors({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <div className="sunken">
      <div className="wrap">
        <section className="sec">
          <div className="center">
            <span className="eyebrow">{t('home.doors.eyebrow')}</span>
            <h2 className="sh">{t('home.doors.title')}</h2>
          </div>
          <div className="row2" style={{ marginTop: 'var(--space-40)' }}>
            <div className="dtn-card dtn-card--elevated door">
              <div className="imgph" aria-hidden="true" />
              <div className="door__in">
                <div className="door__ic">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M7.5 19 4 21l1.2-4A8 8 0 1 1 9 19.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3>Not sure? Ask Datun</h3>
                <p>
                  Describe it → doctor-backed diagnosis + report → medicine or a verified clinic.
                  Best when something hurts and you’re unsure.
                </p>
                <a className="dtn-btn dtn-btn--primary dtn-btn--md" href={lp(locale, '/consult')}>
                  {t('home.cta.ask')}
                </a>
              </div>
            </div>
            <div className="dtn-card dtn-card--elevated door" id="find">
              <div className="imgph" aria-hidden="true" />
              <div className="door__in">
                <div className="door__ic">
                  <Pin />
                </div>
                <h3>Know what you need? Find &amp; book</h3>
                <p>
                  Search verified dentists and book directly — cleaning, RCT, aligners, and more. No
                  consult step required.
                </p>
                <a className="dtn-btn dtn-btn--secondary dtn-btn--md" href="#find">
                  {t('home.cta.find')}
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── 6 · WHY DATUN (+ honest comparison) ────────────────────────
export async function WhyDatun({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const points = [
    {
      icon: <Shield />,
      h: 'Every dentist is verified',
      p: 'We primary-source-check credentials before any clinic joins.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="m9 12 2 2 4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      ),
      h: 'Doctor-backed diagnosis',
      p: 'Every assessment follows protocols written and reviewed by practising dentists.',
    },
    {
      icon: <Lock />,
      h: 'Your data stays yours',
      p: 'Encrypted, consent-logged, deletable any time — fully DPDP 2023 compliant.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 8v5M12 16h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
      h: 'Honest about scope',
      p: 'A remote check can’t fully replace an in-person exam — we’ll always tell you when to see someone.',
    },
  ];
  const rows = [
    { k: 'Who answers you', no: 'A form, or no one', yes: 'A licensed dentist' },
    { k: 'What you walk away with', no: 'A list of clinics', yes: 'A report — yours to keep' },
    { k: 'How long it takes', no: 'Calls, callbacks, waiting', yes: 'About two minutes' },
    { k: 'Verified clinics', no: 'Anyone who pays to list', yes: 'Every one, checked by us' },
  ];
  return (
    <div className="wrap">
      <section className="sec">
        <div className="center">
          <span className="eyebrow">{t('home.why.eyebrow')}</span>
          <h2 className="sh">
            {t('home.why.title1')}
            <em>{t('home.why.title2')}</em>
          </h2>
        </div>
        <div className="why">
          {points.map((pt, i) => (
            <div className="why__pt" key={i}>
              <span className="ic">{pt.icon}</span>
              <div>
                <h3>{pt.h}</h3>
                <p>{pt.p}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="honest">
          <div className="honest__r honest__head">
            <div className="honest__c h" />
            <div className="honest__c h">Most dental sites</div>
            <div className="honest__c h b">Datun</div>
          </div>
          {rows.map((r, i) => (
            <div className="honest__r" key={i}>
              <div className="honest__c">
                <span className="k">{r.k}</span>
              </div>
              <div className="honest__c">
                <span className="honest__lbl">Most sites</span>
                <span className="no">{r.no}</span>
              </div>
              <div className="honest__c b">
                <span className="honest__lbl">Datun</span>
                <span className="yes">
                  <Check /> {r.yes}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── 7 · CONDITION QUICK-LINKS ──────────────────────────────────
const CONDITIONS = [
  { en: 'Toothache', hi: 'दाँत दर्द' },
  { en: 'Sensitivity', hi: 'सेंसिटिविटी' },
  { en: 'Bleeding gums', hi: 'मसूड़ों से खून' },
  { en: 'Bad breath', hi: 'मुँह की बदबू' },
  { en: 'Broken tooth', hi: 'टूटा दाँत' },
  { en: 'Wisdom tooth', hi: 'अक्ल दाड़' },
  { en: 'Cavity', hi: 'कैविटी' },
  { en: 'Emergency', hi: 'आपात' },
];
export async function ConditionLinks({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <div className="sunken">
      <div className="wrap">
        <section className="sec" id="learn">
          <div className="center">
            <span className="eyebrow">{t('home.conditions.eyebrow')}</span>
            <h2 className="sh">{t('home.conditions.title')}</h2>
          </div>
          <div className="tiles">
            {CONDITIONS.map((c) => (
              <a className="tile" href={lp(locale, '/consult')} key={c.en}>
                <span className="ic">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M7 3.5C4.8 3.5 3 5.2 3 7.8c0 1.6.5 2.9 1 4.6.5 2 .7 4.7 1.4 5.8.3.5 1 .5 1.3 0 .8-1.3.7-3.7 1.8-3.7s1 2.4 1.8 3.7c.3.5 1 .5 1.3 0 .7-1.1.9-3.8 1.4-5.8.5-1.7 1-3 1-4.6 0-2.6-1.8-4.3-4-4.3-1.3 0-2 .6-3 .6s-1.7-.6-3-.6Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {c.en}
                {/* Hindi sub-label only on the Hindi locale — keeps the
                    Devanagari webfont off the English page's perf budget. */}
                {locale === 'hi' && <span className="hi">{c.hi}</span>}
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── 8 · CITIES ─────────────────────────────────────────────────
const CITIES = [
  { city: 'Mumbai', region: 'Maharashtra' },
  { city: 'Delhi', region: 'NCR' },
  { city: 'Bengaluru', region: 'Karnataka' },
  { city: 'Hyderabad', region: 'Telangana' },
  { city: 'Pune', region: 'Maharashtra' },
  { city: 'Chennai', region: 'Tamil Nadu' },
  { city: 'Kolkata', region: 'West Bengal' },
  { city: 'Ahmedabad', region: 'Gujarat' },
];
export async function Cities({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <div className="wrap">
      <section className="sec">
        <div className="center">
          <span className="eyebrow">{t('home.cities.eyebrow')}</span>
          <h2 className="sh">{t('home.cities.title')}</h2>
        </div>
        <div className="cities">
          {CITIES.map((c) => (
            <a className="city" href="#find" key={c.city}>
              {c.city}
              <span>{c.region}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── 9 · PATIENT STORIES ────────────────────────────────────────
const STORIES = [
  {
    q: 'Filling cracked at midnight. By morning I knew exactly what to do — and which clinic to walk into.',
    name: 'Riya K.',
    place: 'Mumbai · consented',
    av: 'RK',
  },
  {
    q: 'Finally something that explains things in plain Hindi, without the scary words. My mom used it herself.',
    name: 'Arjun V.',
    place: 'Delhi · consented',
    av: 'AV',
  },
  {
    q: 'It didn’t oversell. Told me it was minor, gave home care, and said see a dentist only if it worsened.',
    name: 'Sneha N.',
    place: 'Bengaluru · consented',
    av: 'SN',
  },
];
export async function PatientStories({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <div className="sunken">
      <div className="wrap">
        <section className="sec">
          <div className="center">
            <span className="eyebrow">{t('home.stories.eyebrow')}</span>
            <h2 className="sh">{t('home.stories.title')}</h2>
          </div>
          <div className="row3" style={{ marginTop: 'var(--space-40)' }}>
            {STORIES.map((s) => (
              <div
                className="dtn-card dtn-card--flat"
                style={{ padding: 'var(--space-24)' }}
                key={s.av}
              >
                <div className="stars" aria-hidden="true">
                  ★★★★★
                </div>
                <p className="story__q">{s.q}</p>
                <div className="story__by">
                  <span className="story__av" aria-hidden="true">
                    {s.av}
                  </span>
                  <span>
                    <b style={{ font: 'var(--type-label-l)', fontWeight: 600, display: 'block' }}>
                      {s.name}
                    </b>
                    <span style={{ font: 'var(--type-caption)', color: 'var(--color-text-muted)' }}>
                      {s.place}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p
            className="center"
            style={{
              font: 'var(--type-caption)',
              color: 'var(--color-text-faint)',
              marginTop: '16px',
            }}
          >
            {t('home.stories.consent')}
          </p>
        </section>
      </div>
    </div>
  );
}

// ── 10 · TOURISM TEASER ────────────────────────────────────────
export async function TourismTeaser({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <div className="wrap">
      <section className="sec" id="tourism">
        <div
          className="clinicsband"
          style={{ background: 'var(--color-bg-brand-weak)', borderColor: 'transparent' }}
        >
          <div>
            <span className="eyebrow">{t('home.tourism.eyebrow')}</span>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: 'var(--text-title-l, 1.5rem)',
                margin: '8px 0 4px',
                color: 'var(--color-text-primary)',
              }}
            >
              {t('home.tourism.title')}
            </h3>
            <p
              style={{
                font: 'var(--type-body-m)',
                color: 'var(--color-text-muted)',
                margin: 0,
                maxInlineSize: '52ch',
              }}
            >
              {t('home.tourism.desc')}
            </p>
          </div>
          <a
            className="dtn-btn dtn-btn--primary dtn-btn--md"
            href="#tourism"
            style={{ flex: 'none' }}
          >
            {t('home.cta.estimate')}
          </a>
        </div>
      </section>
    </div>
  );
}

// ── 11 · ANSWERS TEASER (Family O) ─────────────────────────────
export async function AnswersTeaser({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <div className="sunken">
      <div className="wrap">
        <section className="sec center">
          <span className="eyebrow">{t('home.answers.eyebrow')}</span>
          <h2 className="sh">{t('home.answers.title')}</h2>
          <p className="lede">{t('home.answers.desc')}</p>
          <div style={{ marginTop: 'var(--space-32)' }}>
            <a className="dtn-btn dtn-btn--secondary dtn-btn--lg" href="#learn">
              {t('home.answers.cta')}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── 12 · FOR CLINICS (outbound) ────────────────────────────────
export async function ForClinics({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <div className="wrap">
      <section className="sec" style={{ paddingBlockStart: 0 }}>
        <div className="clinicsband">
          <div>
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: 'var(--text-title-l, 1.5rem)',
                margin: '0 0 4px',
                color: 'var(--color-text-primary)',
              }}
            >
              {t('home.clinicsCta.title')}
            </h3>
            <p
              style={{
                font: 'var(--type-body-m)',
                color: 'var(--color-text-muted)',
                margin: 0,
                maxInlineSize: '52ch',
              }}
            >
              {t('home.clinicsCta.desc')}
            </p>
          </div>
          <a
            className="dtn-btn dtn-btn--secondary dtn-btn--md"
            href="https://clinics.datunai.com"
            rel="noopener noreferrer"
            target="_blank"
            style={{ flex: 'none' }}
          >
            {t('home.clinicsCta.cta')} ↗
          </a>
        </div>
      </section>
    </div>
  );
}

// ── 13 · FINAL CTA ─────────────────────────────────────────────
export async function FinalCta({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <div className="wrap">
      <section className="sec" style={{ paddingBlockStart: 0 }}>
        <div className="band">
          <div className="band__glow" aria-hidden="true" />
          <h2>
            {t('home.finalCta.title1')}
            <br />
            {t('home.finalCta.title2')}
          </h2>
          <p>{t('home.finalCta.desc')}</p>
          <a
            className="dtn-btn dtn-btn--lg"
            href={lp(locale, '/consult')}
            style={{ position: 'relative', background: '#fff', color: 'var(--color-text-link)' }}
          >
            {t('home.finalCta.cta')}
          </a>
        </div>
      </section>
    </div>
  );
}

// ── 14 · SITE FOOTER ───────────────────────────────────────────
export async function SiteFooter({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const year = 2026;
  // Forward-looking routes per the patient page architecture (02_*). Legal
  // routes already exist; content routes will be filled by their own tasks.
  const cols: { h: string; links: { label: string; href: string }[] }[] = [
    {
      h: t('home.footer.product'),
      links: [
        { label: 'Ask Datun', href: '/consult' },
        { label: 'Find a dentist', href: '#find' },
        { label: 'Dental tourism', href: '#tourism' },
        { label: 'Datun Answers', href: '/answers' },
        { label: 'Download the app', href: '/download' },
      ],
    },
    {
      h: t('home.footer.learn'),
      links: [
        { label: 'Conditions', href: '/conditions' },
        { label: 'Treatments', href: '/treatments' },
        { label: 'Symptoms', href: '/symptoms' },
        { label: 'Cost guides', href: '/costs' },
        { label: 'Blog', href: '/blog' },
      ],
    },
    {
      h: t('home.footer.company'),
      links: [
        { label: 'About', href: '/about' },
        { label: 'Our doctors', href: '/doctors' },
        { label: 'How we verify', href: '/verify' },
        { label: 'Privacy (DPDP)', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
        { label: 'Medical disclaimer', href: '/medical-disclaimer' },
      ],
    },
  ];
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot__cols">
          <div className="foot__col">
            <a
              href={lp(locale, '/')}
              aria-label="Datun home"
              style={{ display: 'inline-block', marginBottom: '12px' }}
            >
              <HomeLogo />
            </a>
            <p
              style={{
                font: 'var(--type-body-s)',
                color: 'var(--color-text-muted)',
                maxInlineSize: '30ch',
                margin: 0,
              }}
            >
              {t('home.footer.tagline')}
            </p>
          </div>
          {cols.map((col) => (
            <div className="foot__col" key={col.h}>
              <h3>{col.h}</h3>
              {col.links.map((l) => (
                <a href={l.href.startsWith('#') ? l.href : lp(locale, l.href)} key={l.label}>
                  {l.label}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className="foot__trust">
          <span>
            <Shield /> {t('home.footer.trustDoctor')}
          </span>
          <span>
            <Check /> {t('home.footer.trustVerified')}
          </span>
          <span>
            <Lock /> {t('home.footer.trustSecure')}
          </span>
          <span>{t('home.footer.trustReviewed')}</span>
        </div>
        <div className="foot__base">
          <LanguageSwitcher />
          <span>{t('home.footer.rights', { year })}</span>
          <span>{t('home.footer.emergency')}</span>
        </div>
      </div>
    </footer>
  );
}
