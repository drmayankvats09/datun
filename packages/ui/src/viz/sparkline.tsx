import * as React from 'react';

/**
 * Datun Sparkline + Bullet — Part 19.3/19.9. Hand-built SVG (tiny, dependency-free).
 * Sparkline = trend-in-a-cell; Bullet = value vs target with qualitative bands
 * (clinic dashboard multi-metric rows — preferred over gauges there).
 * a11y: role=img + aria-label; reduced-motion irrelevant (static).
 */
export function Sparkline({
  data,
  width = 96,
  height = 28,
  label,
}: {
  data: number[];
  width?: number;
  height?: number;
  label?: string;
}) {
  if (!data.length) return null;
  const min = Math.min(...data),
    max = Math.max(...data),
    span = max - min || 1;
  const step = width / (data.length - 1 || 1);
  const pts = data.map(
    (d, i) =>
      `${(i * step).toFixed(1)},${(height - 2 - ((d - min) / span) * (height - 4)).toFixed(1)}`,
  );
  const [lx = '0', ly = '0'] = (pts[pts.length - 1] ?? '0,0').split(',');
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label ?? `Trend: ${data.join(', ')}`}
      style={{ display: 'block' }}
    >
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke="var(--color-chart-1)"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lx} cy={ly} r={2.4} fill="var(--color-chart-1)" />
    </svg>
  );
}

export function BulletChart({
  value,
  target,
  max,
  bands,
  label,
  format = (n) => String(n),
}: {
  value: number;
  target: number;
  max: number;
  /** qualitative bands as fractions of max, low→high, e.g. [0.4,0.7]. */
  bands?: [number, number];
  label: string;
  format?: (n: number) => string;
}) {
  const w = 240,
    h = 32,
    pct = (n: number) => Math.max(0, Math.min(1, n / max)) * w;
  const [b1, b2] = bands ?? [0.4, 0.7];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          font: 'var(--type-label-m)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</span>
        <span style={{ color: 'var(--color-text-muted)' }}>
          {format(value)} / target {format(target)}
        </span>
      </div>
      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        height={h}
        role="img"
        aria-label={`${label}: ${format(value)} against a target of ${format(target)}`}
      >
        {/* qualitative bands — non-colour separation via opacity steps + a border */}
        <rect x="0" y="8" width={w} height="16" rx="4" fill="var(--color-surface-sunken)" />
        <rect
          x="0"
          y="8"
          width={pct(b1 * max)}
          height="16"
          rx="4"
          fill="var(--color-chart-grid)"
          opacity="0.5"
        />
        <rect
          x="0"
          y="8"
          width={pct(b2 * max)}
          height="16"
          rx="4"
          fill="var(--color-chart-grid)"
          opacity="0.3"
        />
        {/* measure */}
        <rect x="0" y="12" width={pct(value)} height="8" rx="4" fill="var(--color-chart-1)" />
        {/* target marker */}
        <rect
          x={pct(target) - 1.5}
          y="5"
          width="3"
          height="22"
          rx="1.5"
          fill="var(--color-text-primary)"
        />
      </svg>
    </div>
  );
}
