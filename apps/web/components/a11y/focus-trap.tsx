// ═══════════════════════════════════════════════════════════════
// FOCUS TRAP — Trap keyboard focus inside modal/drawer
// When modal is open, Tab cycles ONLY within modal elements.
// Pressing Escape closes. Pattern: ARIA dialog, Radix UI.
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect, useRef } from 'react';

interface FocusTrapProps {
  children: React.ReactNode;
  /** Whether trap is active */
  active?: boolean;
  /** Callback when Escape is pressed */
  onEscape?: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function FocusTrap({ children, active = true, onEscape }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus first focusable element
    const firstFocusable = container.querySelector<HTMLElement>(FOCUSABLE);
    firstFocusable?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onEscape?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [active, onEscape]);

  return <div ref={containerRef}>{children}</div>;
}
