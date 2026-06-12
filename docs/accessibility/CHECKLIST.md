# Accessibility Checklist — Every PR That Touches UI

Task #54 · Owner: PR author · Reviewer verifies · ~3 minutes

The machines (lint → axe unit → axe E2E → Lighthouse) catch structure.
This list catches **judgment** — the things only the person who wrote
the change can know. Copy the block into the PR description and tick.

```md
### A11y checklist (docs/accessibility/CHECKLIST.md)

- [ ] 1. Every new interactive element has an accessible NAME that
     says what it DOES ("Delete consultation", not "Delete").
- [ ] 2. Keyboard-only walkthrough done: reach it, use it, leave it —
     Tab, Enter/Space, Escape. Focus never vanishes or traps.
- [ ] 3. New colors come from globals.css tokens only. No raw hex in
     components — token math is where contrast is proven.
- [ ] 4. Meaning never rides on color alone (urgency, errors, status
     each have an icon/text twin). — feeds Task #57
- [ ] 5. New images: meaningful → real alt text; decorative →
     alt="" or aria-hidden. No filename-as-alt.
- [ ] 6. Tap targets ≥ 24×24px (use .min-target if the visual must
     be smaller). Checked at mobile width, not just desktop.
- [ ] 7. New form fields: correct type + autocomplete token + label
     wired via htmlFor. Paste is never blocked.
- [ ] 8. Motion added? It respects prefers-reduced-motion (Task #50
     primitives do this for free — custom CSS must opt in).
- [ ] 9. New public ROUTE? Added to e2e/a11y/public-pages.a11y.spec.ts
     in THIS PR. New user-visible STRING? Present in all 10 locale
     bundles (check-translations will fail you anyway).
- [ ] 10. Ran `pnpm --filter web test` (axe unit) — and for page-level
      changes, `pnpm --filter web test:e2e` against a local build.
```

**When a box can't be ticked:** say why in the PR, tag it, and file
the follow-up — an honest exception beats a silent regression. The
known-limitations section of `/accessibility` (statement page) is the
public ledger for anything user-facing.

**Escalation:** anything ambiguous → ADR-0010 first; still ambiguous →
the monthly NVDA protocol decides with real assistive tech.
