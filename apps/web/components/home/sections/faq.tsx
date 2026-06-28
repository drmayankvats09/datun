// apps/web/components/home/sections/faq.tsx
import { getTranslations } from 'next-intl/server';
import { Container, Section } from '@repo/ui';
import { ChevronDown, type SectionProps } from '../_shared';
import { FAQS } from '../data';

/**
 * FAQ — accessible native-<details> disclosures (zero client JS, keyboard +
 * screen-reader operable, fully server-rendered). The same FAQS array also
 * feeds the FAQPage JSON-LD in page.tsx, so visible text and markup never drift.
 */
export async function Faq({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  return (
    <Section className="dtn-band--clay dtn-band--bordered">
      <Container>
        <div className="dtn-head">
          <span className="eyebrow">{t('home.faq.eyebrow')}</span>
          <h2 className="sh">{t('home.faq.title')}</h2>
        </div>
        <div className="faq">
          {FAQS.map((f, i) => (
            <details className="faq__item" key={i}>
              <summary className="faq__q">
                <span>{f.q}</span>
                <ChevronDown className="faq__icon" />
              </summary>
              <div className="faq__panel">
                <p>{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}
