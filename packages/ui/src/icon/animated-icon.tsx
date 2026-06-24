'use client';

import * as React from 'react';

/**
 * Datun animated icons — Part 10.12 (restraint). Two signature Lottie moments;
 * everything else is CSS micro-interaction (outline→fill cross-fade via .dtn-icon-swap).
 *
 * - Lazy-loaded (dynamic import of lottie-react + the JSON) so the bundle stays lean.
 * - Static fallback under prefers-reduced-motion (no animation, just the end-state SVG).
 * - Copy law (Part 12.4): the loader says "Reviewing…" — NEVER "Analyzing with AI".
 *
 * JSON lives in packages/ui/src/icon/lottie/{success-check,reviewing}.json (≤10KB each).
 */
export type AnimatedName = 'success-check' | 'reviewing';

const FALLBACK: Record<AnimatedName, React.ReactNode> = {
  'success-check': (
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="20" fill="var(--color-success)" />
      <path
        d="M16 24.5 21.5 30 33 18"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  reviewing: (
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" aria-hidden="true">
      <circle cx="24" cy="24" r="18" stroke="var(--color-border-default)" strokeWidth="4" />
      <path
        d="M24 6a18 18 0 0 1 18 18"
        stroke="var(--color-text-link)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export interface AnimatedIconProps {
  name: AnimatedName;
  size?: number;
  loop?: boolean;
  /** Honest label, never "AI" (Part 12.4). */
  label?: string;
}

export function AnimatedIcon({ name, size = 48, loop, label }: AnimatedIconProps) {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [Lottie, setLottie] = React.useState<React.ComponentType<Record<string, unknown>> | null>(
    null,
  );
  const [data, setData] = React.useState<unknown>(null);

  React.useEffect(() => {
    if (reduced) return;
    let alive = true;
    Promise.all([
      import('lottie-react').then((m) => m.default),
      import(`./lottie/${name}.json`).then((m) => m.default),
    ])
      .then(([L, json]) => {
        if (alive) {
          setLottie(() => L as unknown as React.ComponentType<Record<string, unknown>>);
          setData(json);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [name, reduced]);

  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  if (reduced || !Lottie || !data) {
    return (
      <span
        style={{ display: 'inline-grid', placeItems: 'center', inlineSize: size, blockSize: size }}
        {...a11y}
      >
        {FALLBACK[name]}
      </span>
    );
  }
  return (
    <span style={{ inlineSize: size, blockSize: size }} {...a11y}>
      <Lottie
        animationData={data}
        loop={loop ?? name === 'reviewing'}
        style={{ width: size, height: size }}
      />
    </span>
  );
}
