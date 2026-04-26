// ═══════════════════════════════════════════════════════════════
// LANG SPAN — Marks inline text with its language
// When English medical term appears in Hindi page,
// screen readers need to know it's English.
// Pattern: WCAG 3.1.2 — Language of Parts.
// ═══════════════════════════════════════════════════════════════

interface LangSpanProps {
  lang: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Marks inline text with its language for screen readers.
 *
 * @example
 * ```tsx
 * // Hindi page with English medical term
 * <p>आपको <LangSpan lang="en">Root Canal</LangSpan> की जरूरत है।</p>
 * ```
 */
export function LangSpan({ lang, children, className }: LangSpanProps) {
  return (
    <span lang={lang} className={className}>
      {children}
    </span>
  );
}
