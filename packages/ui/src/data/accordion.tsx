'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

/**
 * Datun Accordion / Disclosure — Part 15.11 + Part 9. Same contract as Radix
 * Accordion. Animated height (grid-rows 0fr→1fr, GPU-cheap), aria-expanded,
 * chevron rotates (the Icon system). Single or multi-open. Reduced-motion safe.
 */
export interface AccordionItem {
  id: string;
  trigger: React.ReactNode;
  content: React.ReactNode;
}
export interface AccordionProps {
  items: AccordionItem[];
  /** Allow multiple panels open at once. @default false */
  multiple?: boolean;
  defaultOpen?: string[];
  className?: string;
}

export function Accordion({
  items,
  multiple = false,
  defaultOpen = [],
  className,
}: AccordionProps) {
  const [open, setOpen] = React.useState<Set<string>>(new Set(defaultOpen));
  const toggle = (id: string) =>
    setOpen((cur) => {
      const next = new Set(multiple ? cur : []);
      if (cur.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <div className={cn('dtn-accordion', className)}>
      {items.map((it) => {
        const isOpen = open.has(it.id);
        const pid = `acc-${it.id}`;
        return (
          <div className="dtn-acc__item" key={it.id}>
            <h3 className="dtn-acc__head">
              <button
                type="button"
                className="dtn-acc__trigger"
                aria-expanded={isOpen}
                aria-controls={pid}
                id={`${pid}-btn`}
                onClick={() => toggle(it.id)}
              >
                <span className="dtn-acc__label">{it.trigger}</span>
                <svg
                  className="dtn-acc__chev"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="m6 9 6 6 6-6"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </h3>
            <div
              className="dtn-acc__panel"
              id={pid}
              role="region"
              aria-labelledby={`${pid}-btn`}
              data-open={isOpen}
            >
              <div className="dtn-acc__panel-inner">{it.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
