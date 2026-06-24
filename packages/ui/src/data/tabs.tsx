'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Tabs — Part 15.11 + Part 9. IN-PAGE section switch (distinct from the
 * bottom tab-bar). Same contract as Radix Tabs: role=tablist/tab/tabpanel,
 * arrow-key roving focus, sliding active indicator (transform — Part 9), scroll
 * on overflow. Reduced-motion safe.
 */
export interface TabDef {
  id: string;
  label: React.ReactNode;
  content: React.ReactNode;
}
export interface TabsProps {
  tabs: TabDef[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab, className }: TabsProps) {
  const [active, setActive] = React.useState(defaultTab ?? tabs[0]?.id);
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End')
      return;
    e.preventDefault();
    let n = i;
    if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') n = 0;
    else n = tabs.length - 1;
    const nextTab = tabs[n];
    if (nextTab) setActive(nextTab.id);
    refs.current[n]?.focus();
  };

  return (
    <div className={cn('dtn-tabs', className)}>
      <div className="dtn-tabs__list" role="tablist">
        {tabs.map((t, i) => {
          const sel = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={sel}
              aria-controls={`panel-${t.id}`}
              tabIndex={sel ? 0 : -1}
              className={cn('dtn-tabs__tab', sel && 'dtn-tabs__tab--active')}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`panel-${t.id}`}
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
          className="dtn-tabs__panel"
          tabIndex={0}
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
