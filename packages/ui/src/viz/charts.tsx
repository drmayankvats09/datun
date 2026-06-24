'use client';

import * as React from 'react';
import { CHART_PALETTE, CHART_TOKENS, SERIES_DASH } from './chart-tokens';
import { ChartFrame, type ChartFrameProps } from './chart-frame';

/**
 * Datun Recharts wrappers — Part 19.13. Recharts v3 (SVG), restyled to tokens,
 * with HONEST defaults baked in (19.4) so the author can't mislead:
 *  - BarChart Y-axis ALWAYS starts at zero (domain [0, auto]); not overridable here.
 *  - LineChart non-zero baseline only via explicit `baseline` prop (labelled).
 *  - direct-friendly tooltip; tabular figures; no chartjunk; markers + dash = non-colour cues.
 *
 * Recharts is LAZY-LOADED via dynamic import() (19.13: keep chart libs off the
 * critical path) — until it resolves, the ChartFrame shows the in-shape skeleton.
 * Recharts is a peer dependency; install it in the consuming app.
 */
type FramePass = Omit<ChartFrameProps, 'children'>;

// Single lazy module loader — resolved once, shared by all chart wrappers.
type RechartsModule = typeof import('recharts');
let cached: RechartsModule | null = null;
function useRecharts(): RechartsModule | null {
  const [mod, setMod] = React.useState<RechartsModule | null>(cached);
  React.useEffect(() => {
    if (cached) return;
    let alive = true;
    import('recharts')
      .then((m) => {
        cached = m;
        if (alive) setMod(m);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return mod;
}

const tooltipStyle = {
  background: CHART_TOKENS.surface,
  border: '1px solid var(--color-border-subtle)',
  borderRadius: CHART_TOKENS.radius,
  boxShadow: CHART_TOKENS.tooltipShadow,
  fontFamily: CHART_TOKENS.font,
  fontVariantNumeric: 'tabular-nums' as const,
  color: CHART_TOKENS.text,
  padding: '8px 12px',
};

export interface LineSeries {
  key: string;
  label: string;
}

export function LineChart({
  data,
  xKey,
  series,
  baseline,
  frame,
}: {
  data: Record<string, number | string>[];
  xKey: string;
  series: LineSeries[];
  baseline?: number;
  frame: FramePass;
}) {
  const R = useRecharts();
  if (!R)
    return (
      <ChartFrame {...frame} state="loading">
        {null}
      </ChartFrame>
    );
  const {
    ResponsiveContainer,
    LineChart: RLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
  } = R;
  return (
    <ChartFrame {...frame}>
      <ResponsiveContainer width="100%" height={240}>
        <RLineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={CHART_TOKENS.grid} vertical={false} />
          <XAxis
            dataKey={xKey}
            stroke={CHART_TOKENS.axis}
            tick={{ fontSize: 12, fontFamily: CHART_TOKENS.font }}
            tickLine={false}
          />
          <YAxis
            domain={baseline != null ? [baseline, 'auto'] : [0, 'auto']}
            stroke={CHART_TOKENS.axis}
            tick={{ fontSize: 12, fontFamily: CHART_TOKENS.font }}
            tickLine={false}
            width={36}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: CHART_TOKENS.grid }} />
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={CHART_PALETTE[i % CHART_PALETTE.length]}
              strokeWidth={2}
              strokeDasharray={SERIES_DASH[i % SERIES_DASH.length]}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          ))}
        </RLineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function BarChart({
  data,
  xKey,
  valueKey,
  label,
  frame,
}: {
  data: Record<string, number | string>[];
  xKey: string;
  valueKey: string;
  label: string;
  frame: FramePass;
}) {
  const R = useRecharts();
  if (!R)
    return (
      <ChartFrame {...frame} state="loading">
        {null}
      </ChartFrame>
    );
  const { ResponsiveContainer, BarChart: RBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } = R;
  return (
    <ChartFrame {...frame}>
      <ResponsiveContainer width="100%" height={240}>
        {/* Y-axis hard-locked to start at zero — honest by default (19.4). */}
        <RBarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={CHART_TOKENS.grid} vertical={false} />
          <XAxis
            dataKey={xKey}
            stroke={CHART_TOKENS.axis}
            tick={{ fontSize: 12, fontFamily: CHART_TOKENS.font }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 'auto']}
            stroke={CHART_TOKENS.axis}
            tick={{ fontSize: 12, fontFamily: CHART_TOKENS.font }}
            tickLine={false}
            width={36}
          />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--color-surface-sunken)' }} />
          <Bar
            dataKey={valueKey}
            name={label}
            fill={CHART_PALETTE[0]}
            radius={[6, 6, 0, 0]}
            isAnimationActive={false}
          />
        </RBarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function DonutChart({
  data,
  centerLabel,
  centerValue,
  frame,
}: {
  data: { name: string; value: number }[];
  centerLabel?: string;
  centerValue?: string;
  frame: FramePass;
}) {
  const R = useRecharts();
  if (!R)
    return (
      <ChartFrame {...frame} state="loading">
        {null}
      </ChartFrame>
    );
  const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } = R;
  // part-to-whole, ≤5 slices (19.3); bordered segments = non-colour separation (19.10d).
  return (
    <ChartFrame {...frame}>
      <div style={{ position: 'relative', width: '100%', height: 240 }}>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={64}
              outerRadius={96}
              paddingAngle={2}
              stroke={CHART_TOKENS.surface}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        {(centerValue || centerLabel) && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeContent: 'center',
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            {centerValue && (
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  fontSize: '1.75rem',
                  color: 'var(--color-text-primary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {centerValue}
              </div>
            )}
            {centerLabel && (
              <div style={{ font: 'var(--type-body-s)', color: 'var(--color-text-muted)' }}>
                {centerLabel}
              </div>
            )}
          </div>
        )}
      </div>
    </ChartFrame>
  );
}
