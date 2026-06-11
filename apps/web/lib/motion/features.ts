// apps/web/lib/motion/features.ts
// ═══════════════════════════════════════════════════════════════
// MOTION FEATURE BUNDLE — async entry point (Task #53.5 W2, CUT-3)
//
// The ONLY file in apps/web allowed to import a Framer Motion
// feature bundle (enforced by `no-restricted-imports` in
// eslint.config.js — every other file gets a lint error).
//
// Why this file exists:
//   Task #50 mounted <LazyMotion features={domAnimation}> with a
//   STATIC import, which kept the entire animation engine inside
//   the shared client chunk of EVERY page — `motion-dom` (101.10KB
//   stat) + framer-motion glue (45.28KB stat) were the largest
//   named vendor blocks in the Task #53 treemap after the Next.js
//   framework itself. LazyMotion equally accepts a
//   `() => Promise<FeatureBundle>`; pointing it at THIS module via
//   dynamic import makes the bundler emit the engine as a separate
//   async chunk that downloads after hydration. `m.*` components
//   render their first frame as static markup and animate the
//   moment features land — for Datun's animation vocabulary
//   (fades, reveals, press feedback, counters) the swap is
//   visually free.
//
// Why `domMax` and not `domAnimation`:
//   domAnimation = animations, variants, exit, gestures,
//   whileInView. domMax = all of that PLUS layout-projection
//   animations (`layout`, `layoutId`) and drag.
//
//   `components/motion/layout-morph.tsx` is built on `layoutId` —
//   layout projection — which domAnimation does NOT include. Under
//   Task #50's static domAnimation, <LayoutMorph> silently rendered
//   with NO morph animation (Framer no-ops missing features): a
//   latent design-system bug. Since the feature bundle is now an
//   ASYNC chunk, upgrading to domMax costs the sync bundle ZERO
//   bytes (~+15KB stat in the deferred chunk only) and makes the
//   LayoutMorph contract real — important before Task #55/56 (the
//   consultation chat UI) starts composing these primitives.
//
// Maintenance contract:
//   - Need to slim the deferred chunk and nobody uses layout/drag
//     anymore? Change ONE word below (domMax → domAnimation).
//   - Never import this file statically for its value; LazyMotion
//     consumes it via `loadMotionFeatures` in
//     components/motion/motion-config-provider.tsx.
// ═══════════════════════════════════════════════════════════════

export { domMax as default } from 'framer-motion';
