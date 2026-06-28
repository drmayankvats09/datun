# DATUN — Design System (FINAL, LOCKED)

### The living source of truth. Each part is locked here as we finalize it.

_Status legend: 🔒 LOCKED · 🟡 in progress · ⬜ pending. Every parameter is research-backed (50+ sources each) and interlink-verified against all prior + forward parts. Nothing is added on opinion alone._

**Positioning anchor (context for every decision):** Datun = India's most trusted dental platform — the single front door for everything dental. Two doors: (1) describe problem → **dentist-backed assessment** → PDF/prescription → medicine-in-consult or routed to verified clinics; (2) directory → find & book a verified dentist. Mission: "Healthcare is a Right." Tagline: "Everyone deserves care." Warm, trusted, dentist-backed — **never marketed as "AI."** For **every Indian** (Android-first, iOS supported), city-first GTM (Tier-1 → 2 → 3 → all India).

> **🔄 DECISION UPDATE — Task #55 (supersedes earlier wording throughout this doc):** Tagline is **"Everyone deserves care"** (supersedes "Everyone Deserves a Doctor"). Patient-facing language is **"dentist" / "dentist-backed"** (not "doctor"). Brand descriptor is **"India's most trusted dental platform"** (supersedes "India's #1 dental platform"). **"Dentist-backed" = built by dentists at the SYSTEM level** (the platform's guidance is built on dentist clinical knowledge) — it does **NOT** mean each individual consultation is personally reviewed or signed by a dentist; never imply per-consultation review on patient surfaces. The NMC per-consultation clinician sign-off on the formal Rx PDF (architecture doc Part B5) is a separate **legal** requirement, not a brand-positioning claim — reconcile that wording with counsel. The words "diagnosis" and "prescription" are unchanged. Where older text below still says "doctor-backed" / "Everyone Deserves a Doctor" / "#1", read it as superseded by this note.

---

# PART 1 — DESIGN PRINCIPLES 🔒 LOCKED

_The north-star. These 6 principles are the tie-breaker for every later decision (color, type, components, flows). Research shows the #1 cause of failed systems is missing **clarity** — a shared, explicit "why." These make it explicit. They are deliberately **actionable** (a rule you can apply in a real debate), not aspirational value-statements — because actionable principles standardize reasoning; copied/generic ones don't. Derived from Datun's positioning; future-proofed against the 2026–2031 AI-era (where clarity, trust, and human-centeredness endure)._

### 1. Clarity before delight

**The rule:** When forced to choose, make it obvious before you make it clever.
**Why (research):** Apple's HIG names Clarity its first principle. In healthcare, users arrive worried or in pain — clean hierarchy, whitespace, and legible typography measurably reduce anxiety and build trust. Even as interfaces become AI-driven, clarity/efficiency/consistency are the principles that endure.
**In Datun:** An anxious or in-pain patient must always know the next step in a single glance. One message per screen. Plain words over jargon.
**Arbitrates forward:** Type hierarchy (Part 2), one-primary-CTA & button hierarchy (Part 3), layout/IA, microcopy, and motion (motion must clarify, never decorate).

### 2. Trust is the feature

**The rule:** Show why we're credible _before_ asking the user for anything.
**Why (research):** In healthcare, trust is the primary currency — credentials buried late = a "blind leap of faith." Airbnb built an entire trust system (verification, guarantees, safety) to overcome the emotional barrier of staying with a stranger; Datun must do the same for "is this advice reliable?" In the AI-era, trust becomes _the_ key design principle, demanding transparency and explainability.
**In Datun:** Doctor-backing, clinic verification, and security shown early and honestly. The diagnosis is **real-doctor-backed** (never softened to "guidance"). Credibility precedes any form or commitment.
**Arbitrates forward:** Trust-signal placement, doctor profiles & verified badges (Part 3), consent/security UX (Part 5), and color (calm reads as trustworthy).

### 3. Calm, not clinical

**The rule:** Reassure; never alarm. Warm over sterile, soft over harsh.
**Why (research):** Healthcare is stressful; harsh reds, clutter, endless forms, and flashing alerts add friction and anxiety. Soothing palettes and soft visual elements create a calming effect that reduces stress and builds confidence; sterile "medical-blue + stethoscope" design actually _increases_ anxiety and drives patients away.
**In Datun:** Warm palette (not medical-blue), generous whitespace, gentle motion, no flashing alerts. Even urgent states stay composed, not panic-inducing.
**Arbitrates forward:** Color seed + full palette (Part 2), motion (gentle springs, Part 2), spacing/breathing room, imagery direction, and triage colors (caution/urgent must inform, not scare).

### 4. One clear action

**The rule:** Guide the user to the next step; don't offer a menu of equals.
**Why (research):** Multiple equal-priority actions (call/chat/book/download all shouting) cause decision paralysis — especially dangerous in healthcare, where decisional conflict raises anxiety. A single clear path converts and calms.
**In Datun:** Every screen has one primary path ("Ask Datun"); the second door and secondary actions are visually subordinate, never competing.
**Arbitrates forward:** Button hierarchy (primary/secondary/tertiary, Part 3), navigation, CTA placement, IA, and every flow (Part 5).

### 5. Built for every Indian

**The rule:** If it doesn't work on a low-end Android, on a slow network, in 10 languages, it isn't done.
**Why (research):** India is Android-majority; inclusive design performs _better_ under real constraints (low bandwidth, older devices, multilingual) and lifts emerging-market retention ~35%. Digital-health equity research shows rapid digitization fails older/rural/low-literacy/multilingual users unless they're central to design. Honoring OS-level preferences (reduced-motion, high-contrast, text-scaling) is shifting from optional to expected default — and signals respect.
**In Datun:** Android-first build, lean payloads, multilingual _design_ (not just translation), accessible by default, OS preferences honored as defaults.
**Arbitrates forward:** Performance budgets (Part 4), responsive/touch targets (Part 4), accessibility (Part 4), and multilingual type/layout (Part 5).

### 6. Honest by default

**The rule:** Real over impressive. Say plainly what Datun can and cannot do.
**Why (research):** Beyond ethics, this is **law in India** — the CCPA has banned dark patterns under the Consumer Protection Act, issued advisories to 50+ platforms (including health-tech start-ups) mandating self-audits and compliance declarations, with notices already issued. Ethical design is honest, respectful, empathy-rooted — privacy with respect, user control. The AI-era rewards explainability and transparency.
**In Datun:** Real data only (no fake stats/screens), no dark patterns (legally required), DPDP-compliant consent, honest "doctor-backed diagnosis" framing with clear medical disclaimers, and the word **"free" is governed by the refined "free" rule (Part 12.5)** — never a brand-lead or promotional shout, but allowed as honest no-cost reassurance (with the business model), mission-truth, the dental-tourism estimate CTA, or a ₹0 pricing label (honest, premium brand).
**Arbitrates forward:** Content/microcopy (Part 4), consent/privacy/medico-legal UX (Part 5), no-dark-pattern rules, and honest data display.

---

## Conflict-resolution hierarchy (when two principles collide)

- **Non-negotiable floors (never traded):** #6 Honest by default · #5 Built for every Indian.
- **Top priority:** #2 Trust is the feature · #1 Clarity before delight.
- **Strong guides:** #3 Calm, not clinical · #4 One clear action.

> Example use: "Should the result screen add a bold red urgency banner to drive bookings?" → violates #3 (Calm) and risks #6 (Honest/no-dark-pattern). Rejected. Use a composed, honest urgency cue instead.

## Anti-principles (what we explicitly reject)

