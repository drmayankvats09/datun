// apps/web/hooks/index.ts
// ═══════════════════════════════════════════════════════════════
// HOOKS — Centralized re-export. Import from '@/hooks' everywhere.
//
// PHASE 2 (Task #47) UPDATE — ADDITIVE ONLY:
//   Added 2 wildcard re-exports at the bottom for the new
//   ./queries and ./mutations sub-folders. No existing exports
//   removed or renamed. Zero risk to running app.
//
// TASK #50 UPDATE — ADDITIVE ONLY:
//   Added 2 new hook exports for the motion design system:
//     - useMotionLevel    (composite reduced-motion + network)
//     - usePressFeedback  (programmatic press animation controls)
//   No existing exports removed or renamed.
// ═══════════════════════════════════════════════════════════════

// ── Task #34 — State Persistence ──
export { useHydration } from './use-hydration';
export { useAuthSync } from './use-auth-sync';
export { useRouteTracker } from './use-route-tracker';
export { useOnlineStatus, useNetworkEffect } from './use-online-status';
export { useBeforeunloadSave } from './use-beforeunload-save';

// ── Task #35 — Responsive System ──
export { useBreakpoint } from './use-breakpoint';
export { useViewportSize } from './use-viewport-size';
export { useOrientation } from './use-orientation';
export { useReducedMotion } from './use-reduced-motion';
export { useNetworkQuality } from './use-network-quality';
export { useKeyboardVisible } from './use-keyboard-visible';
export { useWebVitals } from './use-web-vitals';
export { useDatunFormatter } from './use-datun-formatter';

// ── Task #46 — Media upload + progressive image loading ──
export { useMediaUpload } from './use-media-upload';
export type { UseMediaUploadState, UploadStage, UploadError } from './use-media-upload';
export { useProgressiveImageLoad } from './use-progressive-image-load';

// ── Task #47 — TanStack Query hooks ──
export * from './queries';
export * from './mutations';

// ── Task #50 — Motion design system ──
export { useMotionLevel } from './use-motion-level';
export type { UseMotionLevelResult } from './use-motion-level';
export { usePressFeedback } from './use-press-feedback';
export type { UsePressFeedbackOptions, UsePressFeedbackResult } from './use-press-feedback';
