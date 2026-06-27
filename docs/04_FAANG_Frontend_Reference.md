# Datun — FAANG-Grade Frontend Master Reference (2026 → 2031)

**What this is:** the complete A-to-Z of what goes into a world-class, FAANG-level frontend — every layer, every technique, every tool — synthesised from 140+ current (2026) sources and filtered through a 50-yr-CTO + Harvard-design lens. Nothing left out.

**How to read it:** each section = a domain. For each, you get _what it is_, the _specific 2026 techniques/tools_, and a **→ Datun** note: whether/where/how we use it for Datun (premium, calm, trusted dental platform; iOS-leaning; PWA-first; one installable app with a **website-face** = marketing landing and an **app-face** = product `/consult` + `/dashboard`).

**The golden rule (read this first):** A FAANG frontend is not "more effects." It is **restraint + craft + speed + calm.** In 2026 the mature consensus is _calmer interfaces, disciplined motion, the end of visual theatrics_ — people are overstimulated and reward clarity. Structural choices (design system, tokens, dark mode, bento layout, performance) **compound**; polish choices (kinetic type, glass, 3D) are used **surgically, never systematically.** Datun, as a trust/health brand, lives or dies on this discipline.

---

## 0. The Operating Philosophy (the part most teams skip)

- **Intentionality over trend-chasing.** Every motif must communicate something specific about the brand or reduce user effort. If it doesn't, cut it.
- **Calm-tech for health.** Anxious/decision-making users reward whitespace, one primary action per screen, alert colour only for genuine warnings, and "someone thoughtful is behind the screen."
- **The system is the expensive 50-year asset; the hue/effect is a swappable token.** Lock the system, tune the surface.
- **Performance is a feature, not a phase.** Sites passing Core Web Vitals see ~24% lower bounce. INP failures directly cost rankings and trust.
- **Accessibility is baseline, not a bolt-on** (and now legally enforced in the EU via the European Accessibility Act, June 2025).
- **Pixel-craft everywhere — even where "no one looks."** The finish of the unseen back panel is what separates FAANG from "fine."

---

## 1. Architecture & Engineering Foundations

**Framework & rendering**

- **React + Next.js App Router** (Datun is already here, Next 16). Industry-dominant; integrates with everything below.
- **React Server Components (RSC) by default**; `"use client"` only at interactive _leaves_ (protects bundle size + INP). Server components ship **zero JS**.
- **Rendering strategies — know all five and mix per route:** SSG (fast, can be stale), SSR (fresh, slower TTFB), ISR (regenerate periodically), CSR (interactive client-heavy), and **PPR (Partial Prerendering)** — the 2026 winner: static shell served instantly from CDN, dynamic "holes" streamed in behind `<Suspense>`. Best of SSG's TTFB + SSR's freshness.
- **Next 16 Cache Components** (`use cache`, `cacheLife()`, `cacheTag()`, `revalidateTag()`, `revalidatePath()`): caching is now **opt-in**; dynamic-by-default. PPR is the default behaviour once `cacheComponents` is on. `<Activity>` preserves component state across navigation (hidden, not unmounted).
- **Server Actions** for mutations (no hand-rolled API routes for form posts).
- **Streaming + Suspense** to kill request waterfalls — render the shell, stream data as it resolves.
- **`proxy.ts`** replaces middleware in Next 16 (clarifies the network boundary).
- **Turbopack** = stable for dev (big DX win in monorepos); production builds still Webpack in 16, prod-Turbopack landing later 2026.
- **Next Devtools MCP** for AI-assisted debugging.

**Code & team architecture**

- **Component architecture:** atomic design or **feature-first folders**; small composable units mapped to business concepts; clear module boundaries with explicit interfaces so internals can change without breaking consumers.
- **Monorepo** (Turborepo + pnpm — Datun has this) with a shared `packages/ui` design-system package consumed by both apps.
- **TypeScript everywhere**, strict; types are the contract.
- **Micro-frontends:** know them, but **avoid** unless you have many teams on one product — over-engineering early compounds badly. Not for Datun now.
- **State of state management (pick by need, layer them):**
  - _Server/cache state_ → **TanStack Query** or RSC + Server Actions (most "state" is really server cache).
  - _Local UI state_ → `useState`/`useReducer`.
  - _Global client state_ → **Zustand** (simple) or **Jotai** (atomic). Avoid Redux unless genuinely needed.
  - _URL as state_ → search params for shareable/filter state.
  - _Forms_ → **React Hook Form + Zod** (schema validation shared client+server), or Server Actions with Zod.
