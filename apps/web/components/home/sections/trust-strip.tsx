// apps/web/components/home/sections/trust-strip.tsx
import { getTranslations } from 'next-intl/server';
import { Container } from '@repo/ui';
import { Chat, Globe, Pin, Spark, type SectionProps } from '../_shared';

/** Trust strip — a slim band of real v1 figures + a breadth cue under the hero.
 *  Numbers are tabular-aligned; the last cell is a qualitative "any dental issue,
 *  toothache to smile makeover" breadth mark (no per-consultation claim — the
 *  brand is dentist-BUILT at the system level, not per-consult reviewed).
 *
 *  Figures are founder-provided v1 values (Task #55, round 2). Verify they remain
 *  accurate before launch — the brand + DPDP honesty rule forbids any untrue count. */
export async function TrustStrip({ locale }: SectionProps) {
  const t = await getTranslations({ locale, namespace: 'common' });
  const stats = [
    { icon: <Chat />, value: '1,000+', label: t('home.trust.consultations') },
    { icon: <Pin />, value: '300', label: t('home.trust.clinics') },
    { icon: <Globe />, value: '30+', label: t('home.trust.cities') },
    { icon: <Spark />, value: t('home.trust.breadth'), label: t('home.trust.breadthSub') },
  ];
  return (
    <div className="dtn-band--bordered">
      <Container>
        <div className="strip">
          {stats.map((s) => (
            <div className="strip__i" key={s.label}>
              {s.icon}
              <b>{s.value}</b>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}
