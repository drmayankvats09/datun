import * as React from 'react';

/**
 * Datun Health / Severity Gauge — Part 19.8 (the signature, hand-built SVG).
 *
 * A colour-zoned arc + a large tabular-figure score in the centre + an
 * ALWAYS-PRESENT zone label, so meaning NEVER rides on colour alone (Part 13.10c):
 * the needle/fill position is a second non-colour cue and the word ("Good" /
 * "Needs attention" / "See a dentist") is a third. Calm, composed — never alarming
 * (Part 1.3). One hero score per view. (A single moment only — score OVER TIME is a
 * line chart, never a gauge.)
 *
 * a11y: role="img" + <title>; reduced-motion → final state instantly.
 */
export type GaugeZone = 'good' | 'attention' | 'urgent';

export interface HealthGaugeProps {
  /** 0–100 score. */
  value: number;
  /** What it measures (always labelled). */
  label: string;
  /** Zone thresholds (inclusive upper bound of good, of attention). @default [40,70] */
  thresholds?: [number, number];
  /** Override the computed zone word. */
  zoneLabel?: Partial<Record<GaugeZone, string>>;
  size?: number;
  className?: string;
}

const ZONE_WORD: Record<GaugeZone, string> = {
  good: 'Good',
  attention: 'Needs attention',
  urgent: 'See a dentist',
};
const ZONE_VAR: Record<GaugeZone, string> = {
  good: 'var(--color-success)',
  attention: 'var(--color-warning)',
  urgent: 'var(--color-error)',
};

function zoneFor(v: number, [a, b]: [number, number]): GaugeZone {
  // Higher score = healthier → good is the TOP band.
  if (v >= b) return 'good';
  if (v >= a) return 'attention';
  return 'urgent';
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const s = polar(cx, cy, r, a1),
    e = polar(cx, cy, r, a0);
  const large = a1 - a0 <= 180 ? 0 : 1;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

export function HealthGauge({
  value,
  label,
  thresholds = [40, 70],
  zoneLabel,
  size = 200,
  className,
}: HealthGaugeProps) {
  const v = Math.max(0, Math.min(100, value));
  const zone = zoneFor(v, thresholds);
  const word = zoneLabel?.[zone] ?? ZONE_WORD[zone];
  const cx = size / 2,
    cy = size / 2,
    r = size / 2 - 16,
    sw = 16;
  const START = -120,
    END = 120,
    SPAN = END - START; // 240° sweep
  // three zone bands along the sweep
  const [a, b] = thresholds;
  const segs: { from: number; to: number; zone: GaugeZone }[] = [
    { from: 0, to: a, zone: 'urgent' },
    { from: a, to: b, zone: 'attention' },
    { from: b, to: 100, zone: 'good' },
  ];
  const angOf = (pct: number) => START + (pct / 100) * SPAN;
  const needle = angOf(v);
  const tip = polar(cx, cy, r, needle);

  return (
    <figure
      className={className}
      style={{
        margin: 0,
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <svg
        width={size}
        height={size * 0.82}
        viewBox={`0 0 ${size} ${size * 0.82}`}
        role="img"
        aria-label={`${label}: ${v} out of 100, ${word}`}
      >
        <title>{`${label}: ${v}/100 — ${word}`}</title>
        {/* track */}
        <path
          d={arc(cx, cy, r, START, END)}
          fill="none"
          stroke="var(--color-chart-grid)"
          strokeWidth={sw}
          strokeLinecap="round"
        />
        {/* zones */}
        {segs.map((s, i) => (
          <path
            key={i}
            d={arc(cx, cy, r, angOf(s.from) + (i ? 1.5 : 0), angOf(s.to) - (i < 2 ? 1.5 : 0))}
            fill="none"
            stroke={ZONE_VAR[s.zone]}
            strokeWidth={sw}
            strokeLinecap="butt"
            opacity={s.zone === zone ? 1 : 0.28}
          />
        ))}
        {/* needle dot (second, non-colour cue) */}
        <circle cx={tip.x} cy={tip.y} r={sw / 2 + 3} fill="var(--color-surface)" />
        <circle cx={tip.x} cy={tip.y} r={sw / 2 - 1} fill={ZONE_VAR[zone]} />
        {/* centre score */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: size * 0.26,
            fill: 'var(--color-text-primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {v}
        </text>
        <text
          x={cx}
          y={cy + size * 0.12}
          textAnchor="middle"
          style={{
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: size * 0.06,
            fill: 'var(--color-text-muted)',
            letterSpacing: '.08em',
          }}
        >
          / 100
        </text>
      </svg>
      {/* ALWAYS-present zone label — meaning never rides on colour alone */}
      <figcaption
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          font: 'var(--type-label-l)',
          fontWeight: 700,
          color: ZONE_VAR[zone],
        }}
      >
        <span
          aria-hidden="true"
          style={{ width: 10, height: 10, borderRadius: 999, background: ZONE_VAR[zone] }}
        />
        {word}
      </figcaption>
      <span style={{ font: 'var(--type-body-s)', color: 'var(--color-text-muted)' }}>{label}</span>
    </figure>
  );
}