- **→ Datun:** website-face = mostly static + PPR (instant CDN shell, SEO/GEO). App-face (`/consult`, `/dashboard`) = RSC for data, `"use client"` leaves for the chat/voice/interaction, Server Actions for save, TanStack Query for consultation history. The conversational diagnosis stream is a streaming-Suspense use case.

---

## 2. Design System & Tokens (the spine)

- **Three-tier token hierarchy** (industry standard — Material 3, Salesforce Lightning, Adobe Spectrum, Carbon, Atlassian all do this):
  1. **Primitive/global tokens** — raw values (`color.teal.500`, `space.4`, hex/px).
  2. **Semantic/alias tokens** — role + intent (`color.surface.primary`, `color.text.brand`, `bg.danger.weak`). **Components reference _these_, never raw values.**
  3. **Component tokens** — scoped overrides for a single component's context.
- **Theming = a token-set swap, not find-and-replace.** Light/dark/high-contrast/multi-brand = remap the same semantic names to different primitives. One change propagates everywhere; **zero drift**.
- **Naming carries usage:** `group/role/prominence/state` → `bg/brand/default`, `bg/positive/weak`, `bg/danger/weakest`, plus `hover`/`pressed` states for each.
- **Tooling:** define in JSON (the **W3C Design Tokens** format), generate platform outputs with **Style Dictionary** in CI/CD. In a Tailwind v4 / Next monorepo, tokens live as CSS custom properties + Tailwind theme.
- **Documentation lives where people work** (in-repo + a visualized reference; external docs get forgotten). The "3-minute test": a new designer must place + configure a button correctly in 3 minutes, or the system is too complex.
- **→ Datun:** this is the 50-year asset. Build primitive → semantic → component, with the **brand accent as ONE token** so the colour debate is a 1-line change forever. Shared `packages/ui` feeds both website-face and app-face. Spacing on a **4/8 base** (4, 8, 12, 16, 24, 32, 48). Radii moderate (premium-calm, not pill-everything; smaller reads more clinical/professional, larger reads friendlier — pick deliberately).

---

## 3. Colour System

- **OKLCH is the 2026 standard colour space** (perceptually uniform — lightness actually means lightness across hues). Pair with **`color-mix()`** to generate tints/shades/states from a seed: teams have collapsed 900-line colour systems into ~80 lines.
- **Wide-gamut P3** for richer colour on modern displays (with sRGB fallback).
- **Dark mode is infrastructure, not a preference:** OLED true-black pixels draw zero power (YouTube dark mode = ~43% less power on OLED at full brightness); system-level dark mode is now an _expectation_ — a broken dark mode is a visible failure. Ship light + dark at **equal quality**, built on surface-hierarchy + semantic tokens, tested on real OLED hardware, respecting `prefers-color-scheme`.
- **Contrast + colour-blind safety:** WCAG AA contrast; **never encode meaning in colour alone** — pair with icon + label (≈8% of men have red/green deficiency).
- **`prefers-contrast`** support for high-contrast users.
- **2026 colour zeitgeist:** the dominant direction is **warm, muted, earthy** — Pantone's 2026 Color of the Year is _Cloud Dancer_ (a soft warm white); palettes of clay/soil/wood read calm, human, authentic, and **age well** (timeless because humans have lived among them for millennia). The opposite pole ("dopamine"/neon) is for youth/lifestyle brands.
- **→ Datun:** warm-bone canvas + warm-ink text + a single warm accent, generated from one OKLCH seed via `color-mix()` (secondary/tints/states auto-derived). A **semantic triage scale** (calm/caution/urgent) used _only inside results_, always with icon + label, never as page chrome. Genuine premium-calm dark mode for the app-face.

---

## 4. Typography

- **Variable fonts are mandatory in 2026** (95%+ support since 2021). One file (~100-200KB) replaces 4-8 static files (400-800KB) → faster LCP, lower CLS. Axes you control live in CSS via `font-variation-settings` / `font-weight` / `font-stretch` / `font-optical-sizing`:
  - **Standard axes:** `wght` (100-900, _any_ value — `475` is valid), `wdth` (width), `slnt` (slant), `ital`, **`opsz` (optical size — letterforms refine by size; critical for display-vs-body legibility)**.
  - **Custom axes** per font: `GRAD` (grade — weight without width change), `CASL` (casual), etc.
