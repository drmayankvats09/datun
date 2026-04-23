// ═══════════════════════════════════════════════════════════════
// SKIP TO CONTENT — Keyboard accessibility (WCAG 2.4.1)
// Hidden link, visible on Tab focus. Jumps past navigation.
// Google, GitHub, Stripe — sab use karte hain.
// ═══════════════════════════════════════════════════════════════

export function SkipToContent() {
  return (
    <a href="#main-content" className="skip-to-content focus:outline-none">
      Skip to main content
    </a>
  );
}
