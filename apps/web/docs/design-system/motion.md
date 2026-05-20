# Datun Motion Design System

Task #50 — Motion governance, tokens, components, hooks, accessibility,
and performance contract for Datun v2.

> Motion in Datun is not decoration. It signals trust to anxious
> dental patients, demonstrates premium quality to prospective clinic
> customers, and respects the constraints of a 600M-target audience
> on 2G/3G connections. Every animation in this system earns its
> place — or it isn't shipped.

---

## Table of Contents

1. [Philosophy](#philosophy)
2. [Architecture](#architecture)
3. [Tokens](#tokens)
4. [Components](#components)
5. [Hooks](#hooks)
6. [Provider integration](#provider-integration)
7. [Accessibility contract](#accessibility-contract)
8. [Network-adaptive contract](#network-adaptive-contract)
9. [Performance contract](#performance-contract)
10. [Authoring guidelines](#authoring-guidelines)
11. [Testing strategy](#testing-strategy)
12. [Future work](#future-work)

---

## Philosophy

Motion has five distinct jobs in Datun:

1. **Anxiety management.** Roughly 40% of Indians experience dental
   fear. Soft fades and calm springs replace abrupt UI shifts that
   amplify stress.
2. **Trust signal for a free product.** B2C is free forever. Premium
   motion ("Stripe-level polish") prevents the subconscious "free =
   low quality" association.
3. **Sales lever for clinic acquisition.** Live, responsive UI in a
   live demo is the difference between "₹2,000/month is fair" and
   "Practo is cheaper anyway."
4. **AI personality during streaming.** Token-by-token Claude output
   feels janky without a typing indicator and chip animations.
   Motion turns latency into character.
5. **Rural adaptation.** Heavy parallax on a 2G phone is a freeze.
   The system degrades automatically so motion never harms users on
   slow networks.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  packages/shared/src/motion.ts                  │
│            (Single source of truth — tokens layer)              │
│   MOTION  •  DURATION  •  EASE  •  SPRING  •  DISTANCE  •       │
│                            STAGGER                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   apps/web/lib/motion/                          │
│                 (Composition layer — Variants,                  │
│            Transitions, Orchestration helpers)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              apps/web/components/motion/                        │
│         (Component layer — 17 React components + types)         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│         apps/web/components/motion/motion-config-provider       │
│       (Governance layer — single MotionConfigProvider at        │
│         the app root; reads OS pref + network; emits            │
│              telemetry; provides MotionLevelContext)            │
└─────────────────────────────────────────────────────────────────┘
```

Each layer depends only downward. Tokens have **zero React imports**
and are consumable by both CSS (legacy `MOTION` object) and JS
(`DURATION`, `EASE`, `SPRING`, `DISTANCE`, `STAGGER`).

---

## Tokens

All tokens live in `@repo/shared/motion` and are re-exported from
`@/lib/motion` for convenience.

### DURATION (seconds — Framer-native unit)

| Token      | Value | Use case                                     |
| ---------- | ----- | -------------------------------------------- |
| `instant`  | 0s    | "Skip animation" sentinel for reduced motion |
| `fast`     | 0.1s  | Micro-feedback (checkbox toggle)             |
| `quick`    | 0.15s | Tooltip, small reveal                        |
| `base`     | 0.2s  | Most transitions (hover, focus, collapse)    |
| `moderate` | 0.3s  | Page transitions, modal mount                |
| `slow`     | 0.5s  | Skeleton fade-in, list stagger               |
| `slower`   | 0.85s | Hero entrances, complex choreography         |

### EASE (Framer-compatible bezier 4-tuples)

| Token        | Use case                                  |
| ------------ | ----------------------------------------- |
| `linear`     | Progress bars, mechanical motion          |
| `easeOut`    | Soft landing — most UI defaults           |
| `easeIn`     | Exits (off-screen)                        |
| `easeInOut`  | Symmetric — rarely the right answer       |
| `smoothOut`  | Material Design "standard easing"         |
| `expoOut`    | Apple-like soft landing (heroes, drawers) |
| `anticipate` | Small overshoot — playful states          |

### SPRING (physics presets)

| Token        | Stiffness | Damping | Use case                                   |
| ------------ | --------- | ------- | ------------------------------------------ |
| `gentle`     | 100       | 30      | Toasts, banners (slow settle)              |
| `responsive` | 400       | 30      | Press/tap feedback — Stripe/Linear default |
| `bouncy`     | 500       | 15      | Emoji reactions, like/heart                |
| `stiff`      | 600       | 50      | Modal mount, sheet open (crisp, no bounce) |

### DISTANCE (pixel offsets — entry ≤ 24px for vestibular safety)

`xs: 4` · `sm: 8` · `md: 12` · `lg: 16` · `xl: 24`

### STAGGER (seconds between siblings)

`tight: 0.03` · `default: 0.05` · `loose: 0.08` · `relaxed: 0.12`

---

## Components

All components live in `apps/web/components/motion/` and are
re-exported from `@/components/motion` as a single import surface.

### Provider

- **`MotionConfigProvider`** — root provider. Mount once in
  `app/[locale]/layout.tsx` between PostHogProvider and ThemeProvider.
  Provides `MotionLevelContext` and wraps Framer's `MotionConfig` +
  `LazyMotion`.

### Refactored originals (Task #21 → Task #50)

- **`FadeIn`** — viewport-triggered fade + slide.
- **`PageTransition`** — mount-time fade for route content.
- **`PressScale`** — tactile press feedback (whileTap + whileHover).
- **`StaggerContainer` / `StaggerItem`** — list orchestration parent /
  child pattern.

### Phase 2 new components

- **`Shake`** — form-field error feedback. Wraps any input; fires on
  `aria-invalid` false → true transition; ARIA-live region announces.
- **`CheckMark`** — animated success indicator (SVG circle + path
  drawing). Used after form submit, payment, booking.
- **`CountUp`** — animated number counter. Used for the Dental Health
  Score (Task #64), homepage stats, dashboard KPIs.
- **`TypingDots`** — three-dot "AI is thinking" indicator for chat
  streaming.
- **`AnimatedChip`** — chat suggestion pill with enter/exit/hover
  animations. Supports both `layout` auto-morph and `layoutId`
  shared-element transitions.
- **`Collapse`** — height-auto expand/collapse for FAQs, accordions,
  expandable sections.
- **`LayoutMorph`** — shared-element transition wrapper (`layoutId`).
  iOS-style cross-page morph for future dashboard ↔ detail patterns.
- **`Shimmer`** — premium skeleton sweep (Instagram/Facebook gradient
  pattern). Drop-in replacement for `<Skeleton variant="shimmer">`.

### Phase 3 new components

- **`SlideInFrom`** — directional slide (top/bottom/left/right) for
  drawers, toasts, side panels. Spring or duration mode.
- **`AnimatePresenceWrapper`** — Framer's AnimatePresence with sensible
  defaults + reduced-motion Fragment bypass.
- **`PulseAttention`** — subtle CTA emphasis (cycle-limited 4% scale
  pulse). Use sparingly — emergency CTAs, idle prompts.
- **`CardHoverLift`** — standardized card hover lift (-2px y).
- **`RevealOnScroll`** — flexible viewport reveal with `replay` and
  `threshold` controls. Use for marketing pages with scroll narratives.

### Authoring vs composition

Most use cases compose from existing components:

```tsx
<AnimatePresenceWrapper>
  {open && (
    <SlideInFrom from="bottom" key="cart-sheet">
      <CartContents />
    </SlideInFrom>
  )}
</AnimatePresenceWrapper>
```

Authoring a NEW motion component is only justified when:

1. The motion is reusable across ≥ 3 sites in the app.
2. None of the existing primitives compose to the desired feel.
3. The animation needs a specific ARIA contract not captured
   elsewhere.

---

## Hooks

- **`useReducedMotion`** (Task #35) — raw OS preference.
- **`useNetworkQuality`** (Task #35) — Effective connection type.
- **`useMotionLevel`** (Task #50) — composite of the above two
  (plus future battery state). Returns
  `{ level, reason, isFull, isReduced }`. **Prefer this over the raw
  hooks** when deciding whether to animate.
- **`usePressFeedback`** (Task #50) — programmatic press animation
  controls for non-pointer events (keyboard, voice). Most use cases
  use Framer's declarative `whileTap` instead.

---

## Provider integration

`MotionConfigProvider` is mounted in `app/[locale]/layout.tsx`:

```tsx
<PostHogProvider>
  <MotionConfigProvider>
    <LocaleFont />
    <ThemeProvider …>
      {children}
    </ThemeProvider>
  </MotionConfigProvider>
</PostHogProvider>
```

The provider does four things:

1. Wires `<MotionConfig reducedMotion="user">` — Framer Motion
   automatically respects OS-level `prefers-reduced-motion`.
2. Wraps everything in `<LazyMotion features={domAnimation}>` — bundle
   reduction foundation (savings accrue as components migrate from
   `motion.*` to `m.*`).
3. Computes the effective `MotionLevel` (full / reduced / none) and
   shares it via `MotionLevelContext`.
4. Emits the `motion_level_active` PostHog event on every level
   change — letting us measure accessibility reach + slow-network
   user share.

---

## Accessibility contract

**WCAG 2.3.3 ("Animation from Interactions") is the gate.**

Two defenses, both required:

1. **JS layer.** Every component reads `useMotionLevel()`. When
   `isReduced` is true, the component renders a plain DOM equivalent
   with no Framer Motion wrapper, no animation attributes, no
   transform.
2. **CSS layer.** `app/globals.css` declares a
   `@media (prefers-reduced-motion: reduce)` block that pins
   `animation-duration` and `transition-duration` to `0.01ms` and
   forces `scroll-behavior: auto`. This catches motion authored by
   third-party libraries or Tailwind utilities outside our motion
   system's control.

Every motion component preserves:

- Semantic HTML / ARIA roles (e.g. `<CheckMark>` keeps `role="img"`).
- Screen-reader labels (`ariaLabel` props).
- Keyboard focus rings.
- Click / submit handlers (motion never gates functionality).

---

## Network-adaptive contract

`useMotionLevel()` resolves to `'reduced'` on **any** of:

- OS `prefers-reduced-motion` set (reason: `user_pref`)
- Effective connection type is `2g` or `3g` (reason: `slow_network`)
- Browser reports offline (reason: `slow_network`)
- (Future) Battery API reports low-power mode (reason: `low_power`)

Components react identically to any reduction cause — same plain-DOM
fallback. This gives every Indian user on a flaky line the same UX
contract as a user with motion sensitivity, without per-component
plumbing.

---

## Performance contract

Authoring rules — enforce in code review:

- **Only transform-friendly properties.** Animate `opacity`,
  `transform` (translate / scale / rotate). Never animate `width`,
  `height`, `top`, `left`, `margin`, `padding` — these trigger
  layout / paint and stutter on low-end Android.
  _(Exception: `<Collapse>` animates `height` with a `will-change:
height` hint — the only place we do this, and the spring-based
  transition keeps it smooth.)_
- **Memoise generated variants.** When using `buildStaggerContainer`,
  `buildFadeItem`, `buildCascadeFromTop` — wrap in `useMemo` so
  Framer's internal cache stays warm.
- **No simultaneous layout animations.** At most 1–2 elements with
  `layout` / `layoutId` per route. Layout animations are heavier than
  transforms.
- **`whileInView` requires IntersectionObserver.** All modern
  browsers support it (Safari 12.1+). Don't polyfill — rural devices
  on old browsers benefit from not running scroll animations anyway.
- **No animating box-shadow.** Use opacity on an overlay element
  instead. Shadow animations cause repaints.

---

## Authoring guidelines

When ADDING a new motion component:

1. Read the token contract. If your animation needs a new
   duration / easing / spring, add it to `packages/shared/src/motion.ts`
   first — don't hardcode at the call site.
2. Use `useMotionLevel`. Render a plain DOM fallback on `isReduced`.
3. Preserve ARIA contract. If the underlying primitive has
   `role="button"`, the motion wrapper must too.
4. Export the props type as a public type. Consumers will need it for
   their own wrappers.
5. Add to the barrel (`components/motion/index.ts`).
6. Add at least 5 vitest scenarios:
   - Renders children
   - Renders under reduced motion
   - ARIA contract preserved
   - Custom props forwarded
   - One contract-specific assertion (e.g. trigger transition logic)

When USING motion components:

- Prefer composition over authoring. `<Shake>` + `<Input>` is better
  than a new `<ShakingInput>`.
- Don't override the provider's `reducedMotion` setting at the
  component level. The provider is the single source of truth.
- For lists, use `<StaggerContainer>` + `<StaggerItem>`, not
  `motion.div` per item. The orchestration helper memoises correctly.

---

## Testing strategy

Three layers of coverage, in `apps/web/__tests__/motion/`:

1. **Token contract** (`tokens.test.ts`) — pins the shape of
   `DURATION`, `EASE`, `SPRING`, `DISTANCE`, `STAGGER`. Catches
   accidental deletion or type drift.
2. **Component contracts** (`shake.test.tsx`, `check-mark.test.tsx`,
   `count-up.test.tsx`, `typing-dots.test.tsx`,
   `slide-in-from.test.tsx`) — verify rendering + ARIA + reduced-motion
   fallback for each component.
3. **System integration**
   (`motion-config-provider.test.tsx`,
   `reduced-motion-behavior.test.tsx`, `network-adaptive.test.tsx`) —
   verify the whole motion governance system: provider wiring,
   composite hook output, all components degrading together under
   reduced motion or slow network.

What we **don't** assert:

- Frame-by-frame animation progression. jsdom has no real RAF paint
  pipeline; testing it produces flaky tests.
- Visual correctness. That's verified by Playwright / Lighthouse CI
  in a real browser (Phase 5+).

---

## Future work

Tracked in the v2 sprint backlog:

- **Migrate `motion.*` → `m.*`** across all components, then enable
  `<LazyMotion strict>` for compile-time bundle hygiene. Saves ~25KB
  gzipped on the framer-motion runtime.
- **LayoutGroup integration** for cross-route shared-element
  transitions (Task #59 patient dashboard ↔ detail).
- **Battery API integration** in `useMotionLevel` — low-power mode
  triggers `level: 'reduced'` automatically.
- **Lottie integration** for hero animations (Task #55 homepage,
  Task #76 /clinics) — token-driven via motion system but rendered
  through `lottie-react`.
- **Visual regression tests** via Playwright + Percy or similar —
  catch motion-related visual breaks that unit tests can't see.

---

_Maintainer: CTO. Questions / changes: open an issue tagged
`area:motion`._