- **Format:** **WOFF2 only** (Brotli; ~30% smaller than WOFF, ~50% smaller than TTF). **Subset** aggressively (only the glyphs/langs you serve). Use **`size-adjust`** + `font-display` to control fallback swap and **prevent CLS**. **Preconnect/preload** the critical font.
- **Fluid type:** `clamp()` with `vw`+`rem` (or a calc-based fluid scale), a **modular type scale**, and **unitless `line-height`** (so leading scales with size and text doesn't clash when fluid scaling kicks in). Use `rem`/`vw`, never fixed `px`, for sizes.
- **Hierarchy via weight + size + tracking, not decoration.** Serif = tradition/authority/editorial depth; sans = clean/modern/best at small screen sizes; system fonts = zero-load utility; custom fonts = luxury differentiation.
- **Kinetic typography** (text that stretches/twists/reacts to cursor) is a real 2026 hero technique — variable fonts make it cheap. **Use on the hero headline only.**
- **Accessibility:** support 400% text zoom, `prefers-contrast`, minimum tap targets.
- **→ Datun:** the foundation already uses a clean humanist sans + an editorial serif for hero + a mono for numerals — a genuinely world-class, license-clean pairing. Keep it. Variable + WOFF2 + subset + fluid `clamp` + unitless line-height. Reserve any kinetic/serif drama for the _one_ hero moment; the product UI stays calm and legible.

---

## 5. Spacing, Layout & Grid

- **Fixed spacing scale** (4/8 base) eliminates "why does this feel off" inconsistency.
- **CSS Grid + Flexbox**; **subgrid** for nested alignment.
- **Container queries** — components respond to _their container's_ size, not the viewport (replaces piles of media-query overrides; a card adapts wherever it's placed). Plus **`@container scroll-state(stuck)`** to style sticky elements when they stick — no scroll-listener JS.
- **Bento grids** — the dominant 2026 layout (Apple-origin): modular asymmetric blocks that present dense info as organised + dynamic. **Requires real editorial prioritisation** ("what deserves a big block vs small") — strategic work, not a CSS paste.
- **Fluid everything** via `clamp()`/`min()`/`max()`; `aspect-ratio` to hold proportions (prevents CLS).
- **Logical properties** (`margin-inline`, `padding-block`, `inset`) for clean i18n/RTL.
- **`@scope`** for true style encapsulation (kills global CSS collisions); cascade layers (`@layer`) to tame specificity.
- **→ Datun:** bento for "what Datun does / capabilities / trust signals" on the website-face (with honest editorial prioritisation — the two doors get the big blocks). Container queries so cards work identically on website-face and app-face. Logical properties from day one (10 languages).

---

## 6. Iconography, Imagery & Media