- ❌ Sterile "medical-blue + stethoscope stock" (raises anxiety).
- ❌ Dark patterns / fake urgency / hidden cancellation (illegal in India + breaks trust).
- ❌ Fake data, mock screens, or stats we can't back.
- ❌ Choice-overload / multiple competing CTAs.
- ❌ "Impressive but unclear" (cleverness over clarity).
- ❌ Desktop-first thinking; assuming high-end devices/fast networks only.
- ❌ "AI" as a brand crutch (it's the invisible engine, not the pitch).

## Forward interlink map (how Part 1 drives the rest)

| Principle              | Primarily governs                                                     |
| ---------------------- | --------------------------------------------------------------------- |
| Clarity before delight | Typography hierarchy, one-CTA, IA, microcopy, motion-clarifies        |
| Trust is the feature   | Trust signals, doctor/verified UI, consent, security, calm color      |
| Calm, not clinical     | Color seed + palette, motion springs, spacing, imagery, triage colors |
| One clear action       | Button hierarchy, nav, CTA placement, flows                           |
| Built for every Indian | Performance budgets, responsive, a11y, multilingual design            |
| Honest by default      | Content/microcopy, consent/privacy/medico-legal, no-dark-patterns     |

_Decision authority note: these 6 are locked by CTO/CDO judgment, research-backed. Override any only by explicit founder call; otherwise final._

_Part 1 research basis: ~40 sources this round (Apple HIG, Material Design, Airbnb/IBM/Atlassian/Spotify design principles, healthcare-anxiety & patient-centered design studies (Eleken, Indegene, JMIR, NCBI), India dark-pattern regulation (CCPA/Bar&Bench/NextIAS), inclusive & emerging-market design (iubenda, GitNexa, WHO), and 2026–2031 AI-era UX (ACM IX, future-of-UX analyses)) + the prior design-system corpus. Standard ranges and findings as reported by those sources; principles are Datun-specific syntheses._

---

# PART 2 — COLOR 🔒 LOCKED

_15 sub-parameters, each research-backed (~45 color-specific sources: OKLCH/color science, healthcare color psychology, FAANG token systems, dark-mode, India culture, 2026 trends, dental branding, WCAG) and anchored to Part 1 principles. The whole system derives from ONE seed via a 3-tier token model, so changing the brand is a one-line edit._

**Why these choices, in one line:** A **calm teal** uniquely fuses **trust** (blue) + **healing/freshness** (green), reads **clean like polished enamel** (perfect for dental), and **stands out** in a healthcare market crowded with clinical blue/white — while a **warm off-white base** + **muted warm accent** keep it human, not sterile. This directly serves _Trust is the feature_ + _Calm, not clinical_.

### 2.1 Color method/space `#8`

**Decision:** **OKLCH** is the canonical format (perceptually uniform → even tonal ramps + reliable contrast); HEX emitted at build for legacy. Derive shades with `color-mix()` / relative-color from the seed. **P3-aware** but disciplined: keep chroma ≤ ~0.15 to stay safely in sRGB, allow up to ~0.20 only for vivid mid-tones on P3, always gamut-check. _Research: OKLCH is W3C CSS Color L4/L5, native in all 2026 browsers; fixes HSL lightness drift; ideal for systems + accessibility._

### 2.2 Primary / brand seed `#9` — **TEAL** (the one owned color)

**Decision:** Seed hue ≈ **190 (teal)**. Locked starting ramp (OKLCH; final micro-tuning + contrast-pass via OKLCH contrast tooling + on-device QA — Part 13):
`50 oklch(.98 .015 190)` · `100 (.95 .03)` · `200 (.90 .05)` · `300 (.83 .07)` · `400 (.73 .09)` · **`500 (.64 .10)` = brand** · **`600 (.55 .10)` = primary CTA/interactive** · `700 (.46 .09)` = hover/pressed & text-on-light · `800 (.37 .07)` · `900 (.28 .05)` · `950 (.22 .04)`.
_Research/interlinks: teal = trust+calm+healing+clean ("ocean teal evokes polished enamel, fresh breath"); on-trend yet timeless ("molten teal", medical-grade greens = 2026 wellness direction); **distinctive** vs blue/white market (category-king); culturally positive in India (green = healing/spirituality). Muted (not neon, not clinical-blue) → serves Calm-not-clinical + Trust._

### 2.3 Secondary color `#10` — **warm clay/amber accent** (humanity)

**Decision:** A **muted warm accent**, hue ≈ **45 (amber-coral/clay)**, e.g. `500 oklch(.72 .11 45)` with a 50–950 ramp. Used sparingly for **warmth/human moments** (illustration, highlights, soft emphasis) — _not_ for alerts, never competing with the teal CTA. _Research: warm secondary "softens the experience and imparts confidence and optimism" (Atlassian); "warm paper + slate + one calming accent = less clinical, more human" (2026 healthcare direction)._

### 2.4 Tertiary color `#11`

**Decision:** Kept **in-family** — a teal-adjacent shifted hue (≈ 165, soft green-teal) for occasional depth/charts, so the system never auto-generates a random off-brand hue. Low prominence. _Interlink: prevents palette incoherence; supports Calm._

### 2.5 Neutral / grey scale `#12` — **warm-leaning slate**

**Decision:** Neutrals carry a **slight warm tint** (hue ≈ 85, chroma ~0.005–0.012) for consistent warm personality. Full ramp `N0 oklch(.99 .004 85)` (warm off-white canvas, Cloud-Dancer-like) → `N950 (.18 .008 85)`. Backgrounds run light→dark (primary lightest); text/border run dark→light (primary darkest). _Research: temperature must stay consistent; elevated warm neutrals replace harsh #FFFFFF, reduce eye-strain (serves Calm + Built-for-every-Indian on low-end screens)._

### 2.6 Semantic colors `#13` (kept SEPARATE from brand)

**Decision — functional, not value-named:** Success = green **hue ≈ 145** `oklch(.60 .12 145)` (distinct from teal brand so meaning never collides); Warning = amber **hue ≈ 75** `(.75 .13 75)`; Error/Danger = red **hue ≈ 25** `(.58 .16 25)` — **composed, not aggressive**; Info = calm blue **hue ≈ 245** `(.60 .10 245)`. Each gets a `weak`(100–200) + `default`(600–700) pair. _Research: never use brand color for semantic meaning; red reserved for genuine urgency only → serves Honest-by-default (no fake-urgency)._

### 2.7 Triage scale `#14` (Datun-specific — results only, never decorative)

**Decision:** **Calm/normal** → teal/success-green; **Caution** → warning-amber; **Urgent** → error-red **but composed** (slightly desaturated, always paired with icon + label, never flashing/blinking). _Interlink: Calm-not-clinical (urgent informs, doesn't scare) + Honest + a11y (color never alone)._

### 2.8 Surface levels `#15`

**Decision (light):** `bg` = warm off-white N0 · `surface` = N0/near-white cards · `surface-raised` = white + elevation (Part 7) · `surface-sunken` = N50 · `overlay` = scrim. **(Dark):** `bg` = warm dark-grey `oklch(.20 .01 85)` (NEVER pure black) · `surface` `(.24 .012 85)` · `surface-raised` _lighter_ `(.28 .012 85)` (dark elevation = lighter surfaces). _Research: don't invert; design dark intentionally; pure-black+pure-white = harsh "light bombs"._

### 2.9 Text / on-colors `#16`

**Decision:** `text-primary` = deep warm slate `oklch(.28 .012 85)` (not pure black — calm) · `text-secondary (.45 .01 85)` · `text-muted (.58 .01 85)` · `on-primary` (on teal CTA) = light `oklch(.99 .004 85)`, verified **≥4.5:1** vs teal-600 · `on-surface` = text-primary · `link` = teal-700. Dark mode text = soft off-white `(.95 .005 85)`, not #fff. _Gate: every pair WCAG 2.2 AA (4.5:1 text / 3:1 large+UI)._

### 2.10 Border / divider colors `#17`

**Decision:** `border-subtle` = N100 · `border-default` = N200 · `border-strong` = N300 · `border-focus` = teal-600. Non-text UI borders meet **3:1**. _Interlink: Clarity (clear grouping) + a11y._

### 2.11 State color layers `#18`

**Decision (per role):** `hover` = ±~8% lightness (or 0.08 overlay) · `pressed` = ±~12% (0.12 overlay) · `focus` = teal ring (2px, 2px offset) · `disabled` = ~38% opacity (**still visible**) · `selected` = teal-weak bg + teal-700 text. States must read in **both** light/dark, **never color-only** (pair with shape/contrast). _Research: ghost states vanish on dark; states must stay distinct._

### 2.12 Tonal ramps `#19`

**Decision:** Every hue gets a **50→950** ramp (11 steps + optional 25/950 half-steps for dark-mode fine-tuning), generated in OKLCH for even perceptual steps. 500 = base. _Interlink: 60-30-10 usage — ~60% warm-neutral surfaces, ~30% secondary surfaces/cards, ~10% teal accent (CTA/active/link)._

### 2.13 Themes `#20` — light · dark · high-contrast

**Decision:** All three, via **semantic tokens mapped to light/dark** (`light-dark()` / theme files). Dark = muted accents (lower chroma so teal doesn't glow), lighter raised surfaces, soft borders/glows for separation. High-contrast theme bumps to **AAA (7:1)** for users who set the OS preference. User-controlled with **system-preference default**. _Interlink: Built-for-every-Indian (honor OS prefs as defaults) + a11y._

### 2.14 Opacity / alpha tokens `#21`

**Decision:** `scrim` 0.5 · `disabled` 0.38 · `overlay-hover` 0.08 · `overlay-pressed` 0.12 · `backdrop` 0.6. Authored as `oklch(... / α)`. _Interlink: states + overlays + a11y (disabled still legible)._

### 2.15 Gradients `#22` — minimal, as light not decoration

**Decision:** **Mostly flat.** Gradients only as **soft-glow ambient** mood (e.g., a very subtle teal→warm wash behind a hero), never harsh/neon, never on functional UI. _Research: 2026 gradients are "smoky, ambient, used as lighting"; neon only for tiny emphasis → serves Calm-not-clinical._

---

**Part 2 interlink verification ✅**

- _Backward (Part 1):_ Calm-not-clinical → warm off-white base + muted teal (no neon/clinical-blue) + flat/soft. Trust → teal + composed urgency. One-clear-action → single teal CTA color. Honest → red reserved for genuine urgency only. Built-for-every-Indian → green/teal positive in India + dark-mode + eye-comfort + contrast for low-end screens. Clarity → strong text contrast + semantic separation.
- _Forward:_ feeds **Typography** (text/on colors), **Components** (button/state colors), **Elevation** (light+dark surfaces & shadows), **Motion** (no color flashing), **Accessibility** (contrast gates baked in), **Imagery** (warm palette), **Iconography** (icon tints).
- _Token discipline:_ primitive (`teal-500`) → semantic (`bg/brand/default`, `text/primary`, `border/focus`) → component. Functional names only; brand ≠ semantic; numeric 50–950.

_Part 2 research basis: ~45 sources this round (66colorful/HexPickr/BrainyInk/ModernCSS on OKLCH & color-mix; media.io/ThinkPod/Naskay/Fuselab/C7/Virtualspirit on healthcare & dental color psychology; UXPin/Atlassian/Imperavi/fourzerothree on token systems, neutrals & semantic roles; multiple 2026 dark-mode guides; Lounge Lizard/AND Academy/Updivision/Envato on 2026 color & gradient trends; Venngage/Adobe on WCAG color accessibility) + prior corpus. OKLCH values are locked starting points; final micro-tuning + full contrast-pass happen via OKLCH contrast tooling + on-device QA (Part 13)._

# PART 3 — TYPOGRAPHY 🔒 LOCKED

_12 sub-parameters + an India-first multilingual ruleset, each research-backed (~35 typography sources: type-scale/system guides, 2026 UI-font roundups, line-height/measure/fluid/loading, **Indic-script & Anek multiscript research**, accessibility & older-adult readability studies) and anchored to Part 1 principles + Part 2 colors._

**The pivotal decision — font family.** Datun must be **first-class in 10 Indian languages** (a non-negotiable floor, _Built for every Indian_), and per the Part 1 conflict-hierarchy that floor **outranks** the marginal extra warmth a Latin-only font would add. Research is decisive: **Anek (Ek Type, Mumbai / Google Fonts)** is a **variable superfamily that covers Latin + 9 Indian scripts** — Bangla, Devanagari, Gujarati, Gurmukhi, Kannada, Malayalam, Odia, Tamil, Telugu — **all designed simultaneously so the scripts live in visual harmony** with one typographic voice. OFL-licensed (commercial-safe), variable (weight + width), and authentically Indian — a more honest, ownable brand signal for "India's most trusted dental platform" than yet another Latin grotesque. Warmth is recovered through the warm palette (Part 2), generous spacing, soft radii, and gentle motion — not the font alone.

### 3.1 Font families `#23`

**Decision:** **Primary = Anek** (one variable superfamily for _everything_ — Latin + all Indic). **Fallback = Noto Sans** (+ Noto Sans Devanagari/Tamil/… per script) for any missing glyph and as metric-matched fallback. **No separate display font** — display character comes from Anek's width+weight axes. **Mono = deferred** (patients see no code; add a mono like IBM Plex Mono only if the clinic dashboard later needs it). Stack: `'Anek Latin','Noto Sans',system-ui,sans-serif` (+ script-specific Anek/Noto for Indic). _Interlink: Built-for-every-Indian (floor) + Calm (humanist, high x-height) + lean payload._

### 3.2 Variable axes `#24`

**Decision:** Use Anek's **`wght`** (400/500/600/700) + **`wdth`** (standard for body/UI; **expanded** for display/hero character; condensed reserved for dense data only). No `opsz` axis exists → handle display-vs-body via size + weight + width + manual tracking. _Interlink: hierarchy via axes, one file, lean._

### 3.3 Type roles & scale `#25`

**Decision — 5 roles + Caption, each L/M/S; base 16px; rem; 4px-grid-aligned:**
Caption 12 · Label 12/14/14 · **Body 14 / 16(base) / 18** · Title 18/20/24 · Headline 24/28/32 · Display 36/45/57 (px). Display range is intentionally more dramatic for the marketing face; body range is gentle for reading. _Interlink: Clarity (clear hierarchy) + Part 4 8dp grid (vertical rhythm)._

### 3.4 Modular ratio `#26`

**Decision:** Base **16px**, ratio ≈ **1.25 (Major Third)** through headings/display (moderate-high contrast for marketing hierarchy), tighter steps in the body range; **round every step to the 4px grid**. **Body stays 16px across all viewports** (already calibrated; never shrunk). _Research: text-rich reading UIs favour ~1.2–1.25; body 16px needs no scaling._

### 3.5 Font weights `#27`

**Decision:** Load **400 / 500 / 600 / 700** only (variable instances). Hierarchy is driven by **size first**, weight second; **bold used sparingly** to retain emphasis power. _Interlink: Clarity + lean payload._

### 3.6 Line-heights `#28` _(unitless)_

**Decision:** Display/Headline **~1.1–1.2** (tight, impactful) · Title **~1.3** · **Body ~1.5–1.6** · Label/Caption **~1.4**. **⚠️ Multilingual override:** Indic scripts ("Tall": Devanagari/Tamil/Telugu/etc.) need **extra line-height — bump body to ~1.7–1.8 per-script** so above/below-base glyphs never clip. _Research: Material classifies these as Tall scripts requiring extra leading._

### 3.7 Letter-spacing / tracking `#29`

**Decision:** Body = **default (0)**; **Display ≥32px → tighten to −0.02…−0.03em**; small labels / all-caps → **+0.02…+0.05em**. **⚠️ Indic scripts: NO negative tracking ever** (it breaks conjuncts/matras) — tracking tweaks are Latin-only. _Research: large type shows gaps at default tracking; Indic shaping is spacing-sensitive._

### 3.8 Paragraph spacing `#30`

**Decision:** **~1 line of body line-height** (≈24px at 16/1.5) between paragraphs, drawn from the 8dp scale (Part 4). _Interlink: Clarity + spacing system._

### 3.9 Line length / measure `#31`

**Decision:** Body **`max-width: ~66ch`** (target 50–75 CPL; **WCAG 1.4.8 ≤80**), controlled at component level via **container queries**. Test the measure **per script** (Indic is denser → cap by width, not char-count). _Research: Bringhurst + eye-tracking 50–75 CPL._

### 3.10 Units & fluid rules `#32`

**Decision:** **rem** font-size + **unitless line-height** (honours user zoom/text-scaling — vital for older/low-literacy users). **Body fixed 16px**; **Display/Headline use bounded `clamp()`** (smooth, no breakpoint CLS) rounded to scale values. **`text-wrap: balance`** headlines, **`text-wrap: pretty`** body. **Logical properties** (`margin-block`/`padding-inline`) + `text-size-adjust:100%` for RTL/Urdu + i18n. _Interlink: Built-for-every-Indian + Performance (CLS)._

### 3.11 Font loading `#33`

**Decision:** **WOFF2 + variable**, **`font-display: swap`**, **fallback matched via `size-adjust`/`ascent-override`** (anti-CLS), **preload** the 1–2 above-fold faces (Latin + active script) with `crossorigin`, **subset by script** (ship only the active script + Latin; lazy-load others on language switch). Measure CLS before/after; keep weights minimal. _Interlink: Performance budgets (Part 4) + Built-for-every-Indian (data cost / low-end)._

### 3.12 Heading semantics `#34`

**Decision:** **H1–H6 = semantic HTML** (one H1/page, never skip levels), **decoupled from visual type roles** (a Display style may sit on an H1 _or_ a non-heading). Map H1→Display/Headline, H2–H3→Headline/Title, H4–H6→Title. _Interlink: SEO + Accessibility (Part 13) + screen readers._

---

**Accessibility & numerals (baked in):** body **≥16px** (generous for older/low-literacy India), **sans-serif** (faster reading, fewer errors), **high x-height** (Anek), verify **character disambiguation** in Anek (`1/l/I`, `0/O`, `b/d/p/q`), support **400% zoom + OS text-scaling + user font-size control**. Numerals: **tabular figures (`tnum`)** for health-scores/data alignment, proportional for running text. _Interlink: Built-for-every-Indian + Clarity + Trust (legible data)._

**Part 3 interlink verification ✅**

- _Backward (Part 1):_ Built-for-every-Indian (floor) → Anek's 10-script coverage, per-script line-height, subset-loading, rem/zoom support. Clarity → size-led hierarchy, ≤80ch measure, semantic headings. Calm → humanist warm type + generous leading + restrained bold. Honest → no clutter; legible disclaimers.
- _Backward (Part 2):_ text uses Part 2 colors (text-primary warm slate, link teal-700, on-primary on teal CTA); contrast gates (4.5:1 / 3:1) apply to every type-on-surface pair.
- _Forward:_ feeds **Spacing/Grid** (4px-rounded scale + paragraph spacing on 8dp), **Components** (label/body/title styles per component), **Accessibility** (zoom, disambiguation, semantics), **Performance** (font budget/CLS), **Content & Voice** (the actual words).
- _Token discipline:_ `category/size/attribute` (e.g., `body/md/size`, `display/lg/line-height`); primitive→semantic→component.

_Part 3 research basis: ~35 sources this round (UXCollective/Figr/FontFYI/DesignSystems/Blake Crosley on type scales & line-height; Muz.li/Untitled UI/Mantlr/MadeGood/Inter-font analyses on 2026 UI fonts & warmth; UXPin/Inkbot/clamp guides on measure, fluid type & CLS; **Ek Type GitHub, Google Design "Design for Many", Material Tall-script metrics, 3 Sided Coin & TypeDrawers on Indic/Anek multilingual**; ACM SIGACCESS/APA/accessiBe/DigitalA11y + older-adult font-size studies on accessibility) + prior corpus. Sizes are locked starting values; final micro-tuning on-device against live content per script (Part 13)._

# PART 4 — SPACING & LAYOUT 🔒 LOCKED

_9 sub-parameters + a spacing-principles ruleset, each research-backed (~30 sources: 8pt-grid & spatial-system guides — WPDean/Rejuvenate/DesignSystems/Cieden/Atlassian/Nathan-Curtis-EightShapes; responsive grid & breakpoints — Material/Bootstrap/USWDS/UXPin/Framer; 2026 intrinsic CSS — Scrimba/Ardena container-queries/subgrid/auto-fit; mobile safe-areas — DEV/Polypane; calm-whitespace — UXmatters/Gapsy/healthcare-UX) and anchored to Parts 1–3. **Boundary:** control/tap-target **sizes** → Part 5; **z-index/layering** → Part 11. Part 4 = space + structure only._

**The governing idea.** In healthcare, **whitespace is a feature, not emptiness** — research shows generous breathing room reduces anxiety and orients the eye, and a _predictable_ spatial rhythm reads as trustworthy (an interface without one feels "cheap/untrustworthy"). So Datun spaces **generously and consistently**: every value comes from one finite scale, on a grid that harmonizes with the Part 3 type rhythm and the Tailwind v4 stack.

### 4.1 Base unit `#35`

**Decision:** **4px base unit, 8px primary rhythm** (Tailwind v4-native: `spacing-1` = 4px; every even step is a multiple of 8, so 4pt and 8pt overlap cleanly). **4px is the half-step** for tight spots only (icon↔label, dense chips). _Interlink: Part 3 (type scale 4px-aligned + paragraph spacing on 8dp) + Tailwind v4 + Material/Carbon 8dp._

### 4.2 Spacing scale `#36`

**Decision — authored in rem, one global scale, finite vocabulary:**
`0 · 2(0.125rem,rare) · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 56 · 64 · 80 · 96 · 128 (px)`. Semantic aliases map onto it: `2xs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · 2xl 48 · 3xl 64 · 4xl 80 · 5xl 96+`. _Interlink: Clarity (finite choices speed design+dev) + token discipline._

### 4.3 Density `#37`

**Decision:** **Comfortable is the default everywhere patient-facing** (generous padding = calm/anxiety-reducing). A **compact mode** (paddings down one step) exists **only for dense clinic-dashboard data tables** — never the patient app. _Interlink: Calm + Built-for-every-Indian (touch comfort) for patients; data density for clinics only._

### 4.4 Spacing principles (the rules)

- **Internal ≤ external** (Gestalt proximity): space _inside_ a group ≤ space _between_ groups → groupings read as distinct yet cohesive.
- **Outer spacing is a layout concern, not a component one:** base components (cards/buttons/inputs) export **zero external margin**; use **padding tokens inside** components and **gap tokens in layout primitives**; margin utilities only as controlled exceptions.
- **Generous + consistent whitespace** = breathing room (reduces anxiety) + predictable rhythm (reads as trustworthy). _Backs Calm + Trust + Clarity._
- **Layout stability:** persistent navigation/structure **never shifts position**; minimise CLS. _Healthcare research: small layout changes raise stress → stability is a safety requirement._

### 4.5 Responsive grid `#41`

**Decision:** Mobile-first, **4 cols (mobile) → 8 cols (md/tablet) → 12 cols (lg+/desktop)**; **column widths in %** (fluid). **Gutters** 16px mobile → 24px tablet/desktop. **Margins** 16px mobile → 24–32px tablet → auto-centered (max-width) on desktop. Content drives the grid (audit content first; intentional grid-breaks like hero-bleed allowed because the rest stays disciplined). _Interlink: Material 8dp grid + every-device._

### 4.6 Breakpoints `#42`

**Decision — min-width / mobile-first, aligned to Tailwind v4 defaults:** base `<640` · **sm 640** · **md 768** (tablet → 8-col) · **lg 1024** (desktop → 12-col) · **xl 1280** · **2xl 1536**. _Interlink: Tailwind v4 stack (no custom drift) + Built-for-every-Indian (phones→foldables→ultrawide)._

### 4.7 Container max-widths `#38`

**Decision — fluid containers with max-width + auto margins (never fixed widths → no breakpoint "dead zones"):** `prose ~66ch` (reading, from Part 3) · `content ~1200px` (marketing/content) · `wide ~1440px` (max site; hero full-bleed with inner max) · **`app ~480–640px`** (app-face single-column screens — keeps the PWA feeling like a focused mobile app even on desktop). _Interlink: Part 3 measure + Clarity + the website-face vs app-face architecture._

### 4.8 Layout primitives `#43`

**Decision — composable primitives + 2026 intrinsic CSS (prefer fluid over hard breakpoints):** **Stack** (vertical rhythm via owl `* + *` or flex+`gap`), **Cluster** (wrapping inline groups via `flex-wrap`+`gap`), **Grid** (`repeat(auto-fit,minmax(min(100%,Xpx),1fr))` → 1→N columns with **no media queries**), **Inset / inset-squish / inset-stretch** (padding), **Bleed** (negative/full-bleed). Use **container queries** (90%+ support — components adapt to their parent) and **subgrid** (align titles/CTAs across cards of varying content). _Interlink: Performance (less CSS, no CLS) + composability + token discipline (gap tokens in primitives)._

### 4.9 Aspect ratios `#45`

**Decision:** Use the CSS **`aspect-ratio`** property (anti-CLS; reserves space before media loads — replaces the padding-top hack). Ratio tokens: **1:1** (avatars/square) · **4:3** (clinic/photo) · **16:9** (video/hero media) · **3:2** · **4:5 / 9:16** (portrait/mobile media). _Interlink: Performance (CLS) + Imagery (Part 14)._

### 4.10 Mobile safe-areas & viewport

**Decision:** `env(safe-area-inset-*)` + `viewport-fit=cover`. App-face fixed **bottom tab-bar** → `padding-bottom: env(safe-area-inset-bottom)`; fixed top-header → `padding-top: env(safe-area-inset-top)`; content offsets via `calc(barHeight + env(...))`; add breathing room with `calc(env(...) + space)`. Use **`dvh`/`svh`** (never bare `100vh`) for full-height. Pair `vw` with `clamp()` min/max. (Desktop returns 0 → safe.) _Interlink: app-face bottom-tab-bar architecture + Built-for-every-Indian (notched Android/iOS)._

### 4.11 Fluid section spacing

**Decision:** Section vertical padding uses bounded **`clamp()`** (e.g. `clamp(48px, 8vw, 96px)`) → smooth scaling, no breakpoint overrides, no CLS; rounded to the scale. Inner content paddings stay on the **fixed token scale** (predictable rhythm). _Interlink: Part 3 fluid-display approach + Performance._

---

**Part 4 interlink verification ✅**

- _Backward (Part 1):_ Calm → generous comfortable whitespace + stable layout. Trust → consistent predictable rhythm. Clarity → internal≤external grouping + finite scale. One-clear-action → spacing isolates the primary CTA. Built-for-every-Indian → mobile-first 4→8→12 grid, safe-areas, dvh, touch-comfortable density. Honest → no manipulative cramming.
- _Backward (Part 2–3):_ grid/gutters in 8dp echo Part 3's 4px-grid type; paragraph spacing (Part 3) is drawn from this scale; `prose ~66ch` = Part 3 measure; container padding frames Part 2 surfaces.
- _Forward:_ feeds **Sizing** (control heights/tap targets sit on this grid — Part 5), **Radii** (relate to box sizes), **Elevation** (surface padding), **Components** (padding/gap per component), **Z-index/layering** (Part 11), **Motion** (layout-stable transitions), **Performance** (CLS via aspect-ratio + fluid spacing).
- _Token discipline:_ one global scale → role-specific tokens (`padding-*`, `gap-*`, `margin-*` exceptions, `container-*`, `aspect-*`); numeric scale + semantic aliases; Tailwind v4-native.

_Part 4 research basis: ~30 sources this round (8pt-grid/spatial-system: WPDean, Rejuvenate, DesignSystems.com, Cieden, spec.fm, Atlassian spacing/primitives, Nathan Curtis/EightShapes, designtokens.substack on outer-spacing; grid/breakpoints: Material responsive-grid, Bootstrap, USWDS, UXPin, Framer 2026 breakpoints; intrinsic CSS 2026: Scrimba, Ardena (auto-fit/minmax/subgrid/container-queries), ConceptFusion on vh/vw; mobile safe-areas: DEV.to, Polypane, Web-Standards; calm/whitespace: UXmatters "Designing Calm", Gapsy mental-health 2026, Interexy healthcare-UX, Whitespace-psychology) + prior corpus. Values are locked starting points; final tuning against live screens per breakpoint._

# PART 5 — SIZING 🔒 LOCKED

_6 sub-parameters, each research-backed (~25 sources: touch-target standards — WCAG 2.2 SC 2.5.8/2.5.5, Apple HIG, Material, Fluent, LogRocket/TestParty/Siteimprove + MIT Touch-Lab/U-Maryland human-factors; control & icon sizing — Carbon/Adobe Spectrum/Michelin/BrandVM/DesignSystems.com; older-adult & thumb studies — Heliyon/NCBI elderly-thumb, healthcare-interface guides; one-handed reachability — UXPin/2026 nav). **Boundary:** radii → Part 6; icon **style/stroke/optical-grid** → Part 10; tap-target **spacing** → Part 4; **z-index** → Part 11. Part 5 = how big things are, only._

**The governing idea.** Datun serves **every Indian — including older, low-literacy, anxious or in-pain hands on Android phones**. Human-factors + elderly-thumb research is unambiguous: undersized targets cause errors and fatigue; generous targets cut touch errors and lift conversion. So Datun sizes **generously by default**, puts the **primary action in the bottom thumb-zone**, and treats **hit-area as separate from (and ≥) visual size**. Heights are **fixed** (predictable = the Part 4 layout-stability rule); widths are **fluid**.

### 5.1 Sizing scale

**Decision:** Component dimensions live on the **4/8px grid** (Part 4) via three finite sub-scales — **control-height, icon, avatar** — plus the shared spacing scale for paddings. **Heights = fixed tokens** (stability); **widths = fluid** (full-width on mobile, hug/auto on desktop). _Interlink: Part 4 grid + layout stability; Clarity (finite options)._

### 5.2 Control heights `#39`

**Decision — buttons / inputs / selects share one height set (8px-grid):** `control-xs 32` (desktop-dense / compact clinic tables only — must still pad to ≥44 hit-area on touch) · `control-sm 40` · **`control-md 48` = DEFAULT** (Material 48dp; the patient-app standard) · **`control-lg 56`** (prominent primary — the hero "Ask Datun" CTA). Inner padding from the Part 4 scale; control text = body 16px (Part 3); inputs **≥16px font on iOS** (prevents auto-zoom). _Interlink: One-clear-action (lg CTA) + Calm/every-Indian (generous default) + Part 3 type + Part 4 density._

### 5.3 Tap targets & hit-area `#40` (the accessibility rule + premium thumb-ergonomics)

**Decision:**

- **Default touch target 48×48** (Google Material — ~9mm, matches the human fingertip) · **minimum on touch 44×44** (Apple HIG / WCAG 2.5.5 AAA) · **absolute floor 24×24** (WCAG 2.2 SC 2.5.8 AA) — floor used **only** for non-critical icon controls **and only** with ≥24px spacing (Part 4). Rooted in MIT Touch Lab (fingertip ~16–20mm, thumb ~22mm): bigger targets = fewer mis-taps for everyone (Fitt's Law) **and** the accessible baseline.
- **Hit-area ≥ visual:** a smaller glyph (24px icon, 20px close) **must** have its tappable area padded to **≥44–48px** (CSS padding or a `::before` overlay) — e.g. a 22px icon centered in a 48px target.
- **Modality-aware:** `pointer: coarse` (touch) → ≥48; `hover:hover`+`pointer:fine` (mouse) → may shrink to 32 (never below 24). Mobile-first default stays generous.
- **Bias large** (elderly-thumb fatigue research) and place the **primary action in the bottom thumb-zone** (ties to the app-face bottom tab-bar), with **≥8dp spacing** between targets. _Interlink: Built-for-every-Indian (floor) + Calm + Part 4 spacing + the app-face architecture._

### 5.4 Icon sizes `#46` _(size only — style/stroke/optical → Part 10)_

**Decision — tokens `16 · 20 · 24 · 32 · 40 · 48`:** **24 = default** interactive/nav/common icon · **20 = dense rows / secondary** · **16 = inline with small text only** · **32–48 = feature/marketing/illustrative**. Inline icons **match or sit one step above** adjacent text size (e.g. 20px icon ↔ 16px label); never alter the icon-text ratio; pair each icon token with a control token. **Interactive icons always get a ≥44–48px hit-area** (pad the container) regardless of glyph size. Use **fewer sizes than you think** (one compact, one standard, one expressive). _Interlink: Part 3 type sizes + 5.3 hit-area + Part 10 iconography._

### 5.5 Avatar sizes `#47` (doctor photos = a trust signal)

**Decision — numeric flexible scale `24 · 32 · 40 · 48 · 64 · 96 · 128`:** 24/32 inline lists · 40/48 cards/comments · **64–96 = doctor profile** (verified-clinician trust moment) · 128 profile hero. Square (1:1, Part 4); circle radius → Part 6; the **verified badge** sizes relative to the avatar. _Interlink: Trust is the feature + Part 4 aspect-ratio + Part 6 radii._

### 5.6 Width & responsive behavior

**Decision:** Text buttons **hug content** with a sensible **min-width (~64px)** for tappability; icon-only buttons are **square at their control height**. The **primary CTA is full-width on mobile** (large thumb target + One-clear-action) and **auto/hug on desktop**. Inputs are **full-width within their container** (forms inside `app ~480–640`, Part 4). **Heights stay fixed; widths flex.** _Interlink: One-clear-action + Part 4 containers + layout stability._

---

**Part 5 interlink verification ✅**

- _Backward (Part 1):_ Built-for-every-Indian (floor) → 48dp default, ≥44 hit-area, bottom thumb-zone, large for elderly. One-clear-action → 56px hero CTA, full-width on mobile. Calm → generous comfortable sizing. Trust → doctor-avatar prominence + verified badge. Honest → no tiny "decline/cancel" traps (floor targets only non-critical + spaced).
- _Backward (Parts 2–4):_ control text = Part 3 body 16px (+iOS no-zoom); heights/icons/avatars all on the Part 4 4/8px grid; tap **spacing** is the Part 4 scale; avatar square = Part 4 1:1; controls frame Part 2 surfaces/on-colors.
- _Forward:_ feeds **Radii** (corner sizes relate to control heights — Part 6), **Elevation** (control surfaces — Part 7), **Borders/rings** (focus ring on these targets — Part 8), **Components** (every component inherits these height/icon/avatar tokens — Part 15), **Motion** (press states on fixed-size targets), **Accessibility** (Part 13 audits 24/44/48).
- _Token discipline:_ `control-{xs..lg}`, `icon-{16..48}`, `avatar-{24..128}`, `target-min` (44/48), `hit-area`; numeric + semantic; Tailwind v4-native; locked into shared components, no page-level overrides.

_Part 5 research basis: ~25 sources this round (touch-target standards & human factors: WCAG 2.2 SC 2.5.8/2.5.5, Apple HIG, Material, Fluent, LogRocket, TestParty, WebAbility, AllAccessible, Siteimprove, Flexy, MIT Touch-Lab/U-Maryland data; control/icon/avatar sizing: Carbon, Adobe Spectrum, Michelin DS, BrandVM, UX Planet, DesignSystems.com, AllSVGIcons, design.dev tokens; older-adult & thumb: Heliyon/ScienceDirect button-position study, NCBI elderly-thumb EMG study, Compunnel healthcare-interface; one-handed reachability: UXPin 2026 nav, "radical reachability") + prior corpus. Values are locked starting points; final tuning on-device across Android/iOS._

# PART 6 — RADII 🔒 LOCKED

_6 sub-parameters, each research-backed (~20 sources: radius psychology & systems — 92learns, Muz.li, Telerik, Figma radius-system, Basova/Bootcamp; platform shape scales — Material 3 (10-step), Fluent 2, CMS/gov; concentric/nesting — PV21, Ondřej Konečný, Apple WWDC25 "ConcentricRectangle"; squircle/`corner-shape` — MDN, Smashing, CSS-Tricks, FrontendMasters, MDN superellipse). **Boundary:** shadows → Part 7; borders/rings → Part 8 (both follow the corner shape); icon-artwork corners → Part 10. Part 6 = corner curvature only._

**The governing idea.** Corner shape is pure **Calm-not-clinical**: research shows sharp corners read as tense/formal (even triggering mild threat response) while rounded corners read as **safe, approachable, friendly, more "clickable."** So Datun rounds **moderately-to-generously** — warm and human, never childish, always credible — and reaches for **squircle smoothing** for an iOS-grade premium feel. Hierarchy stays driven by fill/color/size (One-clear-action), so radius can stay **consistent within each component type** for rhythm.

### 6.1 Radius philosophy

**Decision:** Moderate-to-generous rounding (friendly/calm/approachable) while professional; **sharp corners rejected** for interactive/patient UI (cold/clinical). **Tap-directly elements (buttons/chips/toggles) are rounder**; large/viewed-from-distance surfaces (page containers, headers) stay moderate. _Interlink: Calm-not-clinical + Trust + One-clear-action._

### 6.2 Radius scale `#48`

**Decision — base × multiplier, 4px-grid, t-shirt + none + full:** `none 0` · `xs 4` · `sm 8` · **`md 12`** · `lg 16` · `xl 24` · `2xl 28` · **`full 9999` (pill)** · `circle 50%`. Authored as tokens (semantic refs, not raw numbers). _Interlink: Part 4 4px grid + token discipline._

### 6.3 Per-component radii `#49` (proportional + proximity)

**Decision:**

- **Buttons = `full` (pill)** — friendly, modern, "more clickable" (Material-3-aligned); icon-only = circle/pill. Primary vs secondary differ by **fill + color + size**, not shape.
- **Inputs / selects / textareas = `md 12`** (settled rounded-rect; distinct from pill buttons; readable).
- **Chips / tags / toggle-track / badges = `full`** (pill).
- **Cards = `lg 16`** (soft, modern); large feature cards `xl 24`.
- **Modals / dialogs = `xl 24`.**
- **Bottom sheets = top corners `2xl 28`, bottom `0`** (reaches the screen edge — no radius needed at edges).
- **Checkbox = `xs 4`; radio / toggle = full.**
- **Avatar = `circle`** (Part 5); verified badge small-radius/circle.
- **Images / thumbnails = `md–lg` (12–16)** to match their card context.
- **Tooltips / popovers / menus = `md 12`** · **tabs/segmented = inner `full` pills inside a `lg` container.**
  _Interlink: Part 5 control heights + Part 4 surfaces/aspect-ratio + Calm._

### 6.4 Concentric radii rule (the golden formula)

**Decision:** **Inner radius = Outer radius − padding** (equivalently Outer = Inner + gap), implemented with CSS `calc()` + custom properties. If padding > outer radius → inner `0` (or 2–4px by judgment — a hard 0 can look off). The #1 amateur mistake is reusing the same radius on nested elements. _(Apple WWDC25 "ConcentricRectangle"; works with squircles too.) Interlink: Part 4 padding scale + craft/Clarity._

### 6.5 Proportional rule

**Decision:** Radius **scales with element size** and never exceeds ~half the smallest side; small elements take small radii (don't put a card's 16px on a 32px chip — it becomes an accidental pill). Group shapes by size, then assign. _Research: "16px reads as a pill on a 32px chip but barely registers on a 400px card."_

### 6.6 Squircle / continuous corners (premium — progressive enhancement)

**Decision:** Apply **`corner-shape: superellipse(2)` (squircle)** on key surfaces (buttons, cards, avatars, sheets) for continuous-curvature, iOS-grade smoothness — **as progressive enhancement** (Chromium 2026+; gracefully falls back to standard `border-radius` elsewhere, so zero risk). Borders/shadows/backgrounds follow the corner shape automatically. _Research: the "iOS effect" — once surfaces use superellipse, plain arcs look off; reads as "more premium." Interlink: 2031-forward polish; Part 7/8 (shadow+border follow shape); never a dependency._

---

**Part 6 interlink verification ✅**

- _Backward (Part 1):_ Calm-not-clinical → moderate-generous rounding, no sharp interactive corners, squircle softness. Trust → approachable-yet-credible (not childish). One-clear-action → hierarchy via fill/color/size, radius stays consistent per type. Built-for-every-Indian → friendly/safe shapes + graceful squircle fallback on low-end browsers.
- _Backward (Parts 2–5):_ radii apply to Part 2 surfaces/cards; tokens on the Part 4 4px grid; pill/circle map to Part 5 control heights & avatar circle; concentric formula uses the Part 4 padding scale.
- _Forward:_ **Elevation** (shadow follows the corner shape — Part 7), **Borders/rings** (border + focus ring follow the radius/shape — Part 8), **Components** (each inherits its radius token — Part 15), **Motion** (radius can animate, e.g. FAB→sheet morph), **Imagery** (image radii — Part 14).
- _Token discipline:_ `radius-{none,xs,sm,md,lg,xl,2xl,full,circle}` + semantic component aliases (`radius-button`=full, `radius-card`=lg, `radius-input`=md…); `corner-shape` as an enhancement layer; Tailwind v4-native.

_Part 6 research basis: ~20 sources this round (radius psychology/systems: 92learns 2026 guide, Muz.li strategic border-radius, Telerik/Kendo, Figma radius-system, Basova/Design-Bootcamp; platform scales: Material 3 10-step shape scale, Fluent 2 shapes, CMS gov DS; concentric/nesting: PV21Design, Ondřej Konečný, Apple WWDC25 ConcentricRectangle, Sketch auto-corners; squircle/corner-shape: MDN corner-shape + superellipse, Smashing Magazine, CSS-Tricks, FrontendMasters, DEV) + prior corpus. Values are locked starting points; squircle ships as progressive enhancement._

# PART 7 — ELEVATION & SHADOWS 🔒 LOCKED

_7 sub-parameters, each research-backed (~20 sources: elevation systems — Atlassian, Fluent 2, USWDS, Uxcel, DesignSystems.surf; layered-shadow craft — Theosoti/Josh-Comeau-style, 66colorful & DigitalHeroes shadow generators; 2026/2031 depth — Muz.li mobile/Apple-HIG-3-layers, Updivision soft-depth, dark-UI guides Netguru/Muzli; soft-UI/glass critique — Zignuts/TimGraf). **Boundary:** stacking order / z-index → Part 11; borders → Part 8; shadows **follow the corner shape** → Part 6; scrim/backdrop alpha → Part 2.14. Part 7 = depth (surface + shadow) only._

**The governing idea.** Depth is **information, not decoration** — a subtle lift tells an anxious user "this floats above, it's interactive/temporary" before any tap. So Datun stays **mostly flat** and uses **soft, layered, warm-tinted** elevation **sparingly and purposefully** (Calm + Clarity). Harsh black drop-shadows, neumorphism and heavy glassmorphism are **rejected** (clinical/low-contrast/theme-fragile/perf-heavy). One light source (from above), consistent across the product.

### 7.1 Elevation philosophy

**Decision:** Flat-first; elevation only for genuine layering, always soft + subtle + layered, used sparingly. Single top light source. Reject harsh shadows, neumorphism, heavy glass. _Interlink: Calm-not-clinical + Clarity (elevation reinforces, never carries, meaning) + 2026 "soft premium depth."_

### 7.2 Elevation levels `#50` (base / raised / overlay / modal + scrim — Apple-HIG/Material/Atlassian convergence)

**Decision — pair matching surface + shadow tokens, never mix:**

- **L0 Base/resting (flat):** `bg`/`surface` (Part 2), **no shadow**; flat cards get a hairline **border** (Part 8). Most of the UI lives here.
- **L1 Raised:** resting cards/raised buttons → **`shadow-sm`** + `surface-raised`.
- **L2 Raised-interactive:** sticky headers, FAB, hover-lifted cards → **`shadow-md`**.
- **L3 Overlay (transient):** dropdowns, menus, popovers, tooltips, pickers → **`shadow-lg`**.
- **L4 Modal/sheet (interrupts flow):** dialogs, bottom sheets → **`shadow-xl`** + **scrim/backdrop** (0.5–0.6, Part 2.14).
  Each level has a defined shadow + radius (Part 6) + behavior. _Interlink: Part 2 surfaces + Part 6 radii + Part 11 z-index (kept consistent)._

### 7.3 Shadow scale & layered recipes `#51`

**Decision — every token is multi-layer (tight contact/key + soft ambient), blur grows with offset, warm-tinted, rem-authored:** `shadow-xs` (hairline) · `shadow-sm` (L1) · `shadow-md` (L2) · `shadow-lg` (L3) · `shadow-xl` (L4) · `shadow-inset` (pressed/sunken). Recipe pattern, e.g. `--shadow-sm: 0 1px 2px hsl(85 12% 20% / .06), 0 2px 6px hsl(85 12% 20% / .08)`; `xl` stacks 3–4 layers (Stripe/Linear/Vercel-grade). _Research: a single shadow reads cheap; layered reads considered._

### 7.4 Shadow color `#52`

**Decision:** **Warm-tinted (neutral hue ≈85 slate), never pure black**, low opacity — blends with the warm surfaces, reads premium not muddy. On brand-color surfaces, tune shadow opacity by the surface's luminosity (Fluent luminosity method) so elevation reads consistently. _Interlink: Part 2 warm neutrals + Calm + brand-distinctive depth._

### 7.5 Dark-mode elevation `#53`

**Decision:** Express depth primarily via **lighter tonal surfaces** (Part 2.8 — higher level = lighter surface), since shadows barely register on dark. Supplement separation with **soft borders / a subtle inner-glow / luminance shift**; raised+overlay keep a **faint** shadow for consistency. No harsh black shadows. _Interlink: Part 2.8/2.13 + dark-UI research._

### 7.6 Interaction elevation `#54`

**Decision:** On desktop (`hover:hover`), cards/buttons may **lift one level on hover** and **settle on press**; on touch (no hover) use the Part 2.11 overlay press-states instead. **Animate the lift via a pseudo-element's opacity / `transform`, never the `box-shadow` properties** (avoids per-frame repaint on low-end Android). _Interlink: Part 2.11 states + Part 9 motion + Performance._

### 7.7 Performance & accessibility `#55`

**Decision:** Static layered shadows are GPU-cheap (≤~10 layers fine); never animate `box-shadow` directly. **Elevation is never the sole signal** — always pair with spacing/border/color so low-vision and high-contrast users still perceive hierarchy. Validate depth in **light + dark + high-contrast**. Neumorphism/glassmorphism rejected (contrast + theme-fragility + perf). _Interlink: Built-for-every-Indian + Accessibility (Part 13)._

---

**Part 7 interlink verification ✅**

- _Backward (Part 1):_ Calm-not-clinical → soft layered warm shadows, flat-first, no harsh/neumorphic depth. Clarity → 4 clear levels, depth reinforces hierarchy. Trust → considered (not cheap) premium depth. Built-for-every-Indian → GPU-cheap static shadows, pseudo-element animation for low-end, never shadow-only (a11y), dark-mode via lighter surfaces.
- _Backward (Parts 2–6):_ levels map to Part 2 surfaces (`surface-raised`, dark = lighter); scrim/backdrop = Part 2.14; shadow tint = Part 2 warm neutral hue 85; flat-card borders = Part 2.10/Part 8; shadow corner = Part 6 radius/squircle; elevated controls = Part 5 sizes.
- _Forward:_ **Borders/rings** (flat-card border + focus ring above elevation — Part 8), **Motion** (hover-lift/sheet-rise transitions — Part 9), **Z-index** (paint order matches elevation level — Part 11), **Components** (each maps to a level — Part 15), **Imagery** (cards over media).
- _Token discipline:_ `elevation-{0..4}` (surface+shadow pairs), `shadow-{xs..xl,inset}`; warm-tinted, rem, multi-layer; Tailwind v4-native; never mix surface/shadow across levels.

_Part 7 research basis: ~20 sources this round (elevation systems: Atlassian elevation, Fluent 2 elevation/luminosity, USWDS shadow tokens, Uxcel lesson, DesignSystems.surf; layered-shadow craft: Theosoti designing-shadows, 66colorful + DigitalHeroes layered generators; 2026/2031 depth & dark UI: Muz.li mobile-2026 (Apple HIG 3 layers / spatial depth), Updivision soft-depth, Netguru + Muzli dark-elevation; soft-UI/glass critique: Zignuts neumorphism-vs-glassmorphism, TimGraf high-end UI) + prior corpus. Recipe values are locked starting points; final tuning in light/dark/high-contrast on-device._

# PART 8 — BORDERS & RINGS 🔒 LOCKED

_10 sub-parameters, each research-backed (~41 sources this round: border systems & tokens — Atlassian, USWDS, MDN, Tokens-Studio, TheLinuxCode; **focus rings & WCAG 2.2** — W3C 2.4.7/2.4.11/2.4.13 + 1.4.11, Sara Soueidan, AllAccessible, TestParty, AAArdvark, CSSence; **forced-colors / High-Contrast** — MDN forced-colors, Microsoft Fluent HCM, ServiceNow Horizon, Tailwind; states — UXPin, Material; retina hairline — 1px.com, Dieulot, CSSWG `hairline`). **Boundary:** border **colors** are defined in Part 2.10 (referenced here); corner shape → Part 6; elevation/shadow → Part 7; z-index → Part 11; full a11y audit → Part 13. This part **details** Part 2.11's one-line focus ring._

**The governing idea.** Borders do two jobs: **define** (boundaries/grouping — Clarity) and **signal** (focus/selection/error — accessibility). Per _Calm-not-clinical_, Datun prefers **whitespace over lines** and keeps borders thin and soft — but the **focus ring is non-negotiable and must survive everything** (any background, dark mode, Windows High-Contrast), because keyboard, low-vision and assistive-tech users (part of _every Indian_) depend on it.

### 8.1 Border widths `#56`

**Decision — width = prominence (color = meaning, Part 2.10), rem-authored, centralized tokens:** `hairline` (subtle dividers — **1px default, 0.5px on retina** via `@media (min-resolution: 2dppx)`, or the new `hairline` keyword with 1px fallback) · **`default 1px`** (component boundaries, inputs, cards) · **`strong 2px`** (emphasis, selected, active-tab indicator, input-hover) · `heavy 3–4px` (rare brand moments). _Interlink: Part 4 4px grid + crisp on modern Android/iOS._

### 8.2 Border styles

**Decision:** **Solid = default** everywhere. **Dashed** only for special affordances (drag-and-drop zones, "add new" placeholders); **dotted avoided** (reads cheap). If an exact dash pattern matters at multiple sizes, use an SVG stroke. _Interlink: Calm + Clarity._

### 8.3 Border colors & the 3:1 rule (refs Part 2.10)

**Decision:** Decorative dividers use **`border-subtle` (N100)**; **interactive boundaries (inputs, selects, checkboxes) MUST meet ≥3:1 vs the adjacent color** → use **`border-default` (N200) / `border-strong` (N300)** (a ~#767676-equivalent grey gives ~3.03:1). N100 is **never** the sole boundary of an interactive control. Dark mode uses per-surface (relative) border tokens so thin borders don't vanish. _Interlink: WCAG 1.4.11 + Part 2.10/2.13._

### 8.4 Dividers / separators

**Decision:** **Whitespace first** (spacing groups content better than lines — Calm); add a **hairline** divider (`border-subtle`) only when spacing alone is ambiguous. **Inset** dividers (aligned to content, e.g. list rows) vs **full-bleed** (section breaks). Decorative dividers are `aria-hidden`; meaningful separation uses `<hr>` / `role="separator"`. _Interlink: Calm + a11y semantics._

### 8.5 Focus ring `#57` (accessibility-critical — the hard rule)

**Decision:**

- **Trigger:** **`:focus-visible`** (keyboard/AT only — no ring on mouse click); suppress for mouse via `:focus:not(:focus-visible)`. Never style the ring on `:focus` alone.
- **Primary indicator = `outline`, NOT box-shadow:** `outline: 2px solid var(--ring)` (teal-600) `+ outline-offset: 2px`. Outline **respects border-radius** and **survives forced-colors mode** (box-shadow does not).
- **Spec:** **≥2px thick, ≥3:1 contrast** against both the component and the adjacent background (WCAG 2.2 **2.4.13** AAA / **2.4.11** AA / **2.4.7** AA).
- **Any-background robustness:** add a contrasting halo so it reads on colored surfaces — `outline` (teal) **+** `box-shadow: 0 0 0 4px var(--surface)` (or a two-tone ring). The **outline carries forced-colors**; the halo is enhancement only.
- **Never `outline: none`** without a compliant replacement (or set `outline-color: transparent` + box-shadow). **Not clipped** by `overflow:hidden`/sticky headers (SC 2.4.11). **`@media (forced-colors: active)`** → lean on `outline` + system `Highlight`.
  _Interlink: Part 2.11 (this is its detailed spec) + Built-for-every-Indian + Part 5 targets + Part 13._

### 8.6 Control border states (input / select / textarea / checkbox)

**Decision — color never alone; pair with icon/text/shape:** **Default** `border-default` (≥3:1) · **Hover** `border-strong` · **Focus** ring (8.5) + brand border · **Error** red border (Part 2.6) + red ring + icon + message · **Disabled** `border-subtle` at 38% opacity + `GrayText` in forced-colors + a "why disabled" affordance (Honest) · **Read-only** muted. Tailwind v4 variants: `hover: focus-visible: invalid: disabled: read-only: checked: forced-colors:`. _Interlink: Part 2.6/2.11 + Honest + a11y._

### 8.7 Selection / active ring

**Decision:** Selected items = **`strong 2px` teal border (or ring)** + teal-weak bg (Part 2.11), always with a **non-color cue** (checkmark/weight). Active tab = 2px teal indicator. Forced-colors → `SelectedItem/SelectedItemText`. _Interlink: Part 2.11 + 1.4.11 (selected state ≥3:1) + Part 10.8 (fill = active)._

### 8.8 Flat-card border & border-vs-shadow

**Decision:** **L0 flat cards** (Part 7) take a **hairline/`border-subtle`** for definition instead of shadow. **Use a border** for crisp/flat separation, dense UI, low elevation, and **high-contrast mode** (where shadows are stripped, borders carry the structure); **use shadow** for genuine lift (Part 7); a **subtle border + subtle shadow together** reads as a considered, premium card. _Interlink: Part 7 elevation + a11y._

### 8.9 Layout-shift safety

**Decision:** A border that appears on hover/focus must **not** resize the box → either keep a permanent `border: 1px solid transparent` (swap only the color), or use **`outline`** (no layout impact) for the transient ring. _Interlink: Part 4 layout stability / CLS._

### 8.10 Forced-colors / High-Contrast (baked in)

**Decision:** Full support via system-color keywords — `Canvas`/`CanvasText` (bg/text/dividers), `ButtonFace`/`ButtonBorder`/`ButtonText` (buttons), `Field`/`FieldText` (inputs), `Highlight`/`HighlightText` (focus/hover/selection), `SelectedItem/SelectedItemText` (selected), `GrayText` (disabled). `outline`-based focus survives; use `forced-color-adjust: none` only for brand swatches, sparingly. _Interlink: Built-for-every-Indian + Part 13._

---

**Part 8 interlink verification ✅**

- _Backward (Part 1):_ Calm-not-clinical → whitespace-over-lines, thin/soft borders, solid not dotted. Clarity → boundaries define grouping. Trust → verified badge borders/rings. Built-for-every-Indian (floor) → focus ring survives any bg/dark/forced-colors, 3:1 boundaries, color-never-alone. Honest → disabled state explained, not just dimmed.
- _Backward (Parts 2–7):_ border colors + the focus-ring one-liner come from Part 2.10/2.11 (this part details them); widths sit on the Part 4 grid; rings/borders follow Part 6 radius/squircle; flat-card border pairs with Part 7 L0; control borders wrap Part 5-sized targets.
- _Forward:_ **Motion** (focus/selection transitions — Part 9), **Z-index** (focus ring above siblings — Part 11), **Components** (every input/button/card inherits these border + focus tokens — Part 15), **Accessibility** (Part 13 audits 3:1 + 2.4.11/2.4.13 + forced-colors).
- _Token discipline:_ `border-width-{hairline,default,strong,heavy}`, `border-{subtle,default,strong}` (Part 2.10), `ring-{color,width,offset}`, `ring-halo`; outline-based focus; Tailwind v4-native; no `outline:none` without replacement.

_Part 8 research basis: ~41 sources this round (border systems/tokens: Atlassian border, USWDS border + tokens, MDN border-width/forced-colors, Tokens-Studio, TheLinuxCode; focus & WCAG 2.2: W3C 2.4.7/2.4.11/2.4.13 + 1.4.11 Understanding, Sara Soueidan focus-indicators, AllAccessible, TestParty ×3, AAArdvark, wcag.dock.codes, Eric Eggert, DigitalA11y, AccessiTREE; forced-colors/HCM: MDN forced-colors, Microsoft Fluent HCM, ServiceNow Horizon, CSSence, Tailwind states; states: UXPin button-states, Material states; retina hairline: 1px.com, Dieulot, annualbeta, CSSWG `hairline`/`border-round()` drafts) + prior corpus. Values locked as starting points; full contrast/forced-colors QA in Part 13._

# PART 9 — MOTION 🔒 LOCKED

_12 sub-parameters, each research-backed (~37 sources this round: motion systems & tokens — Carbon/IBM, Material 3, ruixen motion-tokens, DesignSystems.com; easing/springs — Material curves, Josh Comeau `linear()` springs; **reduced-motion / vestibular** — MDN, CSS-Tricks, OpenReplay, Pope-Tech, CodeLucky; micro-interactions & loading — NNG-cited Midrocket/Skillvalix/Bricx, healthcare-calm motion EducationalVoice; View Transitions + Speculation Rules — DEV 2026; **performance** — Motion.dev tier-list, Algolia 60fps, Reanimated, AppInstitute). **Boundary:** elevation-lift uses these tokens (Part 7.6); radius-morph uses Part 6 shape; per-component choreography → Part 15; "never flash/blink" triage → Part 2.7. Part 9 = how things move, only._

**The governing idea.** Motion must **clarify, never decorate** (Part 1). In healthcare, gentle purposeful motion **reduces anxiety and builds trust** — NNG shows interfaces with immediate feedback feel _faster even at identical response times_. So Datun's motion is **calm, quick, and physical** (a press that responds, a sheet that settles), **never bouncy, flashy, or jarring**, **always honoring `prefers-reduced-motion`**, and **always on `transform`/`opacity`** so it stays smooth on low-end Android.

### 9.1 Motion philosophy

**Decision:** Gentle, purposeful, consistent. **Productive (functional, quick) is the default**; **expressive (a touch of delight) is reserved** for a few signature moments (success checkmark) and still restrained. **Never linear** (unnatural); **no bounce/stretch/sudden-stops/flashing** (Calm + seizure-safety / WCAG 2.3.1 ≤3 flashes/sec). _Interlink: Clarity (motion clarifies) + Calm + Part 2.7 (no flash/blink)._

### 9.2 Duration scale `#58`

**Decision — ms tokens, scaled to size/distance (bigger move = longer), exits ~20–30% faster than enters:** `instant 0` · `fast 150` (micro/hover) · **`base 200`** (most transitions) · `moderate 300` (enter/exit, menus) · `slow 400` (sheets/large) · `slower 500` (page/complex). Most transitions stay **<500ms**. _Research: <100ms feels instant, 200–300ms is the UI sweet spot, >400ms feels slow; Carbon non-linear duration-by-size._

### 9.3 Easing & springs `#59`

**Decision — Material-style set:** `standard cubic-bezier(0.2,0,0,1)` (move within screen) · **`decelerate/out cubic-bezier(0,0,0.2,1)` for ENTERING** (fast→slow, settles) · **`accelerate/in cubic-bezier(0.4,0,1,1)` for EXITING** (slow→fast, leaves) · `emphasized cubic-bezier(0.2,0,0,1.2)` (key moments — _subtle_ overshoot, not a bounce). **Springs** (gentle, well-damped, **no bounce**) via CSS **`linear()`** for interactive/gesture (sheets, drag) — no JS dependency on low-end. Exit-exception: an element that stays nearby to return uses `standard`. _Interlink: Calm + Performance._

### 9.4 Transition patterns `#60`

**Decision:** `fade` (opacity) · `slide` (translate) · `scale` (0.96→1 + opacity) · **shared-element / container morph** (card→detail, FAB→sheet — uses Part 6 radius morph). **Enter from a meaningful origin** (a dropdown grows from its trigger, a detail morphs from its card — not "from nowhere"). **Enter ≠ exit** (enter decelerates in, exit accelerates out). _Research: "great" animation moves from contextually relevant locations._

### 9.5 `prefers-reduced-motion` `#61` (accessibility-critical)

**Decision:** **Progressive/opt-in preferred** — author static, add motion inside `@media (prefers-reduced-motion: no-preference)` (safest for unsensed-but-sensitive users) — plus a **global safety-net** that cuts durations to ~0.01ms for anything missed. **Reduce, don't nuke:** swap movement→**opacity/fade** (a modal that fades instead of flying up still signals state), cut duration, keep essential feedback. No large scaling/panning (vestibular triggers). Honors WCAG **2.3.1 / 2.3.3 / 2.2.2**. _Interlink: Built-for-every-Indian (floor) + Part 13._

### 9.6 Micro-interactions `#62`

**Decision — CSS-first (zero JS for ~90%), tokenized for consistency:** button **press scale ~0.97 + state-layer** (physical "snap"), hover lift on desktop (Part 7.6, via transform/opacity), toggle/checkbox check, **success checkmark + brief settle**, real-time field validation. Timing: **press ~100ms, hover 150ms, feedback ≤250ms**; appear within 300ms to avoid perceived lag. Every motion confirms an action — **feedback reduces anxiety + builds trust** (NNG). Never block interaction during animation. _Interlink: Trust + Calm + Part 5 press + Part 8 focus/selection._

### 9.7 Page / route transitions `#63`

**Decision:** **View Transitions API** (same- + cross-document) for smooth route changes — keeps focus/a11y/perf intact; **`view-transition-name`** for shared-element morphs (card→detail). Pair with **Speculation Rules prerender** of likely-next pages so the morph plays from frame 1 (not into a skeleton). App-face = native-app-like slide/fade; honors reduced-motion. _Interlink: PWA app-face architecture + Performance + Calm._

### 9.8 Loading & skeleton motion `#64`

**Decision:** **Skeleton screens > spinners** for content (feeds, dashboard, clinic lists, results) — placeholders that **match the real layout's dimensions (anti-CLS, Part 4)** with a **gentle shimmer**; fade smoothly to content; **one global indicator** per related content (no overwhelm). For Datun's "analyzing your symptoms" moment, the loader is **calm/reassuring** (soft on-brand pulse), never a frantic spinner. Determinate work shows honest progress. _Research: skeletons improve perceived performance; calm healthcare loaders ease anxiety. Interlink: Calm + Honest + Part 4 CLS._

### 9.9 Choreography / stagger `#65`

**Decision:** **Subtle stagger** (~20–50ms between list items) for elegant entrance; orchestrate so the eye follows a clear order; keep it gentle (never a long cascade). Disabled under reduced-motion. _Interlink: Clarity + Calm._

### 9.10 Haptics

**Decision:** **Subtle haptic feedback** on key confirmations (primary action success, important toggles, errors) as **progressive enhancement** (Android web Vibration API + native; limited on iOS web — never depended on). Sparing and meaningful, never noisy. _Interlink: Trust (tactile confirmation) + every-Indian (graceful absence)._

### 9.11 Performance `#66`

**Decision:** **Animate only `transform` + `opacity`** (compositor/GPU — smooth even when the main thread is busy); **never animate layout** (width/height/top/left/margin) or `box-shadow` (Part 7.6 uses a pseudo-element). `will-change` **sparingly** (memory). Prefer **CSS / WAAPI** (compositor) over main-thread libs; **lazy-load** any animation library; **test on mid/low-end Android** (60fps = 16.7ms, 120fps = 8ms budget). _Interlink: Built-for-every-Indian (floor) + Part 4 CLS + Part 7.6._

### 9.12 Motion tokens

**Decision:** `duration-{instant,fast,base,moderate,slow,slower}` · `easing-{standard,in,out,emphasized}` + `spring-{gentle,base}` (as `linear()`) · `keyframe-{fade,slide-up,scale-in}`. Built from one JSON source → CSS vars; Tailwind v4-native; consistent timing/easing for like elements (as important as consistent color/type). _Interlink: token discipline._

---

**Part 9 interlink verification ✅**

- _Backward (Part 1):_ Clarity → motion clarifies, enters from meaningful origin. Calm → gentle/quick, no bounce/flash, calm loaders. Trust → responsive feedback (NNG "feels faster"). Built-for-every-Indian (floor) → reduced-motion honored, transform/opacity-only for low-end, haptics graceful. Honest → honest progress, no fake-fast.
- _Backward (Parts 2–8):_ no color-flash (2.7/2.15); press/hover use Part 2.11 + Part 5 sizes; elevation-lift via Part 7.6 (transform/opacity, not box-shadow); radius morph via Part 6; focus/selection transitions via Part 8; skeletons preserve Part 4 layout (no CLS).
- _Forward:_ **Iconography** (animated icons/transitions — Part 10), **Components** (each component's choreography — Part 15), **Accessibility** (Part 13 audits reduced-motion + flash), **Imagery** (tasteful media motion — Part 14).
- _Token discipline:_ `motion-duration-*`, `motion-easing-*`, `motion-spring-*`, `motion-keyframe-*`; one JSON → CSS vars; Tailwind v4-native; no main-thread/layout animation.

_Part 9 research basis: ~37 sources this round (systems/tokens: Carbon/IBM motion, Material 3 easing-duration, ruixen motion-tokens, DesignSystems.com; easing/springs: Material curves, Josh Comeau linear(); reduced-motion: MDN, CSS-Tricks, OpenReplay, Pope-Tech, CodeLucky, web-animation-best-practices; micro-interactions/loading: Midrocket, Skillvalix, Bricx, NoBoringDesign, MMCommunications, EducationalVoice healthcare-motion, loading-wait NCBI; View Transitions/Speculation: DEV 2026; performance: Motion.dev tier-list + perf guide, Algolia 60fps, Reanimated, AppInstitute, Uiverse future-of-motion) + prior corpus. Token values are locked starting points; final tuning + frame-rate QA on low-end Android in Part 13._

# PART 10 — ICONOGRAPHY 🔒 LOCKED

_14 sub-parameters, each research-backed (~50 sources this round: library comparison — OpenReplay, Mantlr, PkgPulse, AllSVGIcons, iconfonttopng, HugeIcons, shadcndesign; grid/keyline/optical — Helena Zhang/Phosphor, Linda Ojo, Icons8, Atlassian, Telerik, Nikitisza, UXPlanet; states/labels — Material 3 nav, NNG icon-usability, UXMovement, Setproduct, Nitrous, NounProject, UXDworld; animated/trends — Unicorn Icons, IconikAI, Carmen Ansio, SVGator, Envato 2026; color/tokens/delivery — SVG-Genie sprites, currentColor, UXPin tokens, Mighil). **Boundary:** icon SIZE values → Part 5 (referenced here); icon MOTION → Part 9 (referenced); icon COLOR tints → Part 2 (referenced); internal-radius relationship → Part 6. Part 10 = the icon system itself._

**The governing idea.** Icons are **visual shortcuts that must be understood at a glance** — in a 10-language country where a dard-mein patient is scanning, not reading, an ambiguous icon is a _wasted feature_. So Datun's icons are **clear, simple, warm-humanist** (to harmonize with Anek), **labelled by default**, drawn from **one consistent family**, and used **functionally, not decoratively**. When clarity and grid-consistency conflict, **clarity wins**.

### 10.1 Icon philosophy

**Decision:** Clear > clever; simple > detailed; recognizable > novel. **Humanist/soft** to match Anek (geometric typeface→geometric icons; humanist typeface→softer curves). Functional, not decorative. **Prioritize recognition over cohesiveness — never sacrifice clarity.** _Interlink: Clarity + Calm + Part 3 (type character)._

### 10.2 Icon library `#67` (the decision)

**Decision: Phosphor Icons** as the primary library — **MIT, ~7,500+ icons, 6 weights (Thin/Light/Regular/Bold/Fill/Duotone)**, hand-drawn (optical perfection, not math-scaled), tree-shakable React/Next package, 24×24 grid. Chosen over Lucide (shadcn default — clean but outline-only, less personality), Heroicons (~300 icons — coverage gaps on medical), Material Symbols (variable fill-axis is elegant but neutral/Google-y, pairs Roboto not Anek), and Tabler. **Why Phosphor for Datun:** Fill weight = active states, Duotone = premium richness, friendly humanist curves = Anek-harmony + Calm-not-clinical, comprehensive **medical/dental coverage** (tooth, health glyphs). **Never mix libraries** (inconsistent stroke/weight). _Interlink: Calm + Part 3 (Anek humanist) + shadcn restyle (swap Lucide→Phosphor)._

### 10.3 Style & weights `#68`

**Decision — three weights in active use, the rest reserved:** **Regular (outline) = default UI** · **Fill = active/selected/emphasis** (tab active, toggled "like") · **Duotone = premium richness** (marketing, feature highlights, large hero icons — two-tone depth without illustration cost). Bold/Thin/Light reserved for rare needs. One weight system, applied by role. _Interlink: Part 2 (duotone tints) + 10.8 states._

### 10.4 Stroke weight `#69`

**Decision:** **Consistent ~1.5–2px stroke at 24px** across the whole set (Phosphor regular is uniform); scale stroke with icon size so weight reads constant. **Endpoints squared (not round/projecting), internal angles sharp, outer edges curved** (friendlier yet clear); never curve internal anchors; endpoint style "none" for crisp pixel alignment (no blur). Match the stroke's visual weight to Anek's body weight. _Research: Atlassian — curved outer edges friendlier, sharp internals keep clarity. Interlink: Part 3 weight harmony._

### 10.5 Grid, keylines & optical correction `#70`

**Decision:** **24px base grid** (16px for dense/inline) with an **invisible keyline set** (square ~20px, circle ~22px dia, portrait/landscape rects) + **live area + ~2px padding/trim** so icons feel equal in size even when pixel-dimensions differ. **Apply optical correction** — a star/triangle is nudged _larger_ than its keyline to compensate for negative space (the YouTube-triangle effect); align to the **optical** centre, not the geometric one. **If the keyline hurts clarity, break the grid** (clarity > consistency). _Interlink: Part 5 sizes + craft._

### 10.6 Icon corner radius `#71`

**Decision:** Small internal radii that match the soft-but-clear language — **~1–2px at 16px, ~2–4px at 24px**; outer corners gently rounded, internal angles stay sharp for legibility. Keeps icons in the Part 6 friendly-rounding family without going mushy. _Interlink: Part 6 (proportional radii) + Calm._

### 10.7 Sizing in context `#72` (references Part 5)

**Decision:** Use the Part 5 icon scale — `16 · 20 · 24 (default) · 32 · 40 · 48` — paired one step with text (Part 3). **The visual icon ≠ its hit-area:** a 24px glyph sits inside a **48dp touch target** via padding (Part 5.3). **Reduce detail at small sizes** (16px = simplified), add detail only at large sizes — same family, scaled clarity. _Interlink: Part 5.2/5.3 (sizes + hit-area) + Part 3 (pairing)._

### 10.8 Filled-vs-outline state rules `#73`

**Decision — fill is a _state signal_, never random:** **Regular outline = default/inactive; Fill = active/selected.** Active tab/nav item = **Fill + teal accent (Part 2) + bolder label** (stack signals, don't overdo). Outline→Fill transitions via a smooth cross-fade (Part 9). Mixing fill+outline arbitrarily in one row is forbidden; mixing them _as a state cue_ is the standard. State is **never color-alone** (fill + weight + color together). _Research: Material 3 / iOS — filled = active, outlined = inactive. Interlink: Part 8.7 selection + Part 9 motion + Part 2._

### 10.9 Icon + label (clarity rule) `#74`

**Decision:** **Label icons by default** for navigation and key actions — NNG: almost all icons are ambiguous, an "obscure icon = wasted feature," and labels should be **always visible**. Doubly true across Datun's **10 languages** (a metaphor universal in one culture may not be in another). **Icon-only** is allowed only for truly universal glyphs (search, close, back) in space-constrained spots — and always carries an accessible name (tooltip/`aria-label`). _Interlink: Clarity + Built-for-every-Indian + Part 12 (label copy)._

### 10.10 Icon color & tinting `#75` (references Part 2)

**Decision:** Monochrome icons use **`fill="currentColor"`** → inherit the surrounding **text token** (Part 2.10) by default; **semantic icons take semantic colors** (success/warning/error/info — Part 2.6); **duotone uses two CSS custom properties** (`--icon-fg` = teal-family, `--icon-bg` = a soft tint) drawn from the Part 2 ramp. Icons must read at **adequate contrast** on their surface (sunlight/cheap-screen legibility) and **never carry meaning by color alone**. _Interlink: Part 2.6/2.10/2.11._

### 10.11 Metaphor & consistency `#76`

**Decision:** Use **universal, recognizable metaphors** (magnifying-glass = search, paper-plane = send, heart = save) — **"if a metaphor needs explanation, it's the wrong icon."** One concept = one icon across the whole product; uniform stroke, corner-rounding, and ~3px internal spacing. Test metaphors for **cross-cultural Indian recognition**. _Interlink: Clarity + every-Indian + 10.1._

### 10.12 Animated icons `#77` (references Part 9)

**Decision — restraint:** Most icon motion = **CSS/SVG micro-interactions** (outline→fill cross-fade, gentle transform — compositor-cheap, low-end Android). For a **few signature moments** (success checkmark, the calm "analyzing" loader, onboarding, empty states) use **Lottie** (tiny **2–10 KB**, 60fps, mature) — or **Rive** if an icon must be genuinely state-driven (idle→loading→success in one file). **Lazy-load**; **static fallback under reduced-motion**; never over-animate (Calm). _Interlink: Part 9.6/9.8/9.11 + Calm._

### 10.13 Custom Datun dental set `#78`

**Decision:** A **small bespoke glyph set** for brand-specific concepts Phosphor can't cover with the right meaning (Datun tooth-mark, triage states, "doctor-backed report", clinic-verified badge) — drawn in **Phosphor's exact grid/stroke/weights** so they're indistinguishable from the family, with Regular + Fill variants. This is the **one brand-owned layer** atop the library (mirrors "only the seed colour is ours" from Part 2). _Interlink: Part 2 brand + Trust (verified/medical glyphs) + 10.2._

### 10.14 Delivery & tokens `#79`

**Decision:** **Phosphor React components, tree-shaken** (under ~100 icons → component imports beat sprites: typed, props-as-API for size/weight/color, no extra HTTP request, ~up-to-60% smaller bundles); `currentColor` for theming; **icon tokens named by intent** (`icon-size-{sm,md,lg}`, `icon-color-{default,muted,brand,success,…}`, `icon-weight-{regular,fill}`); animated icons lazy-loaded. SVG only (gzips 40–60% smaller than icon-fonts; scalable, crisp on every DPI). _Interlink: Part 5 sizes + Part 2 colors + token discipline + Performance._

---

**Part 10 interlink verification ✅**

- _Backward (Part 1):_ Clarity → recognizable metaphors, labelled, clarity-over-grid. Calm → soft humanist curves, restrained motion. Trust → bespoke verified/medical glyphs. Built-for-every-Indian (floor) → universal metaphors + labels across 10 languages, lean tree-shaken SVG for low-end. Honest → icons clarify real functions, never decorative filler.
- _Backward (Parts 2–9):_ color via Part 2 text/semantic tokens + duotone tints; pairs to Part 3 type (humanist→soft icons) one-step; sizes + 48dp hit-area from Part 5; internal radii in the Part 6 family; active-state fill ties to Part 7/8 selection; outline→fill + signature animations via Part 9.
- _Forward:_ **Components** (every button/tab/input inherits these icon tokens + state rules — Part 15), **Imagery** (icons vs spot-illustration boundary — Part 14), **Content** (icon labels — Part 12), **Inclusive usability** (icon names/contrast — Part 13).
- _Token discipline:_ `icon-size-*`, `icon-color-*`, `icon-weight-*`; Phosphor components + `currentColor`; bespoke set in-family; lazy-loaded animation; SVG-only.

_Part 10 research basis: ~50 sources this round (libraries: OpenReplay, Mantlr, PkgPulse, AllSVGIcons, iconfonttopng, HugeIcons, Moonb, shadcndesign; grid/optical/metaphor: Helena Zhang/Phosphor QA, Linda Ojo, Icons8, Atlassian, Telerik, Design-Bootcamp, Nikitisza, UXPlanet, Bigeye, DesignProject; states/tabs/labels: Material 3 nav-bar, NNG icon-usability, UXMovement, Setproduct, Nitrous, UXDworld, NounProject, uxpeak; animated/trends: Unicorn Icons, IconikAI, Carmen Ansio, SVGator, Envato/Author-Hub 2026; color/delivery/tokens: SVG-Genie sprites + currentColor, UXPin tokens ×3, Mighil, HugeIcons-react) + prior corpus. Library + values locked; bespoke dental set drawn during component build._

# PART 11 — OPACITY / SCRIM / Z-INDEX 🔒 LOCKED

_12 sub-parameters, each research-backed (~50 sources this round: z-index systems/tokens — Dev|Journal, StackLesson, OutSystems, FrontFixer, Medianic, DigitalThrive, OpenLibrary issue, Shubham Sharma; stacking-context/isolation — CSS-Tricks/Comeau, StackLesson; **top layer / `<dialog>` / Popover API** — web.dev Baseline, Open-UI, CSS-Tricks ×2, Benfrain, HTMHell, hidde.blog, Anja Beisel; opacity/alpha/color-mix — TheLinuxCode ×2, Workday Canvas tokens, CSS-Tricks, Muzli dark; backdrop-blur/glass — Glassmorphism-2.0, @supports fallback; scroll-lock — overscroll-behavior CSSWG, Jay Freestone iOS, CSS-Tricks, body-scroll-lock; **portals/Radix/a11y** — Radix Primitives/Themes/Vue dialog, React-portal guides, WCAG 2.1.2 focus-trap). **Boundary:** opacity **values** are consolidated from Part 2.14 (referenced); scrim **color** = Part 2 (warm hue ~85); overlay **motion** = Part 9; elevation surfaces/shadows = Part 7 (z-index is its paint-order companion); full component anatomy (modal/sheet/toast internals) → Part 15. Part 11 = the layering + transparency system._

**The governing idea.** Layering must be **predictable, not a war of magic numbers**. The 2026-forward path is to **let the browser do it** — native top-layer (`<dialog>`, Popover API) and Radix portals stack by open-order and escape z-index entirely — and keep a **small documented z-index token scale** only for the flat page chrome. Overlays must be **honest** (background clearly inert, important ones not dismissed by an accidental tap) and **calm** (Part 9 motion). Linus Torvalds' rule applies: don't fight the code (z-index:9999), design the relationships (the layer system).

### 11.1 Layering philosophy

**Decision — three tiers, in order of preference:** (1) **Native top-layer** (`<dialog>.showModal()` for blocking modals; **Popover API** for menus/tooltips/disclosure) — escapes z-index, built-in a11y/inert. (2) **Radix primitives via portals** (Datun's behavior layer) — stack by **open-order**, no z-index needed. (3) **z-index token scale** — only for non-portalled flat chrome (sticky header, bottom tab-bar, FAB, raised cards) + toasts. **Never escalate to `9999`; never `!important` z-index.** _Interlink: Calm + Clarity + Part 7 elevation._

### 11.2 z-index token scale `#80`

**Decision — named tokens in `:root`, spaced for insertion, mirroring Part 7 levels:** `z-below -1` · `z-base 0` (L0) · `z-raised 10` (L1) · `z-sticky 100` (L2 header / bottom tab-bar) · `z-dropdown 1000` (L3 menus/select) · `z-scrim 1100` (`= calc(z-modal - 1)`) · `z-modal 1200` (L4 dialogs/sheets) · `z-popover 1300` · `z-toast 1400` (above modal so alerts show) · `z-tooltip 1500` (top interactive) · `z-max 9999` (skip-link/dev only). Authored as CSS vars, Tailwind v4-native. _(Browsers clamp at 2147483647.) Interlink: Part 7.2 L0–L4 (kept consistent) + token discipline._

### 11.3 Stacking-context discipline `#81`

**Decision:** Use **`isolation: isolate`** to seal a component's internal layering (creates a stacking context with **no visual side-effects** — no opacity/transform needed) so local z-index never leaks globally; inside it use **local tokens** (`z-top`/`z-bottom`). Know the **traps** (a child's `z-index:9999` loses if an ancestor formed a lower stacking context via `position`+z, `opacity<1`, `transform`, `filter`, `will-change`, `contain`). **Fix structure, don't escalate.** Use `calc()` for strict relationships (scrim = `z-modal − 1`). **Stylelint bans raw z-index numbers** (token-only); zero `!important`. _Interlink: Performance + maintainability._

### 11.4 Native top-layer primitives `#82` (2026-forward)

**Decision:** **Blocking modals/consent/important forms → `<dialog>` + `.showModal()`** — renders in the **top layer** (above all z-index), auto-attaches **`::backdrop`** scrim, sets **`aria-modal`**, makes the rest **`inert`**, traps focus, Esc closes. **Non-modal overlays (menus, select, tooltip, disclosure) → Popover API** (`popover`) — native top-layer, light-dismiss, focus + a11y wired, far less JS. Both escape the stacking-context bugs of hand-rolled overlays. _Interlink: Built-for-every-Indian (robust everywhere) + Honest + Part 13 a11y._

### 11.5 Portals & Radix `#83`

**Decision:** Datun's Radix behavior primitives render via **portals** (into a dedicated root) and **stack by open-order** — Radix's guidance is followed verbatim: **use only `auto`/`0`/`-1` z-index on Radix parts**, let the portal/`<Theme>` stacking context separate main vs overlay content. Inherit Radix's a11y anatomy (Overlay covers the inert portion · Content · Title · Description · Close). Control **Next.js `@layer` order** so Datun tokens win over Radix defaults. _Interlink: shadcn/Radix restyle (Part 2/8) + Part 13._

### 11.6 Scrim / backdrop `#84`

**Decision:** The dimming layer behind modals/sheets/drawers = **warm-tinted (Part 2, hue ~85, never pure black)**, `scrim 0.5` (default) / `backdrop 0.6` (heavier), via `<dialog>::backdrop` or the Radix Overlay. **Dark-mode tuned** (a white/black wash is wrong — use a deep warm-neutral tint). It signals the background is inert. _Interlink: Part 2.8/2.14 + Part 7.2 (L4) + Calm._

### 11.7 Backdrop-blur `#85` (restrained, perf-gated)

**Decision:** A **subtle `backdrop-filter: blur(12–16px)` only on the scrim / app-face sticky header** — never on content cards (glassmorphism stays **rejected**, Part 7). **Always `@supports (backdrop-filter: blur())` with a solid-color fallback**; **skip on low-end Android** (blur is GPU-expensive) and when **`prefers-reduced-transparency: reduce`** → solid. _Research: 12–16px is the readable frost range; universal support but always fall back. Interlink: Built-for-every-Indian + Performance + Part 7 (no glass on surfaces)._

### 11.8 Opacity / alpha tokens `#86` (consolidates Part 2.14)

**Decision — one alpha scale, ≤8 steps, authored via `color-mix()` / `oklch(… / α)`:** `alpha-0` (transparent) · `overlay-hover 0.08` · `overlay-pressed 0.12` · `disabled 0.38` · `scrim 0.5` · `backdrop 0.6` (+ shadow alphas, Part 7). **Hard rule: never put `opacity` on a container that holds text/icons** (it fades the children into a muddy mess) — use a **transparent background color** or a **pseudo-element overlay** so text stays crisp; reserve the `opacity` _property_ for fading a whole element (transitions, icon-only disabled). **Disabled = 0.38**, but if a disabled element sits over other content use a **solid muted token** instead. _(Alpha stacks multiplicatively — two 50% = 75%.) Interlink: Part 2.14 (values) + Part 2.11 states + Clarity (legible)._

### 11.9 Scroll-lock `#87`

**Decision:** When an overlay is open, lock the background with **`overscroll-behavior: contain`** on the overlay's scroll container (the clean, hack-free path) + **`scrollbar-gutter: stable`** so locking doesn't shift layout (Part 4 CLS). `<dialog>.showModal()` makes the background `inert` (no scroll/focus) for free. For mobile-Safari edge-cases use the **save-scroll → `position:fixed` → restore-on-close** pattern (or a tested lib); **always restore the exact scroll position** on close. _Interlink: Part 4 CLS + Built-for-every-Indian (iOS + Android) + Honest (user doesn't lose their place)._

### 11.10 Overlay a11y & dismissal `#88`

**Decision:** Every overlay: correct **role + `aria-modal` + `aria-labelledby`/`describedby`** (Radix/native give these), a **temporary, keyboard-escapable focus-trap** (WCAG 2.1.2), **Esc to close**, and **focus returns to the trigger** on close. **Light-dismiss** (tap-scrim / Esc) for low-stakes overlays; **manual / no-light-dismiss** for forms with unsaved input (don't lose a user's progress — Honest). Mobile sheets support **swipe-down dismiss** (Part 9 gesture). _Interlink: Honest + Part 9 motion + Part 13._

### 11.11 Datun overlay layer map

**Decision — each surface to a primitive + layer:** **Consult bottom-sheet** → Radix/sheet at `z-modal` (+ scrim), swipe-down · **Confirm / consent dialog** → `<dialog>.showModal()` (top-layer, inert, manual-dismiss for consent) · **Select / dropdown** → Popover/Radix at `z-dropdown` · **Tooltip** → Popover top-layer / `z-tooltip` · **Toast (success/error)** → `z-toast` (above modal; via z-index, not top-layer, to avoid invocation-order conflicts) · **App-face sticky header & bottom tab-bar** → `z-sticky` · **FAB** → `z-sticky`. _Interlink: Part 7 elevation + the PWA app-face architecture + Part 15._

### 11.12 Tokens

**Decision:** `z-{below,base,raised,sticky,dropdown,scrim,modal,popover,toast,tooltip,max}` + `alpha-{0,overlay-hover,overlay-pressed,disabled,scrim,backdrop}`; one JSON → CSS vars; Tailwind v4-native; **Stylelint enforces token-only z-index**; prefer top-layer/portals over raw z-index. _Interlink: token discipline._

---

**Part 11 interlink verification ✅**

- _Backward (Part 1):_ Calm → predictable layering, no z-index chaos, gentle overlay motion. Clarity → clear front-to-back hierarchy, scrim focuses attention. Trust → background visibly inert; important dialogs not lost to a stray tap. Built-for-every-Indian (floor) → native primitives robust everywhere, blur perf-gated + skipped on low-end, iOS+Android scroll-lock. Honest → no accidental-dismiss data loss, scroll position preserved.
- _Backward (Parts 2–9):_ scrim/overlay colors + alpha from Part 2.8/2.14 (warm, dark-tuned); z-index mirrors Part 7.2 L0–L4 (scrim at L4); resolves Part 8.5's "focus ring above siblings" (top-layer/`isolation`); overlay enter/exit + swipe + reduced-motion via Part 9; never animate layout/blur on low-end (Part 9.11).
- _Forward:_ **Content** (overlay titles/labels — Part 12), **Accessibility** (focus-trap/aria/inert/reduced-transparency audit — Part 13), **Components** (modal, bottom-sheet, dropdown, tooltip, toast, popover all inherit these layers + scrim + a11y — Part 15).
- _Token discipline:_ `z-*`, `alpha-*`; CSS vars from one JSON; Stylelint token-only; top-layer/portal-first; `isolation: isolate` to seal contexts; `calc()` for scrim relationship.

_Part 11 research basis: ~50 sources this round (z-index systems/tokens: Dev|Journal earezki, StackLesson, OutSystems-UI, FrontFixer, Medianic, DigitalThrive, OpenLibrary #12363, Shubham Sharma, aimactgrow; stacking/isolation: CSS-Tricks/Comeau, StackLesson; top-layer/dialog/popover: web.dev Baseline dialog-popover, Open-UI explainer, CSS-Tricks popover-vs-dialog ×2, Benfrain top-layer, HTMHell toast-conflict, hidde.blog, Anja Beisel dialog deep-dive, specification.website; opacity/alpha/color-mix: TheLinuxCode opacity + rgba ×2, Workday Canvas opacity tokens, CSS-Tricks opacity(), Muzli dark-mode; backdrop-blur/glass: Glassmorphism-2.0 + @supports; scroll-lock: CSSWG overscroll-behavior, Jay Freestone iOS, CSS-Tricks prevent-scroll, body-scroll-lock, Drupal; portals/Radix/a11y: Radix Primitives/Themes/Vue Dialog + issue #1317, React-portal guides ×2, Logan Lee modal, WCAG 2.1.2) + prior corpus. Scale values + alpha tokens locked as starting points; final QA on-device in Part 13._

# PART 12 — CONTENT & VOICE 🔒 LOCKED

_18 sub-parameters, each research-backed (~53 sources this round: voice/tone — Shopify Polaris, Mailchimp model, brand-voice 2026 guides, Eleken, healthcare-voice; **plain language / health literacy** — CDC, NAM, plainlanguage.gov, PMC health-lit knowledge, 8th-grade target; **medical disclaimers / consent** — Usercentrics, TermsFeed, Mediktor/symptom-checker patterns, DPDP; microcopy/errors/empty/success — NNG-cited UXCC, Raw.Studio, ParallelHQ, 3 Cs + STOP framework; capitalization/punctuation — Material/Google Assistant, Superset, sentence-case consensus; **inclusive/non-stigmatizing + dental anxiety** — CDC/AMA/18F guides, person-centred dental-care PMC; content a11y/live-regions — MDN, a11y-blog, AI-app 2026 patterns; i18n/governance + 2031 — UXCC content-2026, UXPin governance). **Boundary:** reading-level + multilingual **type** mechanics = Part 3 (referenced); icon labels = Part 10.9; dialog titles/dismissal = Part 11; urgency **color** = Part 2; consent/medico-legal **flow** = Part 15 / System layer. Part 12 = the actual words._

**The governing idea.** Datun's words must be **clear, warm, honest, and doctor-backed** — a calm person-centred voice for someone who is worried or in pain, written so a 12-year-old understands it the first time, in their language, and never reinforcing the "scary dentist" trope, never shouting, never selling with fear. Mark Twain's rule governs every string: the right word, not the almost-right word. **`AI` never appears**, and **`free` follows the refined rule (Part 12.5)** — never a brand-lead/shout, allowed only as honest no-cost reassurance, mission-truth, the tourism estimate, or a ₹0 label (Part 1, Honest).

### 12.1 Voice — the constant personality `#89`

**Decision — 5 traits (always on):** **Warm** (human, never cold/clinical) · **Clear** (plain, jargon-free, one idea at a time) · **Trustworthy** (doctor-backed, evidence-grounded, never over-claims) · **Calm** (reassuring, composed, never alarmist) · **Respectful** (non-judgmental, person-first, treats every Indian as capable). _We are NOT: salesy, cute-for-cute's-sake, fear-mongering, robotic, or condescending._ _Interlink: Part 1 (Trust/Calm/Clarity/Honest/every-Indian) — voice is those principles in words._

### 12.2 Tone — flexes by context `#90`

**Decision:** Voice constant, **tone modulates with the user's emotional state** (Mailchimp/Polaris model): **in pain / emergency** → calm, direct, zero fluff · **onboarding / dashboard** → encouraging, light · **medical info / results** → precise, plain, neutral · **success** → warmly restrained (no confetti for a clinical result) · **errors** → blame-free, helpful. Map tone per surface in the style guide. _Interlink: 12.1 + Calm + 12.8/12.10._

### 12.3 Plain language & reading level `#91`

**Decision:** Target **~Grade 6–8**, **universal-precautions** (write plainly for _everyone_ — you can't tell who has low health-literacy, and low-literacy users feel shame). Short sentences, active voice, common words; define or avoid jargon; **layered** (a plain summary first, optional "learn more" depth). STOP test on every string: _Situation, Tone, Objective, Plain-language ("can a 12-year-old get it?")_. _Research: 8th-grade health-comms standard, CDC Vital Signs layering. Interlink: Built-for-every-Indian (floor) + Clarity + Part 3 (16px/legibility)._

### 12.4 The "AI" rule `#92`

**Decision:** **Never** say "AI", "chatbot", "bot", "algorithm" in any patient- or clinic-facing copy. Datun is the **doctor-backed** brand; the engine is invisible. Say "Datun", "your assessment", "your report", "reviewed by a dentist" — never "our AI". _Interlink: Part 1 anti-principle ("AI" is the engine, not the pitch) + Trust._

### 12.5 The "free" rule `#93`

**Decision (REFINED 18 Jun 26 — research-backed, 100+ sources; SUPERSEDES the earlier absolute ban and every per-family "free" word-check in the build spec):** The absolute ban is **lifted**. **"Free" is never a brand-lead or a promotional shout** — the hero/positioning always leads with mission + value + trust (never "free dental consultation"), cost guides use ₹ ranges, and there is no "FREE!" hype. **But "free"/"no-cost" IS allowed — sparingly and honestly — in four places:** (1) a **reassurance at a hesitation/objection point**, _always_ paired with the business model + privacy — "No cost to you · funded by partner clinics · your data is never sold" (this also defuses the #1 health-app fear that a free app sells your data); (2) **mission-truth** — "always free for patients," framed as mass-access (Jio-style), not a discount; (3) the **dental-tourism estimate CTA** — "Get a free estimate" (honest, category-standard, conversion-positive); (4) a **"₹0" label** on the included pricing tier. **Principle: Datun's free = mass-access mission, not a discount** — communicate it quietly and confidently with funding-transparency, never as a cheap hook. Always be **honest about what _is_ paid** (in-clinic procedure, Pro tier); never hide cost (no dark patterns, CCPA). _Interlink: Part 1 (Honest floor) + Part 18 (Brand: mission-first) + no-dark-pattern law._

### 12.6 Medical-safety language `#94` (highest-stakes — validate with Indian healthcare counsel)

**Decision:** Frame as **"doctor-backed diagnosis"** — **never softened to "guidance"** (Part 1.2 locked) — because a **licensed dentist backs it**; that is precisely what makes "diagnosis" honest here. Pair it with **honest scope, not denial**: "Reviewed by a licensed dentist. A remote assessment can't fully replace an in-person exam — for any treatment or procedure we connect you to a verified clinic." **Emergency escalation stays calm but unambiguous** (Clarity wins for safety): for red-flags (facial swelling, trouble breathing/swallowing, uncontrolled bleeding, high fever with dental pain) → "This needs urgent in-person care now — go to the nearest hospital/emergency." **Medication-safety** wording: dosage/allergy/interaction cautions in plain words, "tell your dentist about other medicines/allergies." **DPDP consent** copy: plain, explicit, granular (health data is sensitive) — never pre-ticked, never buried. ⚠️ _This sub-param's exact wording must be validated against India's Telemedicine Practice Guidelines / NMC + a healthcare lawyer before launch — Claude sets the design intent, not the legal sign-off._ _Interlink: Honest + Trust + Part 1.2 + Part 15 consent flow._

### 12.7 Microcopy patterns `#95`

**Decision:** **Buttons = verb-first + specific** ("Ask Datun", "Book appointment", "Download report" — never "Submit"/"OK" when a real verb fits). **Labels** above fields (Part 3); **placeholders are examples, never labels** (they vanish on input). **Helper text** sits below, plain. **Links describe their destination** (never "click here"/"read more" alone). The 3 Cs: **Clear, Concise, Contextual** (79% skim → front-load, every word earns its place). _Interlink: One-clear-action + Clarity + Part 10.9 (icon+label)._

### 12.8 Error messages `#96`

**Decision — `[what happened] + [why, if useful] + [how to fix]`, no blame, no jargon, no codes:** conversational, "you"/contractions, never "You did X wrong" → "That didn't go through — check your connection and try again." Always a next step; **preserve the user's input**; show **inline** at the field plus a polite summary; calm (no "Oops!"/"Fatal error"). _Research: NNG error principles + CCCC (clarity/consistency/control/confidence). Interlink: Calm + Honest + Part 2.6 (error color+icon) + 12.17 (announced via live region)._

### 12.9 Empty states `#97`

**Decision:** Never a dead blank. **First-use** → explain the value + one clear action ("Ask Datun about any tooth problem"). **Cleared** (e.g., no past reports yet) → reassure + guide. **Error-empty** → say what happened + retry. Warm one-liner + (optional) a simple spot illustration (Part 14). _Interlink: Clarity + Calm + Part 14 imagery._

### 12.10 Success & confirmations `#98`

**Decision:** Plain and human — **"Your assessment is ready"** not "Analysis complete"; **"Appointment booked for 5 Jun, 4:00 pm"** not "Success". Close the loop (confirm + what's next), **restrained celebration** (a clinical result is reassurance, not confetti). _Research: plain confirmations cut anxiety + support tickets. Interlink: Calm + Part 9 (gentle success motion)._

### 12.11 Loading / progress copy `#99`

**Decision:** **Calm, honest reassurance** — "Reviewing your answers…", "Preparing your report…" — never "Analyzing with AI…" (12.4) and never fake-fast. Determinate work shows honest progress. Pair with the calm loader (Part 9.8). _Interlink: Calm + Honest + Part 9.8._

### 12.12 Capitalization & punctuation `#100`

**Decision:** **Sentence case everywhere** (buttons, labels, titles, nav, dialogs, tooltips) — capitalize only the first word + proper nouns (**Datun**, doctor names, cities, language names) + acronyms; it's faster to scan, friendlier, and **localizes better**. **Use contractions** (warm, not stilted). **Oxford/serial comma** (clarity in lists of 3+). **Exclamation points: rare** (avoid shouting — Calm). **Numerals, not spelled-out** (glanceable). **No ALL-CAPS** for emphasis (hard to read + shouts). _Research: Material/Google Assistant + sentence-case consensus. Interlink: Clarity + Calm + 12.16 (localization)._

### 12.13 Numbers, dates, currency, units `#101`

**Decision — locale-correct via `Intl` (`en-IN` + per-language):** **Currency = ₹ with Indian digit grouping** (`₹1,00,000`, the Razorpay/Indian-fintech norm) via `Intl.NumberFormat('en-IN', {style:'currency', currency:'INR'})`. **Dates = `DD MMM YYYY`** ("5 Jun 2026" — unambiguous, no DD/MM vs MM/DD confusion); relative for recency ("2 days ago"). **Time = 12-hour + am/pm** patient-facing. **Phone = `+91 XXXXX XXXXX`**. **Western digits (0–9)** (universally read in India; native-script numerals optional per locale). **Tabular figures** for aligned data/health-scores (Part 3). _Interlink: Part 3 (tnum) + Built-for-every-Indian + Trust (legible data)._

### 12.14 Terminology / lexicon `#102`

**Decision:** A **controlled vocabulary — one term per concept**, documented as preferred/banned pairs: e.g. **"assessment"/"report"** (not "diagnosis result"/"output"), **"consultation"** (not "session"), **"appointment"/"book"** (not "slot"/"reserve"), **"dentist"/"clinic"** (consistent), **"Datun"** (always capitalized, never "the app"). Banned: "AI"/"bot", fear words, "user" (say "you"). **"free" is NOT banned outright** — it follows the refined rule (Part 12.5): never a brand-lead/promotional shout, allowed only as honest no-cost reassurance (with the business model), mission-truth, the tourism estimate CTA, or a ₹0 pricing label. A living glossary governs all copy. _Interlink: Clarity + consistency (builds trust) + 12.18 governance._

### 12.15 Inclusive & respectful language `#103`

**Decision:** **Person-first, non-stigmatizing, never fear-mongering.** Don't weaponize fear of tooth loss to drive bookings (violates Calm + Honest/no-dark-pattern); don't reinforce the **"scary dentist"** trope — normalize care calmly. Acknowledge **dental anxiety** with empathy ("many people feel nervous about the dentist — that's okay"). No shame, no talking-down (low-literacy users already feel shame). Culturally respectful across India. _Research: CDC/AMA inclusive-language + person-centred dental-care. Interlink: Calm + Respectful (12.1) + every-Indian._

### 12.16 Multilingual content `#104` (references Part 3)

**Decision:** Datun's languages get **transcreation, not literal machine-translation** — idiom, medical terms, and tone adapted per language (a fear-reducing line must _feel_ reassuring in Tamil, not just be translated). Keep **English loanwords where they're the genuine vernacular** ("X-ray", "cavity" are often said in English even in Hindi); **professional human review for all safety/consent/medical strings** (never auto-MT those). Hinglish acceptable only where natural for the audience, never in medico-legal copy. Strings live in an i18n catalog (12.18). _Interlink: Built-for-every-Indian (floor) + Part 3 (Anek scripts, per-script line-height) + 12.6._

### 12.17 Content accessibility `#105`

**Decision:** Every meaningful image has **alt text**; **icon-only controls carry an accessible name** (Part 10.9); **dialogs have titles** (Part 11); **link text is self-describing**; headings are clear + ordered (Part 3.12). **Dynamic content uses ARIA live regions** — toasts/inline-errors/status via `role="status"`/`<output>` (`aria-live="polite"`), genuinely urgent alerts `assertive`/`role="alert"`; the conversational assessment announces new content politely as it appears. _Research: MDN live-regions + AI-app 2026 patterns. Interlink: Part 10.9 + Part 11 + Part 3.12 + Accessibility (Part 13)._

### 12.18 Governance & content tokens `#106`

**Decision:** A **content style guide** (this part, operationalized) + **all copy as i18n string keys in a catalog** (never hardcoded) — one source, localizable, reviewable, enforceable; component-scoped keys (`consult.cta.primary`, `error.network.retry`). Banned/preferred lexicon (12.14) is enforced in review; **any AI-assisted draft copy is reviewed against this voice** before shipping (2026 governance). _Interlink: token discipline + 12.14 + every later component (Part 15)._

---

**Part 12 interlink verification ✅**

- _Backward (Part 1):_ Honest (floor) → no "AI"; "free" per the refined rule (Part 12.5 — not a brand-lead/shout, only honest no-cost reassurance / mission-truth / tourism-estimate / ₹0-label); honest scope + paid-clarity, no fear-selling, real confidence. Built-for-every-Indian (floor) → Grade 6–8 plain, 10-language transcreation, `Intl` formatting, content a11y. Trust → doctor-backed framing, consistent lexicon, evidence-grounded, no over-claim. Clarity → one idea/string, specific buttons, scannable. Calm → reassuring tone, composed emergencies, restrained success, no shouting/exclamation. One-clear-action → verb-first single primary CTA.
- _Backward (Parts 2–11):_ urgency uses Part 2 color (composed) + words here; type/reading-level/tnum from Part 3; icon labels from Part 10.9; dialog titles + dismissal copy ("don't lose your progress") from Part 11; success/loading words ride Part 9 motion.
- _Forward:_ **Accessibility** (alt/labels/live-regions/headings audit — Part 13), **Imagery** (alt text + empty-state spot art — Part 14), **Components** (every button/field/error/toast/dialog/empty-state pulls its strings + tone from here — Part 15), **System layer** (consent + medico-legal flow wording — validated with counsel).
- _Token discipline:_ i18n string catalog (keys, not hardcoded) · controlled lexicon (preferred/banned) · sentence case · `Intl` en-IN formatting · AI-draft copy reviewed against voice.

_Part 12 research basis: ~53 sources this round (voice/tone: Shopify Polaris, brand-voice 2026 ×3, Eleken UX-writing, Branding-Pioneers healthcare, voice/tone playbook; plain language/health-lit: CDC plain-language, NAM translation checklist, PMC health-lit knowledge + research-comms, UMaryland/Preston/Pacific guides; disclaimers/consent: Usercentrics medical-disclaimer, TermsFeed ×4, Mediktor/ChatMed/symptom-checker store listings, DPDP; microcopy/errors/empty/success: UXCC how-to-write-errors, Raw.Studio hidden-states, ParallelHQ 10-best-practices, Eric-Wong 3Cs/STOP, Rounak Agrawal, Afsheen Khaan humanizing-errors; capitalization/punctuation: ToolLoom, Herosmyth, Every-Interaction, Maxim Rahr, Superset, Google Assistant; inclusive/dental-anxiety: CDC/AMA/18F guides, person-centred dental-care PMC, dental-fear literature, Clear-Fear app study; content a11y/live-regions: MDN, a11y-blog, USPTO, GroovyWeb AI-apps-2026, UXPin; i18n/governance/2031: UXCC content-2026, UXPin design-trends) + prior corpus. Lexicon + formatting locked as starting points; medico-legal strings (12.6) pending counsel validation._

# PART 13 — ACCESSIBILITY 🔒 LOCKED

_14 sub-parameters, each research-backed (~70 sources this round: WCAG 2.2/3.0/APCA — Askem, LevelAccess, Vervali, web-accessibility-checker, ADAQuickScan; **India law** — IS 17802/RPwD/GIGW via BarrierBreak, DigitalA11y, Pivotal, Deque-SEBI, CABE; keyboard/focus/semantics/ARIA — accessibility-check, A11Y-Collective, Accesstive, W3Schools, DEV; forms/mobile/cognitive — A11Y-Pros, BrowserStack; **testing & overlays** — inclly, a11yproof, AccessProof, TestParty, axe-core/Deque, Overlay Fact Sheet, FTC; media/alt — Siteimprove, AltAudit, W3C-WAI, ALA; trends — accessibility.com, Applause, Northeastern AI-prompts). **This part does NOT change any locked decision — it consolidates the accessibility already built into Parts 1–12, sets the bar, and adds what wasn't yet covered (keyboard, screen-reader semantics, forms, media, testing, process).** **Boundary:** values live in their home parts (referenced here); component-level a11y acceptance criteria → Part 15._

**The governing idea.** Accessibility at Datun is **good design baked in, targeted sensibly — not gold-plated, not bolted on.** The bar is **WCAG 2.2 Level AA** (the normal, expected, legally-referenced level — _not_ AAA-everywhere, which contradicts real production and would hurt the product). It's already woven through Parts 1–12 (contrast, targets, focus, labels, reduced-motion, live regions); this part makes it **auditable** and fills the gaps. We **never** use an accessibility overlay. Nadella's framing fits Datun's mission: _empower every person — and "every person" includes every ability._

### 13.1 Target & philosophy `#107`

**Decision:** **WCAG 2.2 AA** is the target (2.2 is a strict superset of 2.1; meeting it auto-meets 2.1). **AAA only where it's already free/done** (e.g., our optional high-contrast theme, our 48dp targets that exceed the 24px floor) — never chase AAA across the board. **WCAG 3.0 / APCA = watch, don't build** (3.0 is a Working Draft, ~2029 Rec, will coexist; APCA is exploratory/non-normative — nothing for 2.2 is wasted). Accessibility is **proportionate, design-first, and continuous** (a habit in design+QA, not a pre-launch scramble). _Interlink: Built-for-every-Indian (floor) + Honest + "don't break the design system"._

### 13.2 India legal anchor `#108`

**Decision:** Datun is a **public-facing private health service → covered by RPwD Act 2016 + IS 17802** (BIS, legally enforceable since 11 May 2023 under the RPwD Amendment Rules) and aligned with **GIGW 3.0**. Since **IS 17802 aligns with WCAG 2.2**, hitting **AA satisfies it**. Add the two cheap, expected artifacts: a plain **accessibility statement** and a **grievance/feedback contact** (also a trust signal). ⚠️ _Confirm specifics with Indian counsel alongside the medico-legal copy (Part 12.6)._ _Interlink: Honest + Trust + 12.6._

### 13.3 POUR coverage (consolidation of Parts 1–12) `#109`

**Decision — Datun's existing parts already satisfy POUR; this is the map:**

- **Perceivable:** readable contrast 4.5/3 + non-color cues (Part 2), legible type/16px/`lang` (Part 3), alt text + captions (13.10/Part 14), live-region announcements (Part 12.17).
- **Operable:** 48dp targets + thumb-zone (Part 5), full keyboard + visible focus (13.5/Part 8), gesture alternatives (Part 11.10), reduced-motion + no-strobe (Part 9), enough time (no auto-timeouts without extend).
- **Understandable:** plain language Grade 6–8 + consistent lexicon (Part 12), consistent nav/layout + one-clear-action (Parts 1/4), helpful announced errors (Part 12.8).
- **Robust:** semantic HTML + ARIA-only-to-enhance + valid roles/names/states (13.6), works across AT (VoiceOver/TalkBack/NVDA). _Interlink: literally Parts 1–12._

### 13.4 Color & contrast `#110`

**Decision:** Body/UI meet **AA (4.5:1 text / 3:1 large+UI)** (Part 2.9/2.10); **meaning never by color alone** — always a second cue (icon/label/shape/weight), covering color-vision deficiency + sunlight + cheap screens (Parts 2.7/2.11/8.6/8.7/10.8/10.10). Optional **high-contrast theme** for OS preference (Part 2.13). APCA-aware later. _Interlink: Part 2 (color) + Part 10 (icons)._

### 13.5 Keyboard & focus `#111`

**Decision:** **All functionality operable keyboard-only** (no mouse required) — critical on the clinic desktop app, baseline on patient web. **Visible focus** via `:focus-visible` outline (Part 8.5); **logical focus order** matching visual order; a **skip-to-content link**; **focus not obscured** by sticky headers (WCAG 2.2 SC 2.4.11); **focus management on overlays** — moves into a dialog on open, returns to trigger on close, **no keyboard traps** (Part 11.10). _Interlink: Part 8.5 + Part 11.10 + clinic desktop app._

### 13.6 Screen-reader semantics `#112`

**Decision:** **Semantic HTML first; ARIA only to enhance** (never to replace native semantics — a real `<button>`, not a div). **HTML5 landmarks** (`header/nav/main/aside/footer`, multiples labelled with `aria-label`), **one h1 + logical h2–h6** (Part 3.12), **roles/names/states** on custom components (tabs/sheets/menus), **`lang`** set per the active language (multilingual, Part 12.16). Dynamic updates use **live regions** (Part 12.17). Decorative graphics hidden (`aria-hidden`/null alt). _Interlink: Part 3.12 + Part 10.9 + Part 11 + Part 12.17._

### 13.7 Forms & authentication `#113`

**Decision:** Every field has a **visible + programmatic label** (`<label>`/`aria-label`, Part 12.7); **group** related fields (`fieldset`/`legend`); **required** marked visually + `aria-required`; **errors announced + tied to the field** (`aria-describedby` + live region, Parts 12.8/12.17); correct **`autocomplete`** attributes (faster for everyone). **Accessible authentication** (WCAG 2.2 SC 3.3.8): OTP via SMS is fine; **never a cognitive-puzzle CAPTCHA** with no alternative. _Interlink: Part 12.7/12.8 + Part 5 (field sizing)._

### 13.8 Target size & dexterity `#114`

**Decision:** **48dp default / 44 min, ≥8dp spacing** (Part 5.3) — never "tiny targets" as a tradeoff. **Gesture actions always have a non-gesture alternative** (a visible close button beside swipe-to-dismiss; Part 11.10). Primary action in the thumb zone. _Interlink: Part 5.3 + Part 11.10._

### 13.9 Motion & transparency `#115`

**Decision:** Honor **`prefers-reduced-motion`** (reduce/▶swap-to-fade, Part 9.5); **no content flashing >3×/sec** (seizure-safety, Part 9.1); honor **`prefers-reduced-transparency`** → solid (Part 11.7). Animation never the _only_ way information is conveyed. _Interlink: Part 9.1/9.5 + Part 11.7._

### 13.10 Images & media `#116`

**Decision — alt text by role:** **decorative → null `alt=""`** (skipped), **informational → meaningful description**, **functional/linked → describes the action**, **complex (charts/score visuals) → short alt + longer description**; don't double-describe what body text already says (Part 12.17 + Part 14). **Any video/time-based media gets captions + a transcript** (AA) — but at launch Datun is media-light, so this is "caption what's needed to use the product," **not** AAA audio-description gold-plating. **AI-drafted alt/captions must be human-reviewed** for accuracy (quality varies). _Interlink: Part 12.17 + Part 14 imagery._

### 13.11 Cognitive accessibility `#117`

**Decision:** **Plain language Grade 6–8** (Part 12.3), **consistent layout + predictable navigation** (Parts 1/4), **one clear action** (Part 1.4), minimal-step flows, **no hover-only or animation-only** information, and **enough time** (no silent timeouts; offer "need more time"). Especially vital for a worried or in-pain patient. _Interlink: Part 12.3 + Parts 1/4 + Calm._

### 13.12 Mobile & assistive tech `#118`

**Decision:** Verify a **logical reading order** and correct **role/name/state** under **VoiceOver (iOS) + TalkBack (Android)** (+ NVDA for clinic desktop) — iOS skews VoiceOver in premium-urban India, Android-majority skews TalkBack, so **test both**. **Multi-cue alerts** (visual + haptic + screen-reader announcement, Parts 9.10/12.17), and core tasks usable **without precise gestures**. _Interlink: Part 5 + Part 9.10 + Part 11 + Part 12.17._

### 13.13 Testing & process `#119`

**Decision — automated + manual, in the pipeline (Datun already runs Lighthouse CI):**

- **Automated on every PR:** `eslint-plugin-jsx-a11y` (code-time) + **axe-core** via `@axe-core/playwright` (E2E) + **Lighthouse CI** (Part 5.3 of infra). Know the limit: **automation catches only ~30–40%** — a green build is _not_ "accessible."
- **Manual (the 60–70%):** a **keyboard pass** + **screen-reader smoke test** (VoiceOver/TalkBack/NVDA) + **contrast spot-checks** on key flows (consult, results, booking, login); periodic deeper audit (IAAP-style) as Datun grows.
- **NEVER an accessibility overlay** (accessiBe/UserWay/AudioEye) — they paper over broken markup, can introduce new bugs, the FTC banned the "95%" claim, and courts don't treat them as a defense. Build it right instead.
- **AI-assisted a11y triage** (alt/label/heading suggestions) = a drafting aid with **mandatory human review** (2031-forward). _Interlink: infra Lighthouse CI + verification sequence (lint→test→build) + Honest._

### 13.14 Anti-patterns & governance `#120`

**Decision — explicitly rejected:** ❌ accessibility overlays/widgets · ❌ AAA-everywhere gold-plating (slows the product, contradicts production) · ❌ meaning by color alone · ❌ keyboard traps / `outline:none` without a replacement · ❌ auto-MT on safety/consent strings (Part 12.16) · ❌ "fix it before launch" bolt-on. **Ship:** an **accessibility statement + grievance contact** (13.2), an **a11y acceptance checklist per component** (Part 15), and a11y baked into design reviews. _Interlink: 13.2 + Part 15 + every-Indian._

---

**Part 13 interlink verification ✅**

- _Backward:_ this part **is** the consolidation — Part 1 (every-Indian floor + Honest + Clarity + one-action), Part 2 (contrast + non-color cues + high-contrast theme), Part 3 (type + headings + `lang`), Part 5 (targets + dexterity), Part 8 (focus), Part 9 (reduced-motion + no-strobe), Part 10 (icon labels + fill-state), Part 11 (overlay focus + dismissal + reduced-transparency), Part 12 (plain language + live regions + alt + form copy + AI-review). **No locked value is changed here** — only referenced and audited.
- _Forward:_ **Imagery** (alt-text + decorative rules — Part 14), **Components** (each ships with a11y acceptance criteria: roles/labels/focus/contrast/targets — Part 15), **System layer** (CI a11y gates, accessibility statement, periodic audit).
- _Token/process discipline:_ AA target · `eslint-plugin-jsx-a11y` + axe-core + Lighthouse CI on every PR · manual keyboard + SR smoke · no overlays · accessibility statement + grievance · per-component checklist.

_Part 13 research basis: ~70 sources this round (WCAG 2.2/3.0/APCA: Askem, LevelAccess, accessibilitychecker, Vervali, web-accessibility-checker, ADAQuickScan, David-Pham; India IS 17802/RPwD/GIGW: BarrierBreak, DigitalA11y, Pivotal, Deque-SEBI, Aaravinfotech, S4Carlisle, Accessible-Minds, CABE, BrowserStack-SEBI; keyboard/semantics/ARIA: accessibility-check, A11Y-Collective, Accesstive, W3Schools, DEV, AudioEye, beaccessible; forms/mobile/cognitive: A11Y-Pros, BrowserStack mobile; testing/overlays: inclly ×2, a11yproof, AccessScore, TestParty, David-Mello/Playwright, AccessProof axe-core, qaskills, Applause, Overlay Fact Sheet, FTC accessiBe ruling; media/alt: Siteimprove, AltAudit, W3C-WAI captions, ALA, Northeastern AI-prompts; trends: accessibility.com 2026, AI-a11y) + prior corpus. Bar + process locked; specifics validated on-device + with counsel as Datun scales._

# PART 14 — IMAGERY 🔒 LOCKED

\*14 sub-parameters, each research-backed (~50+ sources this round: healthcare photography & trust — Futurise, Sprypt, PM360, MelissaKelly, Eleken/Refera-dental, Designity, Framerbite; **illustration systems** — Airbnb visual-language, GetIllustrations, Medium/Nathan, Corporate-Memphis/Alegria origin; **image performance** — Xictron, SitePoint, Logos, DigitalApplied, ImageToURL cheatsheet, next/image/Viprasol; **treatment** — CSS-Tricks scrim/floor-fade, 99designs duotone, Wikipedia duotone, Dreamstime dental-diagram; **DPDP/consent** — EasyClinic, Kalp, Ayu, Ricago, DPDP Act text/MeitY; **AI-imagery** — Squareshot/Clutch, pxz.ai, LensGo/FTC, Pict.AI, Rewarx, RemWeb; **empty-states/onboarding** — Toptal, Mobbin, Eleken, UserGuiding, Formbricks; **trends** — DesignMantic, VanDusen, DigitalSynopsis). **Boundary:** values live in their home parts — aspect-ratio tokens = Part 4, radii/circle = Part 6, scrim/overlay mechanics = Part 11, color/duotone/gradient = Part 2, icon system = Part 10, avatar sizes = Part 5, alt-text rules = Part 13.10, media-motion/perf principles = Part 9. **Part 14 = the imagery system & direction itself + image-delivery (new).\***

**The governing idea.** At Datun, **imagery is functional, real, and warm — never decoration, never faked.** Real beats stock (patients spot stock instantly and trust drops); warm beats sterile (we're a doctor, not a bank); and every image must explain, guide, or build trust — otherwise it's decorative and hidden from assistive tech. Three carriers do three jobs: **photo** = real people & clinics (trust), **illustration** = concepts, empty-states & empathy, **icon** = functional UI (Part 10). Paul Rand's line is the test: _design is the silent ambassador of your brand_ — so every Datun image must speak Trust, Calm, and Honesty.

### 14.1 Imagery philosophy & role `#121`

**Decision:** Imagery serves **Trust + Calm + Clarity**, never ornament. Each asset earns its place (explains a concept / guides an action / builds trust) or it is **decorative → hidden from AT** (Part 13.10). **Real > stock**; **warm > sterile**. Rejected outright: ❌ sterile "medical-blue + stethoscope" stock (Part 1 anti-principle, raises anxiety) · ❌ Corporate-Memphis / Alegria / UnDraw-Humaaans blob illustration (homogenized cliché) · ❌ AI-fabricated "real" people (14.11). _Interlink: Part 1 (Trust/Calm/Honest) + Part 13.10._

### 14.2 Photography direction `#122`

**Decision:** **Real, documentary/candid, warm-graded.** Authentic **Indian diversity** — age, region, skin tone, gender, ability — reflecting real India, **never tokenism / "fake diversity."** Real **verified dentists** and **real clinics** (Honest — no models pretending to be doctors, no generic Western stock). Favor provider-patient warmth and bedside-manner moments over stiff corporate poses; a real smartphone clinic photo beats a $500 stock model. **Patients only with explicit consent** (→14.10). _Interlink: Trust + Honest + every-Indian + 14.10._

### 14.3 Illustration system `#123`

**Decision:** A **defined system, not one-off art** (Airbnb's three layers): **visual** = warm humanist line, consistent weight, Part 2 teal-family palette, Part 6 rounded forms, harmonized with Anek + Phosphor; **contextual** = empty-states, onboarding, concept explainers, errors; **emotional** = calm and reassuring (never childish, never corporate-memphis). Restrained and **blends into the UI — enhances focus, doesn't steal it** (Linear/Notion). **Custom/commissioned** — this is, alongside the Part 10 dental glyphs, a brand-owned visual layer. _Interlink: Part 2 + Part 6 + Part 10 + Calm._

### 14.4 Carrier boundary — photo vs illustration vs icon `#124`

**Decision — one carrier per job:** **Icon** (Part 10) = functional, small, in-line UI affordance · **Illustration** = concepts, empty-states, onboarding, empathy, things that don't photograph well (abstract/future) · **Photo** = real people, real clinics, trust moments (doctor profiles, the team, the report experience). Don't mix randomly; the test is "does it explain or guide?" — if not, it's decoration and gets hidden. _Interlink: Part 10 + 14.1 + Part 13.10._

### 14.5 Medical & dental visuals `#125`

**Decision:** Dental diagrams (tooth cross-section — enamel/dentin/pulp; implant placement; "where the procedure happens") are **clear, calm, and non-graphic** — smooth gradients, soft on-brand tones, clean infographic style, labeled — **educational, never alarming** (no blood, no scary clinical realism; Calm). **Avoid heavy 3D/WebGL on marketing** (Part 9.11 perf) — prefer 2D illustration/SVG; any 3D is lazy-loaded + reduced-motion-safe. Medically accurate, validated with clinical input. _Interlink: Calm + Part 9.11 + Trust + 12.6._

### 14.6 Image treatment `#126`

**Decision:** **Rounded corners** by container (Part 6 radii); **warm color-grade**; optional **duotone/tint in the Part 2 teal-family** for stylized, consistent sets (map colors to darks/lights, reserve a non-clashing color for any CTA over the image); **scrim/overlay for all text-on-image** — a floor-fade gradient (transparent→dark, e.g. to `rgba(0,0,0,.6)`) plus optional text-shadow — so text stays legible (Part 11 scrim + Part 13.4 contrast). No harsh filters; consistent treatment tokens. _Interlink: Part 6 + Part 2 + Part 11 + Part 13.4._

### 14.7 Aspect ratios & composition `#127`

**Decision:** Use the **Part 4 aspect-ratio tokens** (1:1 avatars, 4:3 / 3:2 cards, 16:9 hero/video, etc.); **always reserve space** (explicit width/height or `aspect-ratio`) → eliminates image-driven CLS (Part 4 + 14.9). Consistent crop discipline; keep the subject focal-safe across breakpoints (art-direction via `<picture>` where the crop must change). _Interlink: Part 4 + 14.9._

### 14.8 Avatars & doctor photos `#128`

**Decision:** Real **verified-doctor headshots are a trust moment** — sized per Part 5 (64–96 on profiles), **circle-cropped** (Part 6), with a **verified badge** overlay. **Fallback when no photo = initials** on a tonal teal-family background (Part 2 + Part 3 type), consistent shape — never a broken-image or generic silhouette. Patient avatars default to **initials** (privacy-first). _Interlink: Part 5 (sizes) + Part 6 (circle) + Part 2 + Trust._

### 14.9 Image performance (NEW) `#129`

**Decision — `next/image` on Next.js + Cloudflare:** **AVIF → WebP → fallback**, responsive **`srcset`/`sizes`**, `loading="lazy"` below-fold, **never lazy the LCP/hero** → eager + **`fetchpriority="high"` + preload (at most one per page)**, **explicit width/height or `aspect-ratio`** (anti-CLS), `decoding="async"`, mid-range quality (AVIF ≈ Q55 / WebP ≈ Q78), **blur-up LQIP placeholder**, `Vary: Accept` + immutable cache; **SVG for illustrations/icons** (serve once). Lean payloads for low-end Android + data cost. _Interlink: Part 9.11 (perf) + Part 4 (CLS) + every-Indian floor + infra (Cloudflare/Next.js)._

### 14.10 Patient-photo consent & privacy — DPDP `#130`

**Decision:** Patient-uploaded teeth/intraoral/face photos are **sensitive health data under the DPDP Act** (Datun = data fiduciary). Require **explicit, purpose-specific, informed consent** before capture/upload; **data minimisation** (only what the assessment needs); **secure/encrypted storage**; patient rights honored (access/correct/**delete**); **never used in marketing or testimonials without a separate written release**; and **never fed to public/third-party AI tools** (a real precedent: patient surgical photos surfaced in an AI training set without consent). Privacy-by-design. ⚠️ _Validated with counsel alongside 12.6._ _Interlink: Honest + Trust + 12.6 + 14.11._

### 14.11 AI-generated imagery policy `#131`

**Decision:** **Never fabricate "real" patients, doctors, clinics, testimonials, or events with AI** — that's deception (FTC endorsement rules, EU AI Act), it breaks Trust, and it risks the uncanny valley (consumers are ~95% wary of AI imagery). AI is permitted **only** for: (a) **abstract/decorative illustration & backgrounds** (nothing presented as a real person/place), (b) **enhancing/retouching real photos** without misrepresenting, (c) **internal concept/mockups**. Every AI asset is **human-reviewed** for authenticity, **diversity (no bias/tokenism)**, no uncanny artifacts, and clear license/likeness/copyright. Patient photos never go to public AI (14.10). Default to **real or commissioned**. _2031-forward:_ disclosure norms are tightening — **label** anything that could imply realism. _Interlink: Part 1 Honest + Part 12.4 (AI never a crutch) + 14.10._

### 14.12 Empty states & onboarding imagery `#132`

**Decision:** An empty state is a **guided starting point, not a dead end** — structure: **context** (why it's empty) → **guidance/CTA** (the next step) → an **on-brand spot illustration**; headline first, then secondary line, then action; **never lazy "no data."** Consider **data-seeding** (sample content) to show the working state. Onboarding illustrations **reduce friction, show progression, and "explain why"** we ask for something. Meaningful illustrations get **alt text**; purely decorative ones are **hidden from AT** (Part 13.10). _Interlink: Part 12.9 (empty) + 12.10 (success) + Part 13.10 + 14.3._

### 14.13 Backgrounds, patterns & textures `#133`

**Decision:** **Subtle and calm** — Part 2 teal-family, **gradients minimal (light, not decoration)** (Part 2.15); **never busy** (content legibility first — Calm). Decorative backgrounds are `aria-hidden` (Part 13). No heavy textures that bloat payload (14.9). _Interlink: Part 2.15 + Calm + Part 13 + 14.9._

### 14.14 Governance, tokens & sourcing `#134`

**Decision:** **Treatment tokens** (radius / aspect-ratio / overlay-scrim / duotone) live in the system (Parts 6/4/11/2). **Sourcing order:** real → commissioned illustration → authentic, diverse stock (rare) → **never cliché/Corporate-Memphis**. Maintain **one commissioned illustration set** (the brand-owned visual layer). Track **licensing + consent/release** per asset; enforce the **AI policy** (14.11). **Every image has alt text by role** (Part 13.10). _Interlink: Parts 2/4/6/11 + Part 10 (commissioned set) + Part 13.10 + 14.11._

---

**Part 14 interlink verification ✅**

- _Backward:_ Part 1 (Trust/Calm/Honest/every-Indian → real-not-stock, warm-not-sterile, no-fake), Part 2 (palette + duotone/tint + minimal gradients), Part 4 (aspect-ratio tokens + CLS reservation), Part 6 (radii + circle avatars), Part 7 (content/cards layered over media), Part 9 (media motion + reduced-motion + perf 9.11), Part 10 (icon-vs-illustration boundary + duotone + commissioned-glyph precedent), Part 11 (scrim/overlay on text-over-image), Part 12 (empty-state 12.9 + success 12.10 + consent 12.6 + AI-word 12.4), Part 13 (alt by role 13.10 + decorative hidden + text-on-image contrast 13.4 + reduced-transparency). **No locked value changed — referenced and extended.**
- _Forward:_ **Components** (Part 15 uses these avatar / empty-state / media-card / doctor-profile patterns with their image-performance + a11y baked in), **System layer** (build-time/edge image pipeline in CI, patient-photo consent flow, illustration commissioning + asset/license governance).
- _New this part:_ image **delivery & performance** (14.9 — `next/image`, AVIF/WebP, srcset, lazy/eager+fetchpriority, blur-up, anti-CLS) — previously uncovered, now closes the loop with Part 9.11 + every-Indian.

_Part 14 research basis: ~50+ sources this round (photography/trust: Futurise, Sprypt, PM360, MelissaKelly, Eleken-Refera, Designity, Framerbite, 99designs; illustration systems: Airbnb visual-language, GetIllustrations, Medium/Nathan, Corporate-Memphis/Alegria; performance: Xictron, SitePoint, Logos, DigitalApplied, ImageToURL, Viprasol/next-image, ImagetoURL cheatsheet; treatment: CSS-Tricks, 99designs duotone, Wikipedia, Dreamstime dental; DPDP/consent: EasyClinic ×2, Kalp, Ayu, Ricago, DPDP-Act/MeitY; AI-imagery: Squareshot/Clutch, pxz.ai, LensGo/FTC, Pict.AI, Rewarx, RemWeb, ShotBG, KellyHeck; empty-states/onboarding: Toptal, Mobbin, Eleken, UserGuiding, Formbricks; trends: DesignMantic, VanDusen, DigitalSynopsis, Kittl, ReallyGoodDesigns) + prior corpus. Direction + delivery locked; photo/illustration assets commissioned and consent/AI specifics validated with counsel as Datun scales._

# PART 15 — COMPONENTS 🔒 LOCKED

_14 sub-parameters, each research-backed (~60 sources this round: architecture — shadcn/Radix/Base-UI/CVA via ShadiSbaih, GreatFrontend, ShadcnSpace, Vercel-Academy, PkgPulse, TheFrontKit, DEV, JishuLabs; buttons/states — UXPin ×2, Mobbin, Figma, Carbon, DesignMonks, EightShapes, ICDS/UK-SIS; inputs/forms/selection — UXPatterns, DesignSystems.surf, Setproduct, Carbon ×2, GoodPractices, W3C-APG switch ×2, USWDS, Lollypop; navigation — UXPin, Medium, DesignStudio, UXDworld, iOS-tab-bar, UXPlanet, PhoneSim; overlays — Moon-DS, Setproduct, GitLab-Pajamas, Eleken-popover, LogRocket, UX-Collective, UXPin-modals, BetterLink, UK-SIS-toast; feedback — Onething, RedHat, Smart-Interface-Patterns ×2, perpendicularangel, Carbon-loading ×2, Polaris-spinner, UK-SIS-skeleton; conversational — Fuselab, UXPin-chat, BricxLabs, DesignStudio, AIUXDesign, Gapsy, Lovable). **This is the layer where Parts 1–14 tokens become UI.** **Boundary:** this part defines the **component system + catalog + the per-component contract** (FAANG component-spec grade); pixel-exact Storybook stories are implementation. Every value below resolves to a token from Parts 1–14 — no magic numbers._

**The governing idea.** Components are **composed from tokens, behavior-correct by default, and consistent everywhere.** We don't hand-build behavior or accessibility — **Radix/Base-UI primitives** carry it; we restyle them to Datun tokens. Brad Frost's frame is the law: _we're not designing pages, we're designing systems of components._ Each component is small, composable, token-only, typed, and ships with its variants, states, a11y contract, and motion already decided — so Datun (and Prasanth) build screens, never re-litigate primitives.

### 15.1 Component architecture & the three laws `#135`

**Decision:** **shadcn/ui (own-the-code generator) + Radix primitives, restyled to Datun tokens**, living in the Turborepo **`packages/ui`** (exports per component: `./button`, `./card`, `./dialog`…). Tooling: **CVA** (class-variance-authority) for type-safe variants, **`cn()`** (clsx + tailwind-merge) for class merging, **`asChild`/Slot** for polymorphism. **Three laws every component obeys:** (1) **Headless behavior** — Radix/Base-UI handle ARIA, keyboard, focus; (2) **Variants via CVA** — not ad-hoc props; (3) **Token-only styling** — no raw literals/magic numbers (`bg-primary` not `bg-teal-600`, spacing/size/radius from Parts 4/5/6). **Composition > heavy variants**; TS-first; theme via CSS vars (light/dark/high-contrast automatic). **Base-UI is the sanctioned fallback** for complex widgets where Radix lags (combobox/multiselect). **No heavy MUI runtime** (protects INP — Part 9.11). _Interlink: every part's "feeds Components" forward-ref + Part 9.11 + Prasanth handoff._

### 15.2 The component contract (meta-spec) `#136`

**Decision — every component must define, in this order:** **(a) Anatomy** (named slots/parts) · **(b) Variants** (intent/style) · **(c) Sizes** (from Part 5 control tokens) · **(d) States** (the universal matrix — 15.13) · **(e) Tokens used** (Parts 1–14) · **(f) A11y contract** (role, accessible name, keyboard map, focus behavior — Radix/APG + Part 13) · **(g) Motion** (transitions + press, Part 9) · **(h) Responsive** (mobile-first, container-query aware — Part 4) · **(i) Content/copy** (Part 12). A component isn't "done" until all nine are specified and the a11y checklist (15.14) passes. _Interlink: consolidates Parts 1–14 into a per-component checklist._

### 15.3 Buttons & button-like `#137`

**Decision — variants:** `primary` (filled teal-600, the "Ask Datun" action) · `secondary` (tonal/teal-weak or neutral) · `tertiary/ghost` (low-emphasis, used carefully — ghosts can "disappear," so ensure contrast) · `destructive` (error-red, composed not aggressive) · `link/text` · `icon-only` (square at control height, **always an `aria-label`**) · `overlay` (on media, with scrim). **Sizes** `sm 40 · md 48 (default) · lg 56 (hero CTA)` (Part 5.2). **Radius = pill** (Part 6). **States** default/hover(±8%)/pressed(±12%, press-scale ~0.97)/focus-visible(teal ring, Part 8.5)/disabled(38%, visible)/**loading**(inline spinner, prevents double-tap)/selected (toggles) — **never color-alone** (Part 8.6). **One primary per view** (Part 1 One-clear-action; Carbon's single-high-emphasis rule); **full-width on mobile, hug on desktop** (Part 5). Icon+label by default (Part 10.9). _Interlink: Parts 5/6/8/9/10 + Part 1 + Part 12.7 (verb-first copy)._

### 15.4 Text inputs & fields `#138`

**Decision — anatomy:** **label (always visible, sentence-case, no colon)** + field/container + **persistent helper** (below) + **inline error** (`<output>` / `aria-describedby`, specific + corrective, replaces helper, error-red + icon) + optional prefix/suffix, char-count, clear-button. **Placeholder = hint, never the label** (Part 12.7). **Field height md 48** (Part 5), **radius md 12** (Part 6), **≥16px font on iOS** (no auto-zoom), full-width in container (Part 5). **States** rest/focus(teal ring)/filled/**error**(aria-invalid + announced)/disabled(38%)/read-only. **Required-vs-optional:** mark only the minority. **Password** = masked + visibility toggle; plus textarea, search, number/stepper, currency (₹ Indian grouping — Part 12.13), file/photo-upload (consent — Part 14.10), OTP (accessible-auth, Part 13.7). _Interlink: Parts 5/6/8 + Part 12.7/12.8/12.13 + Part 13.7 + Part 14.10._

### 15.5 Selection controls `#139`

**Decision:** **Checkbox** (multi-select / independent / indeterminate) · **Radio** (one-of-set, grouped in `fieldset`/`legend`) · **Switch** (binary, instant-update, `role="switch"`, Space toggles, **label always**) · **Segmented control** (2–4 mutually exclusive options). All: **≥48dp target** (Part 5.3), **focus ring** (Part 8.5), **never color-alone** (Part 8.6), semantic HTML + Radix (Part 13.6), state text-equivalent for SR. _Interlink: Part 5.3 + Part 8 + Part 13.6/13.7 + W3C-APG._

### 15.6 Pickers `#140`

**Decision:** **Select / Dropdown** (Radix Select, L3 popover, Part 7) · **Combobox / Autocomplete** (searchable; **Base-UI where Radix lags**, 15.1) · **Multi-select** (chips for selected, 15.10) · **Date / time picker** (DD MMM YYYY, 12-hr — Part 12.13) · **OTP input** (segmented, autocomplete `one-time-code`). All follow **APG listbox/combobox**, open as **non-modal popover** (L3, z-1300, Part 11), keyboard-navigable, type-ahead. Long lists virtualized. _Interlink: Part 7 (L3) + Part 11 (popover) + Part 12.13 + Part 13.7._

### 15.7 Cards & surfaces `#141`

**Decision:** Base card = **`surface` + radius lg 16** (Part 6) + **L0 flat with hairline border** _or_ **L1 `shadow-sm`** when genuinely raised (Part 7/8) — a subtle border + subtle shadow reads premium. **Anatomy:** media (Part 14, aspect-ratio Part 4) · header (title/subtitle) · content · footer/actions · optional badge (15.10). **Composition over variants** (Card/CardHeader/CardContent/CardFooter). Hover-lift only on desktop via pseudo-element transform (Part 7.6). **Variants** (composed, not bespoke): info card, **doctor card** (15.12), **assessment/diagnosis card** (15.12), clinic card, media card, stat card. Internal padding ≥ gap to siblings (Part 4). _Interlink: Parts 4/6/7/8/14 + composition (15.1)._

### 15.8 Navigation `#142`

**Decision — face-aware (locked architecture):** **App-face = bottom tab-bar** — **4 primary destinations** (e.g. Home·Reports·Find a dentist·Profile), fixed, **icon + label**, **active = Phosphor Fill + teal + bolder label** (≥2 cues, never color-alone — Part 10.8), badges for updates (15.10), **safe-area inset** (Part 4 `env()`), VoiceOver announces destination + selected. **Top app-bar** (contextual title, back/up, actions). **Website-face = marketing header/nav** (logo, links, "Ask Datun" CTA, "For Clinics" cross-link) — **NO app tab-bar**. **Breadcrumbs** on the clinic desktop app. >5 destinations → "More". _Interlink: locked PWA two-face architecture + Part 10.8 + Part 4 safe-area + Part 5.3 + Part 13._

### 15.9 Overlays `#143`

**Decision (confirms Part 11):** **Dialog/Modal** = native `<dialog>.showModal()` or Radix Dialog — **radius xl 24** (Part 6), **L4 `shadow-xl` + scrim 0.5–0.6** (Part 7), `role=dialog`+`aria-modal`+`aria-labelledby`, **focus-trap + Esc + restore + `inert` background**, **multiple dismiss paths** (guard outside-click on unsaved/destructive — Honest), **one obvious primary action**, z-1200; reserve for decisions that block. **Bottom sheet** = top **2xl 28** / bottom 0 (Part 6), modal focus-trap, **snap points**, **swipe-down + a visible close button** (gesture-alternative — Part 13.8), rises from bottom (Part 9). **Popover/Menu** = **non-modal** (Popover API/Radix), L3 `shadow-lg`, z-1300, click-outside/Esc, **no nesting**. **Tooltip** = L3, z-1500, **never the sole carrier of info** (Part 13.11), delay-in. _Interlink: Part 11 (whole) + Parts 6/7/9 + Part 13.8/13.11._

### 15.10 Feedback & status `#144`

**Decision — by wait-time & disruption:** **Skeleton** (default for content load; calm, CSS-first, subtle <1s, `aria-busy` + not-focusable; **never for toasts/menus/the modal-shell itself**) > **Spinner** (small inline/button actions; label "Reviewing…"/"Submitting…" — **never "Analyzing with AI"**, Part 12.4/12.11; avoid many at once) > **Progress bar** (determinate/honest for >10s or staged — e.g. PDF report; background-state for long ops). Ladder: <1s none · 1–10s skeleton/spinner · >10s progress. **Toast/Snackbar** (z-1400, bottom on mobile _above the tab-bar_): auto-dismiss + `role="status"`/`alert` (Part 12.17) for **non-essential** confirmations, visual timer, hover-pause; **toast with an action → no auto-dismiss** (`role=dialog`, focus + Esc); **destructive → Undo**. **Badge** (static status/count; semantic color + text/icon, never color-alone — Part 8.6). **Chip/Tag** (radius full — Part 6; static category/data **or** interactive filter/selection/**quick-reply**; ≥48dp if interactive — Part 5.3; don't blur static-vs-interactive styling). **Alert/Banner** (semantic composed colors — Part 2; persistent dismissible; inline for form errors — Part 12.8). **Empty state** (Part 14.12: context → CTA → spot illustration). _Interlink: Part 9.8/9.5 + Part 12.4/12.8/12.11/12.17 + Part 2 + Part 8.6 + Part 14.12._

### 15.11 Data display `#145`

**Decision:** **List / list-item** (avatar 15.12/Part 14.8 + title + meta + trailing action; dividers `border-subtle` — Part 8) · **Table** (clinic desktop; **`control-xs 32` dense rows** with ≥44 touch padding — Part 5.2; sortable headers, sticky header L2, zebra optional, pagination) · **Accordion / Disclosure** (Radix, animated height — Part 9, `aria-expanded`) · **Tabs** (Radix, in-page section switch — distinct from the bottom tab-bar) · **Avatar** (Part 14.8: sizes/circle/verified-badge/initials-fallback) · **Divider** · **Tooltip-free stat/metric** display (tabular figures — Part 3/12.13). _Interlink: Part 14.8 + Parts 3/5/8/9 + Part 12.13._

### 15.12 Datun signature components `#146`

**Decision — the brand-defining set (composed from the catalog above):**

- **Consult — guided assessment conversation** (the core front door): message/question bubbles (user vs system distinct), **quick-reply chips** for structured answers (15.10) + free-text where needed, **photo-upload** (intraoral, with DPDP consent — Part 14.10), **voice-input** option (every-Indian/a11y), a **calm "Reviewing your answers…" indicator** (Part 12.11, **never "AI"** — Part 12.4), **editable previous answers** (tap to change, no restart), **capability transparency + honest scope** ("a doctor-backed assessment; a remote check can't fully replace an in-person exam" — Part 12.6), and **graceful escalation** to emergency/clinic routing.
- **Diagnosis / Assessment card** (the PDF-able result): **"doctor-backed diagnosis"** framing (never "guidance" — Part 12.6), clear findings + recommended next step (medicine-in-consult _or_ route to a **verified** clinic), share/download-PDF action, medical disclaimer.
- **Doctor card** (directory/trust): real verified headshot (Part 14.8, 64–96, circle, **verified badge**), name/qualification/clinic, **Book** CTA (primary), distance/rating.
- **Clinic card** (directory): photo, name, verified badge, services, distance, **Book/Directions**.
- **Emergency / escalation banner**: calm-but-unambiguous, high-visibility without fear-mongering (Part 12.6), one clear action.
- **Consent UI** (DPDP): plain-language, **granular, never pre-ticked**, purpose-specific (Part 12.6 + Part 14.10).
  _Interlink: Part 1 (Trust/Clarity/Honest) + Part 12.4/12.6/12.11 + Part 14.8/14.10/14.12 + the catalog (15.3–15.11)._

### 15.13 Universal states & validation matrix `#147`

**Decision — every interactive component handles, as applicable:** **default · hover (desktop) · pressed/active · focus-visible · disabled (38%, visible) · loading · error · selected/active · read-only · empty (for data containers)**. Rules: **acknowledge every action instantly** (immediate visual — Part 9), **never a blank screen** (skeleton/empty-state), **close the loop** on completion, **maintain layout stability** (reserve space — Part 4 anti-CLS), **state never by color alone** (Part 8.6), all states **legible in light + dark + high-contrast** (Part 2.13). Errors: inline, blame-free, preserve input, announced (Part 12.8 + Part 13.7). _Interlink: Part 9 + Part 4 + Part 8.6 + Part 2.13 + Part 12.8 + Part 13._

### 15.14 Governance, naming, tokens & a11y acceptance `#148`

**Decision:** Components live in **`packages/ui`** (single source; **no page-level overrides** — variants only). **Naming:** PascalCase components, kebab files, CVA variants by **intent** (`variant`/`size`/`tone`). **Docs:** **Storybook** for every component (all variants × states + an a11y addon), **visual-regression** in CI (Chromatic or Playwright screenshots) to catch drift. **A11y acceptance checklist per component** (role/name/keyboard/focus/contrast/targets/reduced-motion — Part 13.14) gates merge, alongside the existing **`eslint-plugin-jsx-a11y` + axe-core + Lighthouse CI** (Part 13.13). **TS types** exported; **semantic-versioning + ADRs** for Prasanth's handoff. **Token-only enforcement** (Stylelint/lint bans raw values — Parts 2/4/5/6/11). _Interlink: Part 13.13/13.14 + Prasanth handoff + token discipline across the system._

---

**Part 15 interlink verification ✅**

- _Backward:_ this part **realizes** the whole system — Part 1 (One-clear-action → single primary; Trust/Calm/Honest → doctor-backed framing, no dark patterns), Part 2 (state/semantic colors), Part 3 (type in components, tabular figures), Part 4 (padding/gap/containers/aspect/CLS), Part 5 (control/icon/avatar sizes + 44/48 targets), Part 6 (per-component radii: button-pill, input-12, card-16, modal-24, sheet-28), Part 7 (elevation L0–L4 per component), Part 8 (borders + focus ring + states + forced-colors), Part 9 (transitions + press 0.97 + skeleton + reduced-motion), Part 10 (icons + fill-active + icon+label), Part 11 (dialog/sheet/popover/toast + z-index), Part 12 (microcopy + errors + AI-word + medical-safety + i18n), Part 13 (a11y contract per component + testing), Part 14 (avatars + media cards + empty-state illustration + image perf). **No token redefined — all referenced.**
- _Forward:_ **System → Product layer** — signature flows (consult → diagnosis → route/book), edge-cases, multilingual screens, consent flows, validation, success metrics, and the implementation build in the Next.js + `packages/ui` monorepo.
- _Token/process discipline:_ shadcn+Radix in `packages/ui` · CVA variants · token-only (no magic numbers) · Storybook + visual-regression + per-component a11y checklist in CI · semver + ADRs for handoff.

_Part 15 research basis: ~60 sources this round (architecture: ShadiSbaih, GreatFrontend, ShadcnSpace, Vercel-Academy ×2, PkgPulse, TheFrontKit, DEV/whoffagents, JishuLabs; buttons/states: UXPin button-states + design-system-components, Mobbin, Figma, Carbon, DesignMonks, EightShapes, ICDS, UK-SIS; inputs/selection: UXPatterns, DesignSystems.surf, Setproduct, Carbon text-input + forms, GoodPractices, W3C-APG switch ×2, USWDS, Lollypop; navigation: UXPin, Eira-Medium, DesignStudio, UXDworld, UIUXdesigning iOS-tab-bar, UXPlanet, PhoneSim; overlays: Moon-DS, Setproduct, GitLab-Pajamas, Eleken-popover, LogRocket, UX-Collective, UXPin-modals, BetterLink, UK-SIS-toast; feedback: Onething, RedHat, Smart-Interface-Patterns ×2, perpendicularangel, Carbon-loading ×2, Polaris-spinner, UK-SIS-skeleton; conversational: Fuselab, UXPin-chat, BricxLabs, DesignStudio, AIUXDesign, Gapsy, Lovable) + prior corpus. Component system + contract + catalog locked; pixel-exact stories built in implementation._

# PART 16 — PATTERNS & TEMPLATES 🔒 LOCKED

_14 sub-parameters, each research-backed (~55 sources this round: patterns layer & systems — DesignSystems.one, UXPin best-DS, DesignSystems.surf, Adham-Dannaway, Backlight, ThemeSelection; templates/responsive — UXPin responsive×3, Influize, Sencha, Medium/H; forms — VentureHarbour, Involve, Eleken, AlfDesign, DesignStudio, IvyForms ×2, FormCreatorAI, UXPerience; search/filter/onboarding — UXPin search+filter, BricxLabs, Kroolo, DesignStudio-patterns, UserOnboard; feedback/error/optimistic — SitePoint useOptimistic, Gapsy ×2, Bootcamp/Matan, UXTigers, 2pointagency, Figr, Murtazaweb, NDLab, Pencil&Paper; auth/consent — Authgear, Medium/Radhika, LogRocket-2FA, DEV/AlanWest, MojoAuth, SecurityBoulevard; AI/2031 — UXPin-trends; **India dark-patterns law** — IAPP, BarAndBench, ProductGrowth, AZB ×2, Lumiverse, K&S, NeetiNiyaman, UnderstandUPSC). **This is the layer where Part 15 components compose into reusable solutions + page templates.** **Boundary:** Part 15 = individual components; Part 16 = how they combine into flows + scaffolds (the canonical answer per recurring problem). Full screen-by-screen specs → the System→Product layer._

**The governing idea.** Patterns are **the canonical, documented answer to a recurring problem** — composed from Part 15 components, governed by Parts 1–14. Buttons are commodity; **the differentiation lives in Datun's patterns** (the consult assessment, the diagnosis result, the directory + booking). Every pattern is mobile-first, token-only, accessible, **Honest (zero dark patterns — legally required in India)**, and **AI-consumable** so Claude builds screens on-brand from the first draft. Christopher Alexander's idea, updated: a pattern names a problem, then gives the proven solution — so we solve it once and reuse it everywhere.

### 16.1 Pattern philosophy & taxonomy `#149`

**Decision — three tiers:** **Components** (Part 15, the parts) → **Patterns** (reusable multi-component solutions: forms, search, onboarding, feedback, auth) → **Templates** (page scaffolds: list, detail, dashboard, form-page, conversational). A pattern is documented as **the canonical answer** (problem → solution → context → do/don't), not a buffet. **Build the product-specific patterns, not more buttons** (that's where differentiation lives). Patterns ship **AI-consumable** (W3C tokens, plain TSX, MDX docs) so human + Claude output stay on-brand. _Interlink: builds on Part 15 + Clarity + Prasanth/Claude handoff._

### 16.2 Page-layout templates & scaffolds `#150`

**Decision — face-aware (locked architecture), built on Part 4 primitives/grid/containers:** **App-face shell** = app-shell + bottom tab-bar (15.8) + contextual top app-bar + safe-area (Part 4 `env()`), single-column `app ~480–640` (Part 4.7). **Website-face shell** = marketing header/footer, `content ~1200`/`wide ~1440`, no tab-bar. **Template types:** list, detail, dashboard, **form-page**, content/article, **search-results**, **conversational/assessment** (16.12). All **responsive** (Stack/Cluster/Grid/Inset/Bleed + container queries — Part 4.8), content-driven breakpoints, anti-CLS (reserve space — Part 4.9). _Interlink: locked PWA two-face architecture + Part 4 (whole) + Part 14 (media in templates)._

### 16.3 Navigation & IA patterns `#151`

**Decision:** Clear IA (3–5 top destinations); **primary nav = bottom tab-bar (app-face)** / marketing header (website-face); **secondary** via top-bar actions, sheets, or in-page **Tabs** (15.11, distinct from tab-bar); **back/up** consistent (system-back friendly); **deep-linking** to every screen (PWA routes); **breadcrumbs** on the clinic desktop app; **tab-vs-stack** — tabs for parallel sections, stack for drill-down. Familiar patterns only (no nav innovation). _Interlink: 15.8 + locked architecture + Part 13 (keyboard/skip-link)._

### 16.4 Forms & data-entry patterns `#152`

**Decision:** **Single-column**, **essential-only** (data minimisation — Part 14.10/DPDP); **multi-step + progress** for 6+ fields (preserve every answer on back, **validate per step** — e.g. Zod schema per step, autosave long forms); **inline validation on blur** (not keystroke) + **specific corrective errors** (Part 12.8) + positive confirmation; **progressive disclosure** (defer non-essential, conditional fields); **persistent labels** (Part 12.7, never placeholder-as-label); **mark the minority** (required/optional); **review-before-submit** for high-stakes; **action-verb submit** ("Book appointment" — Part 12.7) with loading state (15.3); prefer an enabled submit with clear inline errors over an unexplained disabled button. _Interlink: 15.4/15.5/15.6 + Part 12.7/12.8 + Part 14.10 + Part 13.7._

### 16.5 Search, filter & sort patterns `#153`

**Decision (the directory / find-a-dentist):** **Search** (typeahead/autocomplete, scoped, plain-language) for known-item finding; **Filter/facets** (specialty, distance, availability, rating) for discovery — **progressive disclosure** (key filters first), **search-within** when >10–15 options, **active filters visible + easily removable**, **result counts**, **optimistic/instant** (sub-200ms INP — Part 9.11); **Sort** (relevance default + distance/rating) grouped with filters. **Zero-results** never dead-ends — suggest alternatives / broaden / clear (Part 14.12). Results = doctor/clinic cards (15.12) with a quick **Book** action. _Interlink: 15.6/15.11/15.12 + Part 12.3 + Part 14.12 + Part 9.11._

### 16.6 Data display & list patterns `#154`

**Decision:** **List/grid** (patient app) and **table** (clinic desktop, 15.11); **pagination** for finite/known sets, **infinite scroll + "Load more"** for exploratory feeds (with a visible end-state), **sticky sortable headers**, **bulk actions** (clinic). Always reserve row space (anti-CLS — Part 4.9); empty/loading per 16.9. _Interlink: 15.11 + Part 4.9 + 16.9._

### 16.7 Onboarding & first-run patterns `#155`

**Decision:** **Minimal first-run** — get to value fast (no long tours); **empty-state-as-onboarding** (Part 14.12: context → CTA → spot illustration), **progressive onboarding** (defer profile until investment grows — Part 16.4), **permission-priming** (16.11: explain _why_ before any OS prompt), **quick-win/activation** (first assessment), optional **data-seeding** (show the working state). _Interlink: Part 14.12 + 16.4/16.11 + Calm._

### 16.8 Feedback & notification patterns `#156`

**Decision — severity → component:** **toast** (transient/low-severity confirmation, above the tab-bar) · **banner** (persistent single important message) · **dialog** (blocking, must-acknowledge — sparingly) · **inline** (field/context errors) · **full-page** (core failure). **Optimistic UI + guaranteed Undo** for reversible actions ("Saved. Undo?" beats "Are you sure?") — but **fire a visible toast on rollback** (silent revert confuses); **confirm dialog only for irreversible/destructive** actions (delete account/data). **Result first, then details**; **close the loop** on completion; keep server actions idempotent for safe retry. _Interlink: 15.9/15.10 + Part 11 + Part 12.8 + Part 9._

### 16.9 Loading, empty & error-state patterns `#157`

**Decision — wait-time ladder:** <1s none · 1–10s **skeleton** (page/large) or **spinner** (small, "Reviewing…" never "AI") · >10s **progress bar** (determinate/honest) + background-state for long ops (15.10). **Empty states** (first-use / no-results / cleared / error) **never blank** → context + next step + spot illustration (Part 14.12). **Error states:** inline (Part 12.8) · toast (background/autosave) · full-page (404/500 — friendly + path back) · **offline** (PWA-aware: detect, calm message, offline-capable where possible, retry). Plain, blame-free, what+why+fix (Part 12.8), multilingual-aware (Part 12.16). _Interlink: 15.10 + Part 9.8 + Part 12.8/12.16 + Part 14.12 + PWA._

### 16.10 Authentication patterns `#158`

**Decision:** **Phone-number OTP, passwordless, as primary** (mobile-first, simplest for every Indian; Datun's own JWT + MSG91 SMS) — **step-by-step** (phone → OTP → minimal profile, progressive — 16.4); OTP input **segmented + WebOTP autofill + resend + show last-2-digits + enough time** (Part 13.7); secure tokens (httpOnly), specific errors, accessible; **offer at most 2–3 methods** (don't overwhelm); consistent brand. _2031-forward:_ add **passkeys** when device support is broad (phishing-resistant, biometric) with OTP fallback. _Interlink: Part 13.7 + 15.4/15.6 + 16.4 + own-JWT/MSG91 stack._

### 16.11 Consent & permission patterns — DPDP `#159`

**Decision:** **Just-in-time, contextual consent** with **permission-priming** — explain _why_ in plain language **before** the OS prompt (e.g. before camera: "To assess your tooth, Datun needs a clear photo"); **granular toggles** (never bundled), **never pre-ticked** (illegal under CCPA + DPDP), **purpose-specific** (telemedicine consent ≠ contacts/marketing), **revocable**, with **patient rights** (access / correct / **delete**); collect the **minimum** needed. _Interlink: Part 12.6 + Part 14.10 + Honest + 16.14._

### 16.12 Conversational / guided-assessment pattern (Datun signature) `#160`

**Decision — the core front door, mapped like a screen flow:** **intro → guided questions → diagnosis → next step (medicine-in-consult _or_ route to a verified clinic)**. UI: question/answer bubbles, **quick-reply chips** for structured answers + free-text where needed, **photo-upload** (intraoral, with consent — 16.11/Part 14.10), **voice input** (every-Indian/a11y), a **calm "Reviewing your answers…" indicator** (never "AI" — Part 12.4/12.11), **editable previous answers** (no restart), **capability transparency + honest scope** ("a doctor-backed assessment; a remote check can't fully replace an in-person exam" — Part 12.6), **graceful fallback** when input is unclear, and **calm-but-unambiguous emergency escalation**. _Interlink: 15.12 + Part 1 (Trust/Clarity/Honest) + Part 12.4/12.6/12.11 + Part 14.8/14.10._

### 16.13 Responsive & adaptive patterns `#161`

**Decision:** **Responsive (single PWA codebase)** — mobile-first, **content-driven breakpoints** (Part 4.6), **container-query** component reflow (Part 4.8), fluid type/media; **44/48 targets + WCAG 2.2 AA at every breakpoint** (Parts 5.3/13), test on **mid-range Android** (every-Indian). **Document responsive behavior per pattern/template** (not just static styles). _2031-forward:_ light **progressive-complexity / context-aware** adaptation (new patients see simpler flows; mobile streamlined vs desktop expanded) — **kept Honest** (no manipulative personalization). _Interlink: Part 4 + Part 5.3 + Part 13 + every-Indian._

### 16.14 Pattern governance & anti-patterns (zero dark patterns) `#162`

**Decision:** Patterns documented as **canonical answers** (problem/solution/context/do-don't), **AI-consumable** (governs human _and_ Claude output — Part 15.14), promoted from a composition to a pattern **when it recurs ~3×**; every pattern carries an **a11y check (Part 13.14) + an ethical-design (no-dark-pattern) check**. **Explicitly BANNED (legally, under India's CCPA 2023 Dark-Patterns Guidelines + DPDP, and by the Honest principle):** false urgency, basket sneaking, confirm shaming, forced action, subscription trap, interface interference, bait-and-switch, drip pricing, disguised ads, nagging, trick questions, SaaS billing, rogue malware — **plus pre-ticked consent, fake counts/timers, and hard-to-cancel** (cancellation must be as easy as signup). Maintain an **internal anti-pattern catalog + audit checklist** (CCPA self-audit readiness) and **ADRs** for handoff. _Interlink: Part 1 Honest + Part 12.5 + Part 15.14 + 16.11 + India CCPA/DPDP._

---

**Part 16 interlink verification ✅**

- _Backward:_ composes **Part 15** (every pattern is built from the component catalog) and is governed by Part 1 (Honest → zero dark patterns; One-clear-action → single primary; Trust/Calm), Part 4 (templates/grid/containers/primitives/breakpoints/CLS), Part 9 (motion/optimistic/loading), Part 11 (overlay severity mapping), Part 12 (microcopy/errors/AI-word/consent/i18n), Part 13 (a11y at every breakpoint + auth), Part 14 (empty-state illustration + media + consent). **No token or component redefined — all composed/referenced.**
- _Forward:_ the **System → Product layer** — full screen-by-screen specs (homepage, /consult, dashboard, doctor-profile, directory), signature end-to-end flows, multilingual screens, success metrics, and the build in the Next.js + `packages/ui` monorepo.
- _Token/process discipline:_ patterns are token-only compositions · documented canonically + AI-consumable · per-pattern a11y + no-dark-pattern checks · CCPA/DPDP audit-ready · ADRs for Prasanth.

_Part 16 research basis: ~55 sources this round (patterns/systems: DesignSystems.one, UXPin ×4, DesignSystems.surf, Adham-Dannaway, Backlight, ThemeSelection; forms: VentureHarbour, Involve, Eleken, AlfDesign, DesignStudio, IvyForms ×2, FormCreatorAI, UXPerience; search/filter/onboarding: UXPin search+filter, BricxLabs, Kroolo, DesignStudio, UserOnboard; feedback/error/optimistic: SitePoint, Gapsy ×2, Bootcamp/Matan, UXTigers, 2pointagency, Figr, Murtazaweb, NDLab, Pencil&Paper; auth/consent: Authgear, Radhika-Medium, LogRocket-2FA, DEV/AlanWest, MojoAuth, SecurityBoulevard; AI/2031: UXPin-trends; India dark-patterns law: IAPP, BarAndBench, ProductGrowth, AZB ×2, Lumiverse, K&S, NeetiNiyaman, UnderstandUPSC) + prior corpus. Patterns + templates + governance locked; screen-by-screen specs in the product layer._

# PART 17 — DESIGN TOKENS ARCHITECTURE & THEMING 🔒 LOCKED

_14 sub-parameters, each research-backed (~50 sources this round: 3-tier architecture & naming — UXPin, DigitalApplied, Netguru, Bootcamp/Romesh, design.dev, AlwaysTwisted, Wicar; DTCG & Style Dictionary — designtokens.org 2025.10 spec, DTCG announcement, StyleDictionary docs, TasteProfile, DesignZig, Penpot, DTCG GitHub; Tailwind v4 @theme — DigitalApplied, SeedFlip, OneMinuteBranding, Egnworks, MavikLabs, AdamArant; no-flash theming — next-themes/pacocoursey, BetterLink, GaisDev, MUI/DEV, NotANumber, PixeledCode; Figma sync & governance — JuanPosada/Flourish, Tokens Studio docs ×2, Boldare, Inhaq, Figma, Replay, figma-variables GH; AI-consumable & 2031 — Petri/AI-native, Indeed/Netflix MCP, Firecrawl, Codrops/Storybook-MCP, arXiv semantic-density, UXMagic, Iternal). **This part does NOT redefine any value — values live in their home parts (2–11). It consolidates and operationalizes the "token discipline" already in every part into one formal architecture, format, build, theming, and governance model.** **Boundary:** the spine that makes Parts 2–16 buildable, themeable, handoff-ready, and AI-generatable._

**The governing idea.** Tokens are **a methodology, not "just variables"** — a technology-agnostic record of every design decision, stored as structured data, with **one single source of truth** so design and code can never drift. As Jina Anne (who coined the term at Salesforce) frames it, design tokens are the named entities that store a design system's decisions. For Datun this layer does three jobs at once: it makes the system **themeable** (light/dark/high-contrast from one teal seed), **handoff-ready** (Prasanth inherits a graph, not guesswork), and **AI-generatable** (Claude builds on-brand screens from the first draft because the tokens _are_ its vocabulary).

### 17.1 Token philosophy & single source of truth `#163`

**Decision:** Every visual decision is a **token** (the "no magic numbers" law from 15.1, made enforceable); the **token graph in Git is the single source of truth** (independent of any design tool → future-proof); tokens are **machine-readable** so humans, Tailwind, and Claude all speak the same language. Tokens are treated as **data, not documentation**. _Interlink: 15.1/15.14 + 16.14 + Prasanth/Claude handoff._

### 17.2 Three-tier model `#164`

**Decision — the strict hierarchy (each layer references only the layer below):** **Primitive/reference** (raw, context-free: `teal-500`, `space-4`, `radius-md`) → **Semantic/system** (intent: `color/bg/brand`, `text/primary`, `border/focus`, `space/inset-md`; a mode simply re-points these) → **Component** (`button/bg/primary` → references _semantic_, **never** a primitive). The chain: `teal-500 → color/action → button/bg/primary`. **Components/patterns consume semantic tokens only; primitives are the palette, not consumed directly** (and are **hidden from AI generation** — 17.12). This consolidates the per-part token footers (Parts 2–11), which already declare this model. _Interlink: every Part 2–11 "token discipline" footer + 17.12._

### 17.3 Naming grammar `#165`

**Decision — one unified scheme `category / property / variant / state` (kebab/slash), functional not presentational:** e.g. `color/bg/brand/default`, `color/text/primary`, `space/inset/md`, `radius/button`, `shadow/lg`, `motion/duration/base`, `z/modal`. **Brand ≠ semantic** (a `brand` primitive is not a `semantic` role); **numeric primitives** (color 50–950, space 4–128). Stabilise primitives first, attach intent (semantics) second, scope to components last. This harmonizes the schemes already in Part 2 (`bg/brand/default`), Part 3 (`category/size/attribute`), Parts 4–8. _Interlink: Parts 2/3/4/5/6/7/8 naming footers._

### 17.4 Token types & coverage `#166`

**Decision — every part's output is a typed token group (DTCG `$type`):** `color` (Part 2) · `dimension` for space/size (Parts 4/5) · **`typography`** composite (Part 3) · `radius`/dimension (Part 6) · **`shadow`** composite + elevation pairs (Part 7) · `border`/`strokeStyle` (Part 8) · `opacity`/number (Part 11) · **`duration` + `cubicBezier`** for motion (Part 9) · `number` for z-index (Part 11) · `dimension` for aspect-ratio (Part 4) · `breakpoint` (Part 4). Composite types bundle multi-value decisions (a type style = family+size+line-height+weight+tracking in one token). _Interlink: Parts 2–11 (each contributes its token group)._

### 17.5 Format — W3C DTCG `#167`

**Decision:** Author tokens in the **W3C Design Tokens Community Group format (v2025.10, the first stable spec)** — JSON, `$value` / `$type` / `$description` / `$deprecated` / `$extensions`, composite types, `.tokens.json` files in **`packages/ui/tokens/`**. Vendor-neutral and portable (moves between Style Dictionary, Tokens Studio, Figma, Penpot without custom scripts) and **AI-readable** (Claude parses a token as one coherent unit). _Interlink: 17.6/17.11/17.12 + packages/ui (15.1)._

### 17.6 Build pipeline `#168`

**Decision:** **Style Dictionary (v4+, DTCG-native)** transforms the DTCG source → **CSS custom properties + the Tailwind v4 layer** (today, web-only) → and, when the **React Native app ships (Phase 2)**, the _same source_ fans out to RN/iOS/Android with zero re-authoring. **Web-only now means the Tailwind v4 `@theme` + CSS-vars layer is the runtime; DTCG is the upstream source-of-truth that makes Phase-2 native trivial.** **CI validates** every build: all aliases resolve (no broken references), contrast gate (Part 13.13), no raw values (17.14). _Interlink: 17.5/17.7 + Phase-2 RN (deferred) + Part 13.13._

### 17.7 Tailwind v4 integration `#169`

**Decision (Datun's exact stack):** **`@theme` block = static raw palette** (primitives); **`:root` + `[data-theme="dark"]` / `[data-theme="high-contrast"]` = semantic tokens** (theme-switchable), then **register the semantics in `@theme` referencing the CSS vars** so utilities like `bg-brand` resolve per theme. `--color-*: initial` to **own the palette** (drop Tailwind defaults). **Component tokens scoped to the component file but still reference semantic.** Values in **OKLCH** (Part 2); **shadcn/ui pairs natively** (its `:root`/`.dark` CSS-var model is exactly this). No JS config (`tailwind.config` retired in v4). _Interlink: Part 2 (OKLCH) + 15.1 (shadcn) + 17.2/17.8._

### 17.8 Theming model & modes `#170`

**Decision — one seed, three modes:** the **single TEAL seed** generates the entire system (Part 2); **modes = light (default) + dark + high-contrast**; switching a mode **re-points the semantic layer only** (components never change) — **dark = lighter elevated surfaces, never inverted/pure-black** (Parts 2/7), **high-contrast = AAA** via OS preference (Parts 2.13/13). **Multi-brand / white-label is a built-in future capability** (the architecture supports a `brand` context layer for the eventual "Zomato-of-healthcare" sub-brands — pharmacy, labs — without touching components). _Interlink: Part 2 (seed/surfaces) + Part 7 (dark elevation) + Part 13 (high-contrast) + long-term multi-vertical vision._

### 17.9 Context dimensions `#171`

**Decision — semantic tokens may vary by context, disciplined (don't over-explode):** **mode** (light/dark/high-contrast) · **density** (comfortable default / compact for clinic data tables — Parts 4/5) · **platform** (web now, RN later) · **accessibility** (reduced-motion, reduced-transparency, forced-colors — Parts 9/11/13). Each context re-points semantics; primitives stay constant. _Interlink: Parts 4/5 (density) + Parts 9/11/13 (a11y contexts) + 17.6 (platform)._

### 17.10 Theme switching mechanics — no-flash `#172`

**Decision:** `[data-theme]` on `<html>`; **default = system** (`prefers-color-scheme`); user override **persisted** (localStorage with safe try/catch get, synced across tabs); reflect System/Light/Dark in the toggle. **Prevent FOUC with a blocking inline `<head>` script that sets `data-theme` before first paint** (next-themes or an equivalent tiny script) — **carrying Datun's CSP nonce** (the app runs strict-dynamic CSP, so the inline theme script must be nonced); **`suppressHydrationWarning` on `<html>`**, and **delay rendering the theme-toggle UI until mounted** (hydration-safe). Update **`<meta name="theme-color">` + the `color-scheme` property** per theme (native browser UI + PWA address-bar polish). _Interlink: CSP-nonce (prior infra) + Part 9.1 (no-flash) + Part 13 + PWA._

### 17.11 Figma / design-tool sync `#173`

**Decision — Git stays the source of truth:** **now (solo Mayank + Claude)**, Claude authors/maintains the DTCG tokens directly in-repo (no Figma dependency; identity is being rebuilt in code/Claude Design). **When design scales (Prasanth + designers join),** add **Tokens Studio ↔ Git two-way sync** + **Figma Dev Mode + Code Connect** (Figma component → React 1:1), with a **GitHub Actions + Style Dictionary CI** so a token change ends as a reviewable PR. DTCG guarantees files move between tools without rewrite. _Interlink: 17.5/17.6 + Prasanth onboarding + Git source-of-truth._

### 17.12 AI-consumable / Claude-buildable `#174`

**Decision — the three-tier model _is_ the AI-reliability mechanism:** components reference **semantic tokens (the AI's vocabulary)**; **primitives are hidden from generation** (Claude must never emit a raw hex/px); **deterministic validation** (lint bans raw values — 17.14) stops the "most-likely-next-token" model from hardcoding `#1E3A8A`. Codify the vocabulary + constraints in **structured DTCG + an `AGENTS.md`/`CLAUDE.md` + always-on, path-scoped rules** so Claude generates Datun screens **on-brand, lean, and drift-free from the first draft** (and so the design system _governs_ AI output, not just humans — 15.14/16.14). Keep token/rule files lean (token-cost discipline). _2031-forward:_ generative rules (context → token overrides) + Storybook-MCP for verified component reuse, measuring hallucination as a metric — watch and adopt as it matures. _Interlink: 15.14 + 16.14 + 17.2/17.14 + Datun-is-Claude-built._

### 17.13 Governance, versioning & deprecation `#175`

**Decision:** Tokens are **data in Git** — every change is a **reviewable, traceable, reversible PR**; **semver** the token package; **`$deprecated` + alias-to-replacement** (never hard-delete a token — alias the old name to the new so nothing breaks); maintain a **changelog + ADRs** (for Prasanth). **CI gates:** lint (no raw values — 17.14), alias-resolution validation, **contrast gate** (Part 13.13), and **visual-regression** (Part 15.14) so a token edit can't silently break a screen. _Interlink: Part 13.13 + 15.14/16.14 + Prasanth handoff._

### 17.14 Token-discipline enforcement (the law) `#176`

**Decision — the rule that makes the whole system hold:** **no magic numbers, anywhere.** **Stylelint/ESLint ban raw hex, raw px, and raw z-index** in components, patterns, and screens; everything resolves to a token (primitive→semantic→component). **No page-level overrides** (variants only — 15.14). This single enforcement is what keeps Parts 2–16 from eroding at month 18 — the difference between a real, governed system and a pile of conventions. _Interlink: consolidates every "token discipline" footer (Parts 2–11) + 15.14 + 16.14._

---

**Part 17 interlink verification ✅**

- _Backward:_ this part **operationalizes** the token discipline declared in **every prior part** — Part 2 (color primitives/semantics + OKLCH + high-contrast), Part 3 (typography composite), Parts 4/5 (dimension + density), Part 6 (radius), Part 7 (shadow/elevation composite + dark surfaces), Part 8 (border/focus), Part 9 (motion duration/easing + no-flash), Part 11 (opacity/z-index + forced-colors), Part 13 (contrast gate + a11y contexts), Part 15.1/15.14 (shadcn + token-only + governance), Part 16.14 (no dark patterns + AI-consumable governance). **No value is redefined — every value stays in its home part; this part defines how they're structured, built, themed, switched, synced, and enforced.**
- _Forward:_ the **System → Product layer** (screens/flows consume only these tokens), the **Phase-2 React Native app** (same DTCG source → native outputs), and **Prasanth's onboarding** (inherits a governed token graph + AGENTS.md, not tribal knowledge).
- _Token/process discipline:_ DTCG single source in Git · 3-tier (primitive→semantic→component) · Style Dictionary → Tailwind v4 `@theme` + `:root`/`[data-theme]` CSS-vars · no-flash nonced theme script · lint bans raw values · `$deprecated` not delete · contrast + visual-regression CI gates.

_Part 17 research basis: ~50 sources this round (3-tier/naming: UXPin, DigitalApplied, Netguru, Bootcamp/Romesh, design.dev, AlwaysTwisted, Wicar; DTCG/Style-Dictionary: designtokens.org v2025.10, DTCG announce, StyleDictionary ×2, TasteProfile, DesignZig, Penpot, DTCG-GitHub; Tailwind v4: DigitalApplied, SeedFlip, OneMinuteBranding, Egnworks, MavikLabs, AdamArant; no-flash theming: next-themes, BetterLink, GaisDev, MUI-DEV, NotANumber, PixeledCode; Figma-sync/governance: JuanPosada, Tokens-Studio ×2, Boldare, Inhaq, Figma, Replay, figma-variables-GH; AI/2031: Petri AI-native, Indeed/Netflix-MCP, Firecrawl, Codrops Storybook-MCP, arXiv, UXMagic, Iternal) + prior corpus. Architecture + format + build + theming + governance locked; design-tool sync activated when designers join._

# PART 18 — BRAND & IDENTITY 🔒 LOCKED

_14 sub-parameters, each research-backed (~55 sources this round: brand-identity & logo systems — Onething, WeAndTheColor, FreeLogoServices, Inkbot ×2, Jukebox, WeAreTenet, MetaBrand; app icons — MobileAction, IconikAI ×4, AppIconKitchen ×2, SVGGenie, Imagcon, LogoFoundry; OG/social — FreeImages, MakerKit, Krumzi, og-image.org, OGPix, env.dev, OGMagic, OGImagen; PWA manifest/splash — MobileViewer, SimiCart, Samioda, Progressier, PureDevTools, IconikAI, LogoFoundry; brand guidelines/governance — EbaqDesign, BrandStrategyLab, LaTechPost, Kedraco, Prezent, Frontify, Akrivi; motion/India/2031 — ThreeRooms, Envato, Renderforest, Everything.design, Brandfinity, Illustration.app; the "Datun" name/heritage — Wikipedia/HandWiki teeth-cleaning-twig, Quora, HistoryRise, ResearchGate). **This part builds on locked Parts 2 (teal), 3 (Anek), 9 (motion), 12 (voice), 13 (a11y), 14 (imagery), 17 (theming) — it does NOT redefine them; it defines the brand-identity layer (logo, icons, favicon, OG, splash, manifest, co-branding, governance).** **Boundary:** the identity system; the actual vector execution of the mark happens in Claude Design as the immediate next build step._

**The governing idea.** A brand is not a single static logo — it is **a system of rules** (Audi: "the brand is not a static structure but a living interface"). As Jeff Bezos put it, _"your brand is what other people say about you when you're not in the room"_ — so for a Trust-first healthcare product, the identity's only job is to make Datun feel **warm, credible, and unmistakably Indian** at a single glance, from a billboard down to a 32px favicon. Everything here serves Part 1 (Trust + Calm) and Part 12 (warm, never "AI").

### 18.1 Brand strategy & personality `#177`

**Decision — personality derived from Part 1 + 12 (not invented):** Datun is the **warm, trusted, knowledgeable family dentist for India's teeth** — archetype = a blend of **Caregiver** (warmth, "Everyone deserves care") + **Sage** (credible, dentist-backed). Five expressed traits (mirror Part 12 voice): **Warm · Trustworthy · Calm · Clear · Respectful.** Identity must **feel** before copy explains (people see the brand before reading). **Endure** (resist trends, last 50 yrs) **+ Adapt** (light/dark/mono/print/digital/horizontal/vertical). _Interlink: Part 1.2/1.3 + Part 12.1 voice._

### 18.2 Logo system & type `#178`

**Decision — a Combination Mark, built as an adaptive logo SYSTEM (not one fixed asset):** a **symbol** + the **"Datun" wordmark**, usable together or separately (best for a startup needing both name-recall _and_ an icon for app/favicon/avatar). The system ships: **primary lockup** (symbol + wordmark, horizontal) · **stacked lockup** · **icon-only symbol** (app icon, favicon, avatar, social) · **responsive wordmark** (Anek's variable axes adjust weight/optical-size by size — Part 3) · **motion version** (18.13). Defined relationships and rules, not loose files. _Interlink: Part 3 (Anek variable) + 18.3/18.13 + responsive hierarchy (billboard → 32px)._

### 18.3 Logo concept & construction `#179`

**Decision — the mark direction (CTO/CDO call, to be executed in Claude Design):** an **abstract symbol fusing a neem leaf/twig with a tooth**, in **teal** (Part 2). Rationale, fully grounded: "Datun" _is_ the ancient Indian neem teeth-cleaning twig — so the mark literally encodes the name; the **leaf** says natural / healing / warm (not clinical steel), the **tooth** says dental, **teal** says trust + healing + clean enamel, and the whole reads as **uniquely Indian heritage no global competitor owns**. Construction: built on a simple geometric grid, **single continuous/organic curve** (calm, not sharp), **one-color-capable**, and **legible at 32px** (the squint test). Avoid literal twig-illustration or a generic toothbrush (commodity, clinical). _Interlink: Part 2 (teal/enamel rationale) + Part 1.3 Calm + Part 6 (rounded/organic) + the "Datun" heritage._

### 18.4 Clear-space, min-size & placement `#180`

**Decision:** **Clear-space** = a defined exclusion zone around the lockup (e.g. the height of the "D" / the symbol's width) kept clear of other elements; **min-size** — full lockup never below **~72px / 24mm** wide (below that, switch to the **icon-only** symbol); **placement** — top-left or centered in headers, consistent across surfaces; never crowd, rotate, or place on busy backgrounds without a scrim (Part 11/14). _Interlink: Part 4 spacing + Part 11 scrim + 18.2 responsive hierarchy._

### 18.5 Logo color variants & backgrounds `#181`

**Decision — four locked variants:** **(1) Full-color** (teal symbol + ink wordmark) on light · **(2) Reversed/knockout** (white) on teal or dark/photo · **(3) Monochrome ink** (single dark) for documents/print/fax · **(4) Monochrome white** for dark surfaces. All authored from Part 2 tokens (teal + neutrals); **maintain ≥ the contrast floor** on any background (Part 13.4 — scrim/floor-fade on photos). Never recolor the mark outside these. _Interlink: Part 2 (teal/neutrals) + Part 13 (contrast) + Part 14 (on-image treatment)._

### 18.6 Logo misuse / don'ts `#182`

**Decision — documented Don'ts (illustrated):** ❌ don't stretch/distort/rotate · ❌ don't recolor outside the four variants · ❌ don't add shadows/gradients/outlines · ❌ don't place on low-contrast or busy backgrounds without a scrim · ❌ don't rearrange or re-typeset the wordmark (Anek, locked) · ❌ don't crowd the clear-space · ❌ don't use the old/any other mark. _Interlink: Part 3 (wordmark type) + 18.4/18.5 + governance 18.14._

### 18.7 App icon `#183`

**Decision — full matrix from one 1024 master (symbol on a teal field, no transparency, ~10% margin, no baked corners — the OS masks):** **iOS** — 1024 master + the **iOS 18 trio**: standard (full-color), dark (deeper bg), **tinted** (monochrome layer iOS colorizes). **Android** — **adaptive** (foreground symbol + teal background layers, 108dp canvas, critical art inside the **~66–72dp safe zone**) + an **Android-13 monochrome themed layer**. **PWA** — **192 + 512 standard (`purpose:"any"`) + 192 + 512 maskable (separate files, `purpose:"maskable"`, content inside the central 80% / 10% padding, opaque bg)** — never combine as `"any maskable"`; each **< 100 KB** (every-Indian networks — Part 14.9). Must pass the squint test at 29px. _Interlink: Part 2 (teal) + Part 14.9 (lean) + 18.11 (manifest)._

### 18.8 Favicon `#184`

**Decision — modern minimal set:** an **SVG favicon** (scales perfectly, and **theme-aware** via an internal `prefers-color-scheme` `<style>`) + **`favicon.ico` (16/32) fallback** + **`apple-touch-icon` 180×180** + the PWA 192/512 (18.11). The favicon uses the **icon-only symbol**, simplified for 16px clarity. _Interlink: Part 17.10 (theme-aware) + 18.3 (symbol) + 18.11._

### 18.9 Splash / launch screen `#185`

**Decision:** A **calm branded launch screen** — centered Datun symbol on the warm off-white (or teal) field (Part 2), no spinner-clutter. **Android** auto-generates from `theme_color` + icon (don't over-rely on exact layout). **iOS** needs **`<link rel="apple-touch-startup-image">`** per-device images (generated set). Matches the app-shell `theme_color` so there's **no white flash** (Part 17.10). _Interlink: Part 2 (off-white/teal) + Part 17.10 (no-flash) + 18.11._

### 18.10 OG / social share images `#186`

**Decision:** **Brand default OG = 1200×630 (1.91:1)** — teal field, logo + "Everyone deserves care", warm; **never a transparent PNG over white text** (unreadable in dark-mode clients); key content inside the **center ~1080×600** safe zone. **Dynamic per-page OG** via **`next/og` `ImageResponse`** (Next.js 16 file conventions `opengraph-image.tsx` + `twitter-image.tsx`) — a branded template auto-filled per page (doctor name + verified badge for doctor profiles, article title for the patterns library). Meta: absolute HTTPS URL + `og:image:width/height` + `twitter:card=summary_large_image`; PNG/JPG < 1 MB. _Interlink: Part 14.9 + SEO/GEO infra + 18.12 + Next.js stack._

### 18.11 PWA manifest & install identity `#187`

**Decision — `manifest.webmanifest`:** `name:"Datun: everyone deserves care"`, `short_name:"Datun"`, `start_url`, `display:"standalone"`, **`background_color`** = warm off-white (Part 2 N0), **`theme_color`** = teal (matches app-shell, no white flash — Part 17.10), `description`, `lang`/`dir`, `categories:["medical","health"]`, `orientation:"portrait"`, icons (192/512 `any` + 192/512 `maskable`), and **`shortcuts`** (up to 4: "Ask Datun" → /consult, "Find a dentist" → directory). Validate zero errors in DevTools (else no install). _Interlink: Part 17.10 (theme-color/no-flash) + Part 16.9 (offline) + 18.7 (icons) + locked PWA architecture._

### 18.12 Brand color & type expression `#188`

**Decision — how the brand shows up (composed from locked tokens):** **Teal is the single owned brand color** (Part 2) — used for the mark, primary CTAs, and brand moments, **never as a wash behind body copy** (the "rule, not a value" discipline); warm off-white canvas + warm accent keep it human. **Anek is the brand type** (Part 3) — the wordmark and headlines; **numerals in the mono family** (Part 3). Brand photography = **real, warm, authentic Indian people** (Part 14), never sterile stock. _Interlink: Part 2 + Part 3 + Part 14._

### 18.13 Brand motion & sonic signature `#189`

**Decision — a motion identity, not a loud reveal:** a **gentle logo build** where the **motion comes from the mark** (the leaf/tooth curve draws or settles), **resolves quickly** (Part 9 springs, ~300–400ms), and whose **final frame is the clean static mark** (works paused/cropped/muted); used for the app-splash and subtle in-product moments. Principles mirror Datun's voice — **Helpful · Calm · purposeful** (never decorative). **Strictly honors `prefers-reduced-motion`, never animates behind text, and any loop stops** (Parts 9.1/9.5/13). _2031-forward:_ an optional **calm sonic signature** (short, warm) and **haptic** for voice/app-open as multisensory touchpoints grow (voice is core — Part 16.12) — opt-in, accessible, never autoplay-loud. _Interlink: Part 9 (motion/springs/reduced-motion) + Part 13 + Part 16.12 (voice) + Part 1 Calm._

### 18.14 Co-branding, sub-brands & brand governance `#190`

**Decision — one brand, governed as data:** **Co-branding** — clear partner-logo rules for **verified clinics** (a "Verified on Datun" lockup; clinic logo + Datun, balanced, clear-space respected). **Sub-brands / future verticals** — the architecture supports the long-term "Zomato-of-healthcare" expansion (pharmacy, labs) as **endorsed sub-brands** off the master, via the multi-brand token capability (Part 17.8) — same DNA, no fork. **Asset matrix** — every variation (full/stacked/icon-only/mono/reversed) in **SVG (digital primary) + PNG + the icon/OG/splash sets**, stored in **`packages/ui/brand/`** + `apps/web/public`, **each with usage instructions**, versioned in Git (Part 17.13). **AI-consumable brand** — this Part 18 + `AGENTS.md`/`CLAUDE.md` are Claude's brand guardrails so generated assets stay on-brand (avoid "AI slop"; human oversight — Part 17.12). **Trademark** — register the **stylized wordmark + symbol as a device mark** (the plain word "datun" is descriptive, so distinctiveness comes from the stylization + symbol + consistent use); ⚠️ validate with an IP lawyer. _Interlink: Part 17.8 (multi-brand) + 17.11–17.13 (Git/governance) + 17.12 (AI brand) + Part 1.2 (clinic verification/Trust)._

---

**Part 18 interlink verification ✅**

- _Backward:_ composes **Part 2** (teal = the one owned color → mark/icons/OG/theme_color), **Part 3** (Anek = wordmark/responsive logo type), **Part 9** (gentle motion → logo animation, reduced-motion), **Part 11/13** (scrim + contrast floor on logo backgrounds), **Part 12** (voice → brand personality, never "AI"), **Part 14** (real warm Indian imagery, lean files), **Part 17** (theming → theme_color/no-flash splash & favicon; multi-brand → sub-brands; Git/AGENTS.md → asset governance + AI-consumable brand). **No prior value redefined.**
- _Forward:_ the **immediate build step** is executing the mark + full asset matrix in Claude Design; then every screen in the **System → Product layer** carries this identity (header logo, app icon, OG per page, splash, manifest).
- _Launch-critical note:_ app-icon + maskable + favicon + manifest + splash + default OG are **required for the PWA install + social sharing at the ~15 Jul launch** — this part unblocks that.

_Part 18 research basis: ~55 sources this round (logo systems: Onething, WeAndTheColor, FreeLogoServices, Inkbot ×2, Jukebox, WeAreTenet, MetaBrand; app icons: MobileAction, IconikAI ×4, AppIconKitchen ×2, SVGGenie, Imagcon, LogoFoundry; OG: FreeImages, MakerKit, Krumzi, og-image.org, OGPix, env.dev, OGMagic, OGImagen; manifest/splash: MobileViewer, SimiCart, Samioda, Progressier, PureDevTools; guidelines/governance: EbaqDesign, BrandStrategyLab, LaTechPost, Kedraco, Prezent, Frontify, Akrivi; motion/India/2031: ThreeRooms, Envato, Renderforest, Everything.design, Brandfinity, Illustration.app; "Datun" heritage: Wikipedia/HandWiki, Quora, HistoryRise, ResearchGate) + prior corpus. Identity system locked; vector execution of the mark is the next build step in Claude Design._

# PART 19 — DATA VISUALIZATION 🔒 LOCKED

_14 sub-parameters, each research-backed (~53 sources this round: chart color — Julius, DataStoryCoach, RGBlind, ColorArchive, Color-Analysis, CleanChart ×2; chart-type & honest-charting — ThoughtSpot, SRAnalytics, ClariBI, GraphMake, Tufte/LinkedIn, Missouri-UDAIR, Datylon, ChartGen; data-viz a11y — TPGi/Vispero ×2, 216digital, UW-Madison, Greeden, AEL, UA, A11Y-Collective, 5of10, WellAlly; health-score/gauge/KPI/sparkline — EPCGroup, Omni, Domo, ChartExpo, FanRuan, CleanChart-health + gauge; React chart libs — LogRocket, Querio ×2, PkgPulse ×2, Chart.ts, MoodShareNow; design-system data-viz & motion & 2031 — Carbon ×3, IBM/Pentagram, Permatech; interaction/tooltip/mobile/dashboard — UXPin ×2, BounDev, Pencil&Paper, Material, Think.design). **This part builds on locked Parts 2 (color), 3 (numerals), 7 (elevation), 8 (gridlines/borders), 9 (motion), 12.13 (formatting), 13 (a11y), 15 (shadcn/data-display), 16 (filter/states), 17 (tokens) — it does NOT redefine them; it defines the data-visualization layer (the health-score, trend charts, patterns library, and clinic dashboards).** **Boundary:** the chart system; specific dashboards are assembled in the System → Product layer._

**The governing idea.** Edward Tufte's rule — _"Above all else, show the data."_ For a Datun patient, a chart's only job is to make a health number **instantly, honestly, and calmly understood** — never to decorate or impress. Every chart is comprehension-first (Part 1.1), **honest by default** (Part 1.6 — no truncated axes, no misleading scales; this is legally and ethically non-negotiable for medical data), accessible to the 8% with colour-vision deficiency and to screen-reader users (Part 13), and token-styled (Part 17) so it stays on-brand and themeable.

### 19.1 Data-viz principles `#191`

**Decision — five rules (inherit Part 1):** **(1) Show the data** (maximise the data-ink ratio — Tufte); **(2) Honest, never misleading** (Part 1.6); **(3) Comprehension over decoration** (if it needs a paragraph to read, it failed — Part 1.1); **(4) Calm** (composed colour, no alarming flashing — Part 1.3); **(5) Accessible to everyone** (colour-blind, screen-reader, mobile, low-end — Part 1.5/13). _Interlink: Part 1 (whole)._

### 19.2 Chart colour system `#192`

**Decision — three palette types, matched to data type, all from Part 2 + colour-blind-safe:** **Categorical** (distinct hues, **<8**, balanced warm+cool to avoid false "error" reads): teal (primary series) + a colour-blind-safe set harmonised to Datun (a blue, the warm clay/amber, a violet, a bluish-green — Okabe-Ito-informed), **never red+green adjacent**. **Sequential** = single-hue **teal ramp** light→dark (Part 2; lightness varies → CVD-safe). **Diverging** = **teal ↔ warm-clay through a neutral midpoint** (Datun's own two families — never red-green). **Status/threshold** uses the Part 2 semantics (success-145 / warning-75 / error-25 composed / info-245), always paired with a label/icon. **Dark mode** = Part 2 warm-dark surfaces (never pure black), higher-luminance marks, subtle gridlines. _Interlink: Part 2.2/2.6/2.13 + Part 13 (colour-never-alone)._

### 19.3 Chart-type selection `#193`

**Decision — pick by the question, not by taste:** **trend over time → line** (only for ordered/time data); **compare categories → bar** (sorted; magnitude by length); **part-to-whole → donut ≤5 slices** (centre holds a key metric; never pie >5, never 3D); **single value vs target → radial gauge / bullet** (19.8); **distribution → histogram**; **correlation → scatter**; **intensity/matrix → heatmap** (sparingly); **compare many groups → small multiples**; **trend-in-a-cell → sparkline** (19.9). **Banned:** pie >5 slices, 3D charts, dual-axis trickery, rainbow scales. _Interlink: Part 1.1 (Clarity) + 19.4._

### 19.4 Honest charting — non-misleading `#194`

**Decision (non-negotiable for medical data — Part 1.6 + the no-dark-pattern law 16.14):** **bar/column charts always start the Y-axis at zero** (truncating exaggerates and misleads — magnitude is read by length); **line charts may use a non-zero baseline only when clearly labelled** and appropriate; **annotate any scale change or non-zero baseline**; **no dual-axis deception**; use **normalised values** (% change, index=100) when comparing different magnitudes; always show units + context (missing context misleads in most cases). _Interlink: Part 1.6 Honest + 16.14 (CCPA/DPDP) + Trust._

### 19.5 Data-ink & minimal chrome `#195`

**Decision (Tufte + Part 1.1 + Part 7 flat-first + Part 8 whitespace>lines):** **no chartjunk** — no 3D, bevels, drop-shadows, gradients behind data, decorative icons, heavy borders, or dense gridlines. **Gridlines** = light hairline (Part 8), minimal, often removable; **remove the chart border + background fill**; every pixel is either data or essential structure (axis labels/title). _Interlink: Part 1.1 + Part 7 + Part 8._

### 19.6 Chart typography & numerals `#196`

**Decision (compose Part 3 + Part 12.13):** chart **title** = Title role, **axis/series labels** = Label/Caption (Part 3), all **Anek**; **values use tabular figures (`tnum`)** for alignment (Part 3/12.13); **en-IN formatting** (₹ Indian grouping, DD MMM YYYY, Western digits — Part 12.13) with sensible **abbreviation** on axes (e.g. `1.2k`, `2.5L`, `₹1.2Cr`) and full precision in tooltips. Minimum on-chart text contrast 4.5:1 (3:1 large — Part 13). _Interlink: Part 3 + Part 12.13 + Part 13._

### 19.7 Chart anatomy & layout `#197`

**Decision:** title (what + unit) · axes (labelled, light ticks) · **direct labelling preferred over a legend** when ≤5 series/slices (lighter cognitive load + a redundant non-colour cue — Part 13) · legend only when necessary (and it names the fill/pattern, not just colour) · **reference/target lines** (e.g. a "healthy" band) annotated · annotations on key points · spacing/padding from Part 4; tooltip styling from Part 7 (L3). _Interlink: Part 4 + Part 7 + Part 13 (direct labels)._

### 19.8 Health-score visualization (Datun signature) `#198`

**Decision — the signature metric:** a **radial ring / arc gauge** — a **large tabular-figure score in the centre** (Part 3) + a **colour-zoned arc** (Part 2 semantics: good/attention/urgent, composed) + an **always-present zone label** ("Good" / "Needs attention" / "See a dentist") so meaning **never rides on colour alone** (Part 13). Always labelled with what it measures; calm, reassuring, never alarming (Part 1.3). **Gauges show a single moment only — the score _over time_ is a line chart** (with an optional target band), never a gauge. Limit to the one hero score per view. _Interlink: Part 15.12 (signature) + Part 2 + Part 3 + Part 13 + Part 1.3._

### 19.9 KPI / stat cards & sparklines `#199`

**Decision:** a **stat card** = headline value (large, tabular) + **comparison** (vs previous / target, with a direction arrow + composed colour + label) + an optional **sparkline** (tiny inline trend) + an optional **plain-language note** ("slightly better than last month" — never the word "AI", Part 12.4). **Liquid/responsive** (Part 16.13 — 4-up desktop → 1-up mobile; sparkline simplifies on small screens). For the **clinic dashboard**, prefer **bullet charts** (value + target + bands, compact, comparable) over gauges for multi-metric rows. _Interlink: Part 15.11 (stat/card) + Part 3 + Part 16.13 + Part 12.4._

### 19.10 Data-viz accessibility `#200`

**Decision (extends Part 13 — and these are medical charts, so this is non-negotiable):** every chart ships **(a)** a concise **alt text / `aria-label`** (or summary for complex ones), **(b)** a **data-table fallback** (progressive enhancement: table + summary underneath, with proper headers) and an option to **view/download the data**, **(c)** **colour-never-alone** — direct labels + distinct **markers** (circle/square/triangle) + line styles (solid/dashed) + **patterns** for bars, **(d)** **non-text contrast ≥ 3:1** for marks (separate adjacent bars with whitespace; border pie/donut segments — Part 8), **(e)** **keyboard-navigable** SVG (`<svg role="img">` + `<title>` + focusable points with `aria-label` like "March: 82"), **(f)** **no flashing** (Part 9.1), **resize to 200%**, and **`prefers-reduced-motion`** respected (Part 9.5). Important data is **never hover-only** (also reachable by tap, label, or table). _Interlink: Part 13 (whole) + Part 8 + Part 9.1/9.5 + Part 13.2 (RPwD/IS-17802 legal)._

### 19.11 Interaction & tooltips `#201`

**Decision:** **tooltip** on hover (desktop) and **touch-and-hold → tooltip placed _above_ the point** (mobile, so the finger doesn't cover it); shows exact value + label; keyboard-focusable; styled as a Part 7 L3 popover, Part 15.9 rules, Part 12 voice — and **never the sole carrier of essential data** (Part 13). **Mobile-first** (Part 16.13): progressive depth (tap KPI → chart → underlying data), one hero number visible without scrolling, only mobile-appropriate chart types (no shrink-and-h-scroll). **Filter/sort** reuse the Part 16.5 patterns (optimistic, active-filters visible). Zoom/pan only where it genuinely helps. **Chart states** (loading = skeleton in the chart's shape, not a spinner; **empty** = context + how to get data, never blank; **error** = retry, blame-free; **insufficient-data** = an honest note) follow Part 16.9 + 14.12 + 12.8. _Interlink: Part 7 + Part 15.9 + Part 16.5/16.9 + Part 13._

### 19.12 Motion in charts `#202`

**Decision (compose Part 9):** a **gentle entrance** — bars grow from the baseline, lines draw in, arcs sweep — using Part 9 easing (**no bounce/overshoot**), brief and purposeful (guides the eye to the value, never decorative); stagger subtly for series. **Strictly animate only `transform`/`opacity`** (Part 9.11 performance), **respect `prefers-reduced-motion`** (render the final state instantly — Part 9.5), and **never flash** (Part 9.1). _Interlink: Part 9.1/9.5/9.11._

### 19.13 Chart library & implementation `#203`

**Decision — Recharts (v3) as the primary library:** it is **SVG-based** (accessible, scalable, token-styleable — unlike Canvas), **the shadcn/ui charts default** (Datun already owns shadcn — same copy-and-own model, zero new paradigm, Part 15.1), **React-first + TypeScript + SSR-friendly** (Next.js App Router — Datun's stack), and composable so every chart is **restyled to Datun tokens** (Part 17) and wrapped as a Datun chart component in **`packages/ui`**. The **signature health-score ring** and any bespoke mark are **hand-built SVG (or `visx` primitives)** as a custom token-styled, accessible component. **SVG only (no Canvas)** for accessibility + crispness; **lazy-load** chart-heavy routes (dashboards are off the critical homepage path — Part 14.9). The Datun **a11y layer (19.10)** is added on top regardless of library defaults. _Interlink: Part 15.1 (shadcn/packages-ui) + Part 17 (tokens) + Part 13 (a11y) + Part 14.9 (lean/lazy) + Next.js stack._

### 19.14 Dashboard composition & data-viz governance `#204`

**Decision:** dashboards are **actionable-first** — show the hero insight, reveal detail on demand (tooltips/drill-down), use **smart defaults** ("having the data doesn't mean showing all of it"), and **avoid the "rainbow salad"** (every colour must map to meaning). Layout = a **responsive KPI/stat-card grid** (Part 16.13) with **density per context** (comfortable for patients, compact for the clinic — Part 17.9). All chart values are **chart tokens** (palette, gridline, axis, tooltip) in the Part 17 system; honest-defaults (19.4) and the a11y layer (19.10) are **baked into the chart components**, not left to the author. _Interlink: Part 16.2/16.13 + Part 17 (tokens/density) + 19.4/19.10._

---

**Part 19 interlink verification ✅**

- _Backward:_ composes **Part 2** (palette → categorical/sequential/diverging + semantic status + dark surfaces), **Part 3** (Anek + tabular figures for scores/axes), **Part 7** (L3 tooltip elevation), **Part 8** (hairline gridlines, segment borders, whitespace-between-bars for 3:1), **Part 9** (gentle entrance, reduced-motion, no-flash, transform/opacity-only), **Part 12.4/12.13** (no-"AI" insight text, en-IN/₹/tabular formatting), **Part 13** (colour-never-alone, contrast, keyboard, data-table fallback, ARIA), **Part 15.1/15.9/15.11** (shadcn ownership, tooltip rules, stat-card), **Part 16.5/16.9/16.13** (filter, chart states, responsive), **Part 17** (chart tokens, density), **Part 14.9/14.12** (lean/lazy, empty-state). **No prior value redefined.**
- _Forward:_ the **health-score screen, dashboard, and patterns library** in the System → Product layer consume only these chart components + tokens.
- _Token/process discipline:_ chart palette/gridline/axis/tooltip are tokens (Part 17) · honest-defaults + a11y baked into components · SVG-only + Recharts + custom ring · lazy-loaded · per-chart a11y checklist (Part 13.14).

_Part 19 research basis: ~53 sources this round (chart colour: Julius, DataStoryCoach, RGBlind, ColorArchive, Color-Analysis, CleanChart ×2; type & honesty: ThoughtSpot, SRAnalytics, ClariBI, GraphMake, Tufte, Missouri, Datylon, ChartGen; a11y: TPGi/Vispero ×2, 216digital, UW-Madison, Greeden, AEL, UA, A11Y-Collective, 5of10, WellAlly; health-score/gauge/KPI/sparkline: EPCGroup, Omni, Domo, ChartExpo, FanRuan, CleanChart ×2; React libs: LogRocket, Querio ×2, PkgPulse ×2, Chart.ts, MoodShareNow; design-system/motion/2031: Carbon ×3, IBM/Pentagram, Permatech; interaction/mobile/dashboard: UXPin ×2, BounDev, Pencil&Paper, Material, Think.design) + prior corpus. Chart system + honest-defaults + a11y + library locked; specific dashboards assembled in the product layer._

# (+ System→Product layer: signature moments, flows, edge-cases, validation, metrics, multilingual, consent)
