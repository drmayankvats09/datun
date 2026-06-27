// apps/web/components/home/sections/site-footer.tsx
import { getTranslations } from 'next-intl/server';
import { Container } from '@repo/ui';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Check, HomeLogo, Lock, ShieldCheck, lp, type SectionProps } from '../_shared';

/** A footer nav item. `href: null` means the route is not built yet (Task #56+)
 *  and renders as a muted, non-interactive span — never a 404, never href="#". */
type FootItem = { label: string; href: string | null };

function FootLink({ locale, item }: { locale: string; item: FootItem }) {
  if (!item.href) {
    return (
      <span className="foot__dead" aria-disabled="true">
        {item.label}
      </span>
    );
  }
  const href = item.href.startsWith('#') ? item.href : lp(locale, item.href);
  return <a href={href}>{item.label}</a>;
}

export async function SiteFooter({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const year = 2026;

  // Only routes that exist today are links; everything forward-looking is a
  // disabled span. Live: on-page anchors + the shipped legal pages.
  const columns: { h: string; items: FootItem[] }[] = [
    {
      h: t('home.footer.product'),
      items: [
        { label: 'How it works', href: '#how' },
        { label: 'Find a dentist', href: '#find' },
        { label: 'Dental tourism', href: '#tourism' },
        { label: 'Datun Answers', href: null },
        { label: 'Download the app', href: null },
      ],
    },
    {
      h: t('home.footer.learn'),
      items: [
        { label: 'Common problems', href: '#learn' },
        { label: 'Conditions', href: null },
        { label: 'Treatments', href: null },
        { label: 'Cost guides', href: null },
        { label: 'Blog', href: null },
      ],
    },
    {
      h: t('home.footer.company'),
      items: [
        { label: 'About', href: null },
        { label: 'Our dentists', href: null },
        { label: 'How we verify', href: null },
        { label: 'Privacy (DPDP)', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
        { label: 'Accessibility', href: '/accessibility' },
      ],
    },
  ];

  return (
    <footer className="foot">
      <Container>
        <div className="foot__cols">
          <div className="foot__col foot__brand">
            <a href={lp(locale, '/')} aria-label="Datun home" style={{ display: 'inline-block' }}>
              <HomeLogo />
            </a>
            <p className="foot__descriptor">{t('home.footer.descriptor')}</p>
            <p className="foot__tag">{t('home.footer.tagline')}</p>
          </div>
          {columns.map((col) => (
            <div className="foot__col" key={col.h}>
              <h3>{col.h}</h3>
              {col.items.map((item) => (
                <FootLink key={item.label} locale={locale} item={item} />
              ))}
            </div>
          ))}
        </div>

        <div className="foot__trust">
          <span>
            <ShieldCheck /> {t('home.footer.trustDoctor')}
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
      </Container>
    </footer>
  );
}
