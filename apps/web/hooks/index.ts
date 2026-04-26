// ═══════════════════════════════════════════════════════════════
// HOOKS — Centralized re-export. Import from '@/hooks' everywhere.
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
export { useFormatter } from './use-formatter';