- **Icons:** use a consistent system (variable icon font _or_ an SVG set with uniform stroke/fill). **Import SVGs as React components (SVGR)** — stylable via CSS, props for colour/size, no `<img>` overhead. Don't process SVGs through image optimizers.
- **Raster images — the single biggest perf lever** (images are the LCP element on ~85% of desktop / ~76% of mobile pages and ~48% of page weight):
  - **AVIF first** (~94.9% support, ~50% smaller than JPEG) → **WebP fallback** (~96.4%, 25-35% smaller) → JPEG last. Use `<picture>`; **never ship a single format.**
  - **`fetchpriority="high"`** on the LCP/hero image (Google's own test: LCP 2.6s → 1.9s from this one attribute). **`decoding="async"`.**
  - **NEVER lazy-load the LCP image** (the #1 self-inflicted perf wound); **lazy-load everything below the fold** (`loading="lazy"`).
  - **Always set explicit `width`/`height`** (or `aspect-ratio`) → prevents CLS.
  - For CSS `background-image` heroes, **`<link rel="preload" as="image">`** (CSS bg images aren't discovered until CSS parses).
  - `sizes` + `srcset` for responsive delivery; convert with **Sharp/libvips** (4-5× faster, lower memory than ImageMagick).
- **`next/image`** automates format/responsive/lazy/caching/dimensions — use it, allowlist external hosts.
- **→ Datun:** keep marketing pages image-light and lean (India data-cost sensitivity, even on fast networks). One optimised hero (AVIF+`fetchpriority=high`, dimensions set), everything else lazy. SVG icons as components. No stock-photo bloat — the brand reads premium through type + space, not heavy imagery.

---

## 7. Motion & Animation

**Principles (this is where taste shows):**

- **Springs for interactive UI** (buttons, modals, tabs, drags — they model real physics and feel alive); **easing/tween for decorative/sequential** motion (page transitions, scroll reveals). Keep spring **bounce < 0.1** for product UI (higher = playful/distracting).
- **Choreography:** stagger, orchestrate (parent → children), respect a consistent timing language. Fast + subtle.
- **`prefers-reduced-motion` is non-negotiable** — provide a calm fallback; WCAG requires interaction-triggered motion be disable-able unless essential.

**The toolkit (use the right tool):**

- **Motion (formerly Framer Motion)** — the de-facto React standard (powers Vercel/Linear/Raycast/Figma; 30M+ downloads/mo). Declarative: `initial`/`animate`/`exit`, **`layoutId`** (shared-element transitions), **`AnimatePresence`** (exit animations done right), gestures (`drag`/`hover`/`tap`), **`whileInView`** (scroll reveals), variants (orchestration), **`useReducedMotion`**. Hybrid engine runs on the Web Animations API + ScrollTimeline at up to 120fps, falls back to JS for springs/gestures.
- **GSAP** — now **100% free incl. all premium plugins** (ScrollTrigger, **ScrollSmoother**, **SplitText**, **MorphSVG**, **DrawSVG**, Flip). The industry standard for _complex/performance-critical/timeline/award-winning_ work (DOM/SVG/Canvas/WebGL, millisecond precision). Best for orchestrated scroll narratives and anything intricate.
- **React Spring** — small physics-based lib (mass/tension/friction) when you want natural motion with a tiny API.
- **Native CSS** is increasingly enough: **scroll-driven animations** (`animation-timeline: scroll()` / `view()` with `animation-range` — reveals, progress bars, parallax with **zero JS**, often replacing a 45KB scroll library), **View Transitions API** (native-app-style page/state transitions with a few lines of CSS — guard behind `prefers-reduced-motion`), **`@starting-style`** (flash-free enter animations), and **`linear()` easing** (replicate spring curves in pure CSS).
- **Smooth scroll:** **Lenis** (modern, lightweight) or Locomotive — override native scroll for buttery, controlled motion **synchronised with scroll-triggered animations**. (Use carefully; can fight accessibility/scroll-anchoring if overdone.)
- **Signature micro-interactions:** magnetic buttons, cursor-reactive elements, hover weight-shifts on variable fonts, animated checkmarks/success states, parallax 3.0 (physics-based), colour-diffused "glowing" shadows on press.

**→ Datun:** Motion as the workhorse (springs for UI, `AnimatePresence` for the chat/drawer, `layoutId` for card→detail). CSS scroll-driven reveals for the marketing page (cheap + perf-safe). View Transitions to make the PWA feel native between routes. GSAP **only** if a specific hero scene needs orchestration. **Everything subtle** — this is a calm health brand; motion provides _feedback and continuity_, never spectacle. `prefers-reduced-motion` honoured globally.

---

## 8. 3D, WebGL & WebGPU

- **Three.js** (+ **React Three Fiber** for declarative R3F + **Drei** helpers) is the standard for web 3D. **OGL** for ultra-light effects. **Spline** for designer-friendly 3D, **glTF** for models.
- **Shaders (GLSL):** custom fragment/vertex shaders for gradients, distortion, glow, particle systems, cursor-reactive luminescence — the stuff that wins Awwwards Developer Awards.
- **WebGPU** is the next-gen graphics API (successor to WebGL) — more performant, compute shaders; adoption maturing through 2026. Worth tracking for 2031.
- **Performance reality:** award sites hit 60fps desktop / 45-50fps mobile by **isolating the canvas on its own GPU layer**, disposing renderers on unmount (`WEBGL_lose_context`) to avoid memory leaks, and keeping geometry/shaders lean. 3D and performance are **not** mutually exclusive _if engineered_.
- **→ Datun:** **Be disciplined.** Heavy WebGL/Three.js on marketing pages drains the perf budget and clashes with a calm health brand. A 3D blob hero was rightly rejected. If 3D ever earns its place, it's a _small, purposeful, accessible_ moment (e.g., a subtle tooth/landmark visual), GPU-isolated, with a static fallback and `prefers-reduced-motion` off-switch — never the whole hero. Default: **skip it**, win premium through type/space/motion instead.

---

## 9. Depth, Surface & Material Treatments

- **Shadows:** the 2026 move is **soft, diffused, _coloured_ shadows** (a tint of the surface/brand) that make elements feel like they glow — not harsh black drop shadows. Layered elevation system as tokens.
- **Glassmorphism → "Liquid Glass":** translucent layers via `backdrop-filter: blur()` + `mix-blend-mode` + SVG masks, now simulating refraction/optical depth. **Performance trap:** un-optimised `backdrop-filter` tanks mobile below 30fps — isolate on its own GPU layer (`will-change: transform`). **Rule: glass on navigation + modals only, never as systematic decoration.** Blur should communicate hierarchy (foreground vs receding vs interactive).
- **Neo-/"nuanced" brutalism:** raw grids, dominant type, no roundness — but applied with real UX logic. (A counter-reaction to AI-sameness; signals human authenticity.)
- **Claymorphism / aurora gradients / grain textures** — niche; brand-dependent.
- **Borders:** hairline + tokenised; depth via shadow + overlap, **not colour alone**.
- **→ Datun:** soft, low-opacity, **slightly warm-tinted** shadows; moderate radii; depth through layering. A _whisper_ of glass on the app-face nav/sheets at most. No brutalism (wrong for trust/calm). Nothing glossy.

---

## 10. Performance Engineering (Core Web Vitals 2026)

**Targets (p75):** **LCP ≤ 2.5s**, **INP ≤ 200ms** (replaced FID; measures _all_ interactions through the page life), **CLS ≤ 0.1**. ~47% of sites fail; passing all three ≈ 24% lower bounce.

**LCP:** preload/`fetchpriority=high` the hero, optimise it (AVIF, dimensions), avoid render-blocking CSS/JS, fast TTFB (edge/CDN, PPR shell). One preload for one LCP resource (preload abuse hurts).

**INP (the hard one — a JS-architecture mindset):**

- Any task > 50ms is a "long task" blocking the main thread. **Break long tasks** and **yield**: **`scheduler.yield()`** (the single most useful INP API) or `setTimeout(0)` fallback — paint the interaction state _immediately_, then do the expensive work after a yield. This pattern alone typically drops p75 INP **60-65%**.
- **`scheduler.postTask()`** with priorities (`user-blocking` for UI, `background` for analytics/logging).
- **React `useTransition`/`startTransition`** to mark non-urgent updates deferrable; React Fiber yields between units so clicks interrupt rendering.
- **Defer third-party scripts** (GTM, FB pixel, chat widgets, consent) to idle — they're the most common INP killers. Minimise DOM size; avoid layout thrashing/reflow.

**CLS:** explicit `width`/`height`/`aspect-ratio` on all media; **reserve space** (`min-height`) for late-loading widgets/ads; `size-adjust` on fonts; avoid inserting content above existing content.

**Loading & delivery:**

- **Code-split + lazy-load** (route + component level), tree-shake, drop unused deps/UI-lib bloat.
- **Prefetch/preload/preconnect**; the **Speculation Rules API** for instant next-page navigation.
- **Edge rendering + CDN**; **Brotli** compression.
- **Hydration:** partial/progressive/islands; watch the space (Qwik = resumability, no hydration). RSC already cuts client JS massively.
- **Web Workers** to offload heavy compute off the main thread; **WebAssembly** for compute-heavy paths.
- **Measure in the field (RUM)**, not just lab — p75 is your worst real interactions.

**→ Datun:** Lighthouse is informational until the deferred Task #53.5 — but the _patterns_ above are free to bake in now (yield on the consult interactions, defer analytics, reserve space, AVIF hero). PPR shell + lean payloads = instant feel on Indian networks. The chat/diagnosis stream is exactly where `scheduler.yield` + `useTransition` keep INP green.

---

## 11. PWA & Native-Feel (Datun is PWA-first — this is core)

- **Service worker** = the engine: intercepts all requests; enables offline, caching, push, background sync. Use **Workbox** to manage lifecycle. Register early; it auto-updates (new SW installs in background, activates when tabs close / on refresh).
- **Caching strategy per content type:** **cache-first** (static assets), **network-first** (API/dynamic), **stale-while-revalidate** (instant load + silent background update). Wrong strategy = stale-data bugs or wasted requests. **App-shell caching** → repeat loads in milliseconds (2-3× faster than native; warm-cache LCP < 1s).
- **Web App Manifest:** `name`, `short_name`, `start_url`, `display: standalone`, `icons` (maskable), `theme_color`, `background_color` → installability.
- **Push notifications, background sync, periodic sync** — but **all are progressive enhancements** (feature-detect, always have an in-page fallback).
- **iOS reality (critical for Datun's iOS-leaning premium audience):** Safari/WebKit only; **no Background Sync**, **no silent/background push**, push works **only after Home-Screen install** (iOS 16.4+) and is multi-step opt-in; service-worker push can be unreliable after restarts; cache can expire — **re-cache critical assets on every launch, keep cache small (app shell first), handle misses gracefully.** Installation is **manual** → you must _teach_ users to "Add to Home Screen." Handle the notch/Dynamic Island with **`apple-mobile-web-app-status-bar-style`** + **`env(safe-area-inset-*)`** CSS or the UI gets obscured. (EU users may lack standalone PWA mode under DMA — plan regionally.)
- **Offline writes:** queue in **IndexedDB**, replay on reconnect (Background Sync where available, in-page retry everywhere else).
- **→ Datun:** website-face = installable, fast, app-shell, no app tab-bar. App-face = full app-shell + bottom tab-bar + offline consult drafts (IndexedDB queue) + push _where supported_. Build a graceful **"install Datun" coach** for iOS. Treat push/bg-sync as bonuses, never as the core delivery mechanism — back them with WhatsApp/email (Datun already does follow-ups via WhatsApp, which sidesteps iOS push limits entirely — keep that as the reliable channel).

---

## 12. Responsive & Adaptive

- **Mobile-first**, but **container queries** are the real upgrade (component-level responsiveness > global breakpoints).
- **Fluid** sizing (`clamp`) so you're not hand-tuning every breakpoint.
- **Touch targets ≥ 24×24px** (WCAG 2.2) — realistically 44px for comfortable taps; adequate spacing.
- **Modern viewport units:** `dvh`/`svh`/`lvh` (dynamic/small/large viewport height) to handle mobile browser chrome correctly.
- **Safe areas** (`env(safe-area-inset-*)`) for notch/Dynamic Island/home indicator.
- **Foldables/large screens:** test hinge/fold presets; shift the grid so words don't split across the physical fold.
- **Gestures:** swipe, pull-to-refresh, sheet drags — make the web app _feel_ native.
- **→ Datun:** premium-urban iOS-first means flawless iPhone rendering (notch, dynamic island, safe areas, dvh), comfortable tap targets, native-feeling sheet/drawer gestures, container-query components that scale to tablet/desktop without rework.

---

## 13. Accessibility (baseline + legal)

- **WCAG 2.2 AA** (Datun's Task #54 — done). The **9 new 2.2 criteria:** Focus Not Obscured (Min/Enhanced), Focus Appearance, **Dragging Movements** (always offer a non-drag alternative — buttons/taps), **Target Size 24×24**, **Consistent Help** (help in the same place across pages), **Redundant Entry** (don't re-ask info), **Accessible Authentication** (don't force memory/cognitive tests — support passkeys/paste). (`4.1.1 Parsing` was removed.)
- **ARIA 1.2** + **semantic HTML first** (use real `<button>`/`<dialog>`/`<nav>`; a `<div>` "dialog" is invisible to screen readers).
- **Focus management:** visible, high-contrast, **never obscured by sticky UI**; logical focus order; skip-links / bypass blocks; manage focus on route/modal changes.
- **Keyboard:** everything operable without a mouse.
- **Reduced motion / reduced transparency / `prefers-contrast`** respected.
- **Cognitive accessibility:** plain language, predictable behaviour, reduced confusion (perfect fit for a calm health brand).
- **POUR** (Perceivable, Operable, Understandable, Robust). EAA (EU, June 2025) makes this a compliance matter, not just UX.
- **→ Datun:** already AA. Maintain it as a gate as the UI grows; lean into cognitive-accessibility (plain language, one action per screen) since it doubles as the brand's calm/trust promise. Headless primitives (below) give you most a11y for free.

---

## 14. Interaction Patterns & Component Primitives

- **Headless primitives** (a11y + keyboard + ARIA + interaction logic, zero styling — you bring the tokens):
  - **Radix UI** — battle-tested (130M downloads/mo) but dev has slowed since the WorkOS acquisition.
  - **Base UI** — MUI-backed, full-time engineering, better TS types/cleaner APIs for complex patterns (combobox, multi-select) — the rising choice.
  - **shadcn/ui** — _not_ truly headless: it ships styles **you own and restyle**. Now supports **both Base UI and Radix** primitives; has a Visual Builder. (Datun uses shadcn primitives restyled to its tokens — solid; consider Base UI under the hood for complex widgets.)
- **Core patterns to nail:**
  - **Optimistic UI** (update instantly, reconcile with server) — feels fast.
  - **Skeleton screens** for loading; **thoughtful empty states**; **clear error states** (never a raw error).
  - **Toasts, dialogs, drawers/sheets, popovers, tooltips** — accessible, focus-trapped.
  - **Command palette** (`cmdk`) for power users.
  - **List virtualization** (TanStack Virtual) + infinite scroll for long lists (consultation history).
  - **Drag-and-drop** (with non-drag alternative per WCAG).
  - **Native CSS Popover API + `<dialog>`** + anchor positioning increasingly replace JS libraries for menus/tooltips/popovers.
- **Haptics** (Vibration API on supported devices) for tactile feedback on key actions.
- **→ Datun:** optimistic UI + skeletons for the consult/dashboard; calm, focus-trapped sheets for the chat and assessment card; `cmdk`-style quick search for clinics/history later; virtualized history. Empty/error states written in the brand's plain, reassuring voice.

---

## 15. Internationalisation (Datun = 10 languages)

- **`next-intl`** (Datun has this) for messages/routing; locale-aware number/date/currency formatting (`Intl`).
- **Logical CSS properties** so layouts mirror correctly for **RTL** (Urdu).
- **Variable fonts with the right glyph coverage** per script; subset per locale.
- **Locale switches only on explicit user choice** (Datun rule); never auto-detect-and-override.
- **UI copy = FAANG-grade pro English** (no casual Hinglish in UI), re-researched per surface, locale strings swapped on selection.

---

## 16. Security (frontend)

- **CSP with nonces** (Datun has this — protect it; note third-party-injected scripts like Cloudflare's must be fixed at the config layer, not in CSP code), `strict-dynamic`, Trusted Types where possible.
- Sanitise any user/markdown HTML; avoid `dangerouslySetInnerHTML` without sanitisation.
- Own JWT/auth (Datun does this — no third-party redirect), httpOnly cookies, CSRF protection on Server Actions.
- Subresource Integrity for external scripts; allowlist image/script hosts.

---

## 17. SEO, GEO & AI-Readability (now a ranking _and_ discovery layer)

- **Core Web Vitals feed rankings** (covered in §10).
- **Structured data (JSON-LD):** `MedicalOrganization` + `WebSite` (`SearchAction` + `Speakable`) + `FAQPage` + `BreadcrumbList` (Datun's stack).
- **GEO / AI-readability is non-negotiable in 2026:** ship **`llms.txt`** + **`agents.json`** alongside JSON-LD; answer-first FAQ blocks; stat density. **Test it:** ask ChatGPT/Perplexity/Copilot about your brand — if they can't quote you specifically, the readability layer is broken. AI-mediated discovery is now a meaningful traffic slice.
- **→ Datun:** this is a _huge_ edge for "the trusted dental authority" — when someone asks an AI "is my root canal necessary / best dentist near me," Datun should be the cited source. Datun already has the JSON-LD + llms.txt/agents.json plan; treat AI-citation as a first-class channel.

---

## 18. Quality, Testing & Tooling

- **TypeScript strict**; **Zod** for runtime validation at boundaries.
- **Unit/component:** **Vitest** + **Testing Library**.
- **E2E:** **Playwright** (cross-browser, mobile emulation).
- **Visual regression** (Playwright snapshots / Chromatic) — catch pixel drift.
- **Accessibility testing** (axe) in CI; AI-assisted a11y review emerging.
- **Lint/format:** ESLint or **Biome/oxlint** (fast), Prettier.
- **Storybook** (or in-repo gallery) for component dev/docs.
- **CI/CD** gates (Datun has 30 workflows); design-token generation in pipeline.
- **Build:** Vite/Turbopack/Rspack.
- **Design-to-code:** Figma (modes for theming) → tokens; MCP integrations; v0/Komposo-style generation as accelerators (human owns vision).
- **→ Datun:** Datun already runs a FAANG verification chain (types → lint → test → build → CI gates → visual/byte checks). Extend it to the new UI: visual-regression snapshots on key screens, axe in CI, Storybook/gallery for the design-system package so Prasanth onboards cleanly.

---

## 19. Observability

- **Real User Monitoring (RUM)** — Vercel Speed Insights + PostHog (Datun has these): field CWV at p75, not just lab.
- **Error tracking:** Sentry + Better Stack (Datun has these) — frontend error boundaries reporting up.
- **Feature flags** (PostHog) for safe rollouts.
- **Funnel/interaction analytics** to see where real users struggle.

---

## 20. The 2031-Forward Layer (where the puck is going)

- **Generative UI (GenUI):** the interface itself is composed dynamically by the model from user _intent + context_ — not a template with variables swapped, a fundamentally different layout/flow per user. "Responsive was breakpoints; GenUI is adaptive intent." (Gartner: ~30% of new apps adaptive by 2026, up from <5%; McKinsey: AI-personalisation leaders earn ~40% more revenue.)
- **Adaptation > personalisation:** change _structure_ (layout, nav, density, input method), not just content. (e.g., a results view that restructures by what the user needs.)
- **Multimodal / voice / gesture / Zero-UI / agentic UX:** hands-free, conversational, anticipatory.
- **AI explanation layers** ("why am I seeing this?") + **autonomy/instant overrides** — guard against Nielsen's "behavioural dark flows" (AI that mimics help but applies conversion pressure → short-term gain, long-term churn). For a _health_ brand this is an ethics line you don't cross.
- **Tooling that's already real:** Vercel AI SDK, v0, Komposo (clean Tailwind/React), PydanticAI (schema-safe LLM output so generated components don't break), Galileo/Uizard, **MCP** for context-aware UI.
- **WebGPU, spatial/AR-influenced UI** maturing.
- **The mature countertrend (most important for Datun):** _calm interfaces, transparent AI, end of theatrics._ Overstimulated users reward clarity and restraint. AI woven into the _invisible_ layers (personalisation, optimisation, accessibility); **vision/strategy/taste stay human.**
- **→ Datun:** Datun is _already_ AI-powered internally (and deliberately doesn't brand as "AI"). The 2031 play: keep AI as the **invisible engine** that makes guidance feel effortless and the experience adaptive, while the _surface_ stays calm, transparent, doctor-backed, and human. Schema/llms.txt/agents.json position Datun to be the **cited authority in AI answers** — arguably the biggest distribution shift of the decade. Keep the architecture flexible (web-first, token-driven) so these capabilities slot in without a rebuild.

---

## 21. The Datun Application Summary (what we actually use vs skip)

**Use, always (structural — these compound):**

- Token-driven design system (primitive→semantic→component) in shared `packages/ui`; one swappable accent token.
- OKLCH colour + `color-mix`; premium warm-calm light + true-OLED dark, equal quality.
- Variable fonts, WOFF2, subset, fluid `clamp`, unitless line-height.
- 4/8 spacing; container queries; bento (with real prioritisation) on the website-face; logical properties for 10 langs.
- RSC + PPR + Cache Components + Server Actions + streaming; clean feature-first architecture.
- Full Core Web Vitals discipline (LCP/INP/CLS patterns) — bake in now even while Lighthouse is informational.
- PWA done right (app-shell, caching strategies, IndexedDB offline drafts) with an iOS install coach; WhatsApp/email as the reliable notification channel given iOS push limits.
- WCAG 2.2 AA maintained as a gate; cognitive-accessibility as brand promise.
- Headless primitives (Base UI/Radix via shadcn) restyled to tokens; optimistic UI, skeletons, calm empty/error states.
- SEO + GEO + AI-readability (JSON-LD, llms.txt, agents.json) — to be the AI-cited dental authority.
- Full testing/observability chain extended to the new UI.

**Use, surgically (polish — one place each, never systematic):**

- Motion (springs for UI, layout/exit transitions, scroll reveals) — subtle, with reduced-motion off-switch.
- CSS scroll-driven reveals + View Transitions for native-app feel.
- Kinetic/serif drama — hero headline **only**.
- Liquid glass — app-face nav/sheets **only**, GPU-isolated.
- Soft, warm-tinted, diffused shadows.

**Skip (wrong for a calm, premium, trust/health brand):**

- Heavy WebGL/Three.js hero scenes / 3D blobs (perf + tone mismatch); only a tiny, purposeful, accessible 3D moment if it ever truly earns it.
- Brutalism / neon "dopamine" palettes / Y2K / grain-heavy aesthetics.
- Gratuitous motion, systematic glass, autoplay spectacle.
- Behavioural dark patterns / manipulative AI personalisation — an ethics line for healthcare.

**The one-line north star:** _Datun's frontend should feel like the calmest, fastest, most trustworthy room in Indian dental — premium through restraint, instant through engineering, human through plain language, and quietly intelligent underneath._

---

_Sources: synthesised from 140+ 2026 industry references across Next.js docs, CSS-Tricks, web.dev/Core Web Vitals guides, Motion/GSAP docs, Awwwards-technique breakdowns, WCAG 2.2/W3C, design-token + dark-mode guides, variable-font guides, PWA/iOS guides, image-optimisation playbooks, and 2026 UX/AI-UI trend reports. Figures (compression %, LCP/INP deltas, adoption stats) are as reported by those sources._
