import * as React from 'react';
import { cn } from '../lib/cn';

export interface TabItem {
  label: string;
  href: string;
  /** Outline icon (inactive) + filled icon (active) — the ≥2-cue fill swap (Part 10.8). */
  icon: React.ReactNode;
  iconActive: React.ReactNode;
  current?: boolean;
  badge?: number | string;
}
export interface BottomTabBarProps {
  items: TabItem[]; // exactly 4 primary destinations
  className?: string;
}

/**
 * Datun app-face bottom tab-bar — Part 15.8. 4 destinations, fixed bottom, NO
 * marketing header. Active = Fill icon + teal + bolder label (≥2 cues, never
 * colour-alone — Part 10.8) + aria-current. Safe-area inset (Part 4.10). Token-only.
 */
export function BottomTabBar({ items, className }: BottomTabBarProps) {
  return (
    <nav className={cn('dtn-tabbar', className)} aria-label="Primary">
      {items.map((t) => (
        <a
          key={t.href}
          href={t.href}
          className="dtn-tab"
          aria-current={t.current ? 'page' : undefined}
        >
          <span className="dtn-tab__icon" aria-hidden="true">
            {t.current ? t.iconActive : t.icon}
          </span>
          <span className="dtn-tab__label">{t.label}</span>
          {t.badge != null && (
            <span className="dtn-tab__badge" aria-label={`${t.badge} new`}>
              {t.badge}
            </span>
          )}
        </a>
      ))}
    </nav>
  );
}
