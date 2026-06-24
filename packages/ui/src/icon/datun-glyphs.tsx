import * as React from 'react';

/**
 * Datun custom dental glyph set — Part 10.13. The one brand-owned icon layer:
 * concepts Phosphor can't carry with the right meaning, drawn in Phosphor's EXACT
 * 24×24 grid / stroke / weights so they're indistinguishable from the family.
 *
 * Each glyph mirrors the Phosphor React API (`size`/`weight`/`color`) so it drops
 * into <Icon as={…}> unchanged. `weight="fill"` swaps Regular outline → Fill.
 * currentColor by default; never colour-alone — always pair with a label/shape.
 */
type GlyphProps = {
  size?: number | string;
  weight?: 'regular' | 'fill' | 'duotone';
  color?: string;
  className?: string;
  role?: string;
  'aria-label'?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
};

const SW = 1.75; // matches --icon-stroke

function Svg({
  size = 24,
  color = 'currentColor',
  children,
  ...rest
}: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...rest}>
      <g stroke={color} fill="none">
        {children}
      </g>
    </svg>
  );
}

/* ---- Datun tooth-mark — brand tooth + neem-leaf notch (the condition glyph) ---- */
export function DatunTooth({ weight = 'regular', color = 'currentColor', ...p }: GlyphProps) {
  const tooth =
    'M7.5 3.6C5.4 3.6 3.8 5.2 3.8 7.6c0 1.5.5 2.7 1 4.3.6 2.1.7 4.6 1.5 6.2.4.8 1.4.7 1.7-.1.7-1.7.6-3.9 1.9-3.9s1.2 2.2 1.9 3.9c.3.8 1.3.9 1.7.1.8-1.6.9-4.1 1.5-6.2.5-1.6 1-2.8 1-4.3 0-2.4-1.6-4-3.7-4-1.4 0-2.2.7-3.5.7s-2.1-.7-3.5-.7Z';
  const leaf = 'M12 7.2c1.6-.2 2.7-1.3 3-3-1.7.1-2.8 1.2-3 3Z';
  if (weight === 'fill') {
    return (
      <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" {...p}>
        <path d={tooth} fill={color} />
        <path
          d="M12 7.4c1.6-.2 2.8-1.4 3.1-3.2-1.8.1-3 1.3-3.1 3.2Z"
          fill="var(--color-surface,#fff)"
        />
      </svg>
    );
  }
  return (
    <Svg color={color} {...p}>
      <path d={tooth} strokeWidth={SW} strokeLinejoin="round" />
      <path d={leaf} stroke={color} strokeWidth={SW * 0.8} strokeLinejoin="round" />
    </Svg>
  );
}

/* ---- Triage GOOD — tooth-check (good · pairs w/ gauge; shape+label, not colour) ---- */
export function DatunTriageGood({ weight = 'regular', color = 'currentColor', ...p }: GlyphProps) {
  if (weight === 'fill')
    return (
      <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" {...p}>
        <circle cx="12" cy="12" r="9" fill={color} />
        <path
          d="M8.2 12.2 11 15l5-5.4"
          stroke="var(--color-surface,#fff)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  return (
    <Svg color={color} {...p}>
      <circle cx="12" cy="12" r="9" strokeWidth={SW} />
      <path
        d="M8.2 12.2 11 15l5-5.4"
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ---- Triage ATTENTION — clock/keep-watch ---- */
export function DatunTriageAttention({
  weight = 'regular',
  color = 'currentColor',
  ...p
}: GlyphProps) {
  if (weight === 'fill')
    return (
      <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" {...p}>
        <circle cx="12" cy="12" r="9" fill={color} />
        <path
          d="M12 7.5V12l3 2"
          stroke="var(--color-surface,#fff)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  return (
    <Svg color={color} {...p}>
      <circle cx="12" cy="12" r="9" strokeWidth={SW} />
      <path d="M12 7.5V12l3 2" strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/* ---- Triage URGENT — warning triangle (shape differs from good/attention) ---- */
export function DatunTriageUrgent({
  weight = 'regular',
  color = 'currentColor',
  ...p
}: GlyphProps) {
  if (weight === 'fill')
    return (
      <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" {...p}>
        <path
          d="M13.7 3.9 22.2 18a2 2 0 0 1-1.7 3H3.5a2 2 0 0 1-1.7-3L10.3 3.9a2 2 0 0 1 3.4 0Z"
          fill={color}
        />
        <path
          d="M12 9v4.2M12 16.4h.01"
          stroke="var(--color-surface,#fff)"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    );
  return (
    <Svg color={color} {...p}>
      <path
        d="M13.7 3.9 22.2 18a2 2 0 0 1-1.7 3H3.5a2 2 0 0 1-1.7-3L10.3 3.9a2 2 0 0 1 3.4 0Z"
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <path d="M12 9v4.2M12 16.4h.01" strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

/* ---- Doctor-backed report — sheet + seal/check ---- */
export function DatunReport({ weight = 'regular', color = 'currentColor', ...p }: GlyphProps) {
  if (weight === 'fill')
    return (
      <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" {...p}>
        <path d="M6 2.5h7l5 5V21a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 6 21V2.5Z" fill={color} />
        <path
          d="M13 2.5V7a.5.5 0 0 0 .5.5H18"
          fill="none"
          stroke="var(--color-surface,#fff)"
          strokeWidth="1.4"
        />
        <circle cx="12" cy="14.5" r="3.2" fill="var(--color-surface,#fff)" />
        <path
          d="M10.6 14.6l1 1 1.8-2"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  return (
    <Svg color={color} {...p}>
      <path
        d="M6 2.6h7l5 5V20.8a.6.6 0 0 1-.6.6H6.6a.6.6 0 0 1-.6-.6V3.2a.6.6 0 0 1 .6-.6Z"
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <path d="M13 2.6V7a.6.6 0 0 0 .6.6H18" strokeWidth={SW} strokeLinejoin="round" />
      <circle cx="12" cy="14.4" r="3" strokeWidth={SW * 0.85} />
      <path
        d="M10.7 14.5l.95.95 1.7-1.9"
        strokeWidth={SW * 0.85}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ---- Clinic-verified — shield + check ---- */
export function DatunVerified({ weight = 'regular', color = 'currentColor', ...p }: GlyphProps) {
  if (weight === 'fill')
    return (
      <svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" {...p}>
        <path
          d="M12 2.5c2.4 1.7 4.7 2.2 7 2.2v7c0 4.6-3.1 7.3-7 9-3.9-1.7-7-4.4-7-9v-7c2.3 0 4.6-.5 7-2.2Z"
          fill={color}
        />
        <path
          d="M8.6 12.2 11 14.6l4.4-4.8"
          stroke="var(--color-surface,#fff)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    );
  return (
    <Svg color={color} {...p}>
      <path
        d="M12 2.6c2.4 1.7 4.7 2.2 7 2.2v6.9c0 4.6-3.1 7.3-7 9-3.9-1.7-7-4.4-7-9V4.8c2.3 0 4.6-.5 7-2.2Z"
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <path
        d="M8.6 12.2 11 14.6l4.4-4.8"
        strokeWidth={SW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export const DATUN_GLYPHS = {
  DatunTooth,
  DatunTriageGood,
  DatunTriageAttention,
  DatunTriageUrgent,
  DatunReport,
  DatunVerified,
};
