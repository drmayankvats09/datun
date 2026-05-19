// ═══════════════════════════════════════════════════════════════
// STORE MIDDLEWARE — Barrel exports + canonical composition guide
//
// Public API for all custom Zustand middlewares used by Datun stores.
//
// ───────────────────────────────────────────────────────────────
// RECOMMENDED MIDDLEWARE ORDER (outermost → innermost)
// ───────────────────────────────────────────────────────────────
//
// ```ts
// import { create } from 'zustand';
// import { devtools, persist, createJSONStorage } from 'zustand/middleware';
// import { createSafeStorage } from '@/lib/storage';
// import {
//   logger,
//   analytics,
//   withHydration,
//   createHydrationState,
//   createTTLStorage,
//   createEncryptedStorage,
//   getSessionPassphrase,
// } from './middleware';
// import { devtoolsEnabled, devtoolsName } from './devtools-config';
//
// export const useMyStore = create<MyState>()(
//   logger(                                     // 1. OUTERMOST — sees every action
//     analytics(                                // 2. funnel-event capture (filtered)
//       devtools(                               // 3. Redux DevTools (dev only)
//         persist(                              // 4. localStorage rehydration
//           (set, get) => ({
//             ...createHydrationState<MyState>(set), // 5. hydration flag wiring
//             // ... your state and actions
//           }),
//           withHydration({                     // 6. augments persist's onRehydrate
//             name: 'datun-my-store',
//             storage: createJSONStorage(() =>
//               createTTLStorage(               // 7. expiry layer (outer)
//                 createEncryptedStorage(       // 8. encryption layer (inner)
//                   createSafeStorage(),        // 9. INNERMOST — actual localStorage
//                   {
//                     passphrase: getSessionPassphrase(),
//                     namespace: 'datun-my-store',
//                   },
//                 ),
//                 { ttlMs: 24 * 60 * 60 * 1000 },
//               ),
//             ),
//           }),
//         ),
//         { name: devtoolsName('MyDomain'), enabled: devtoolsEnabled },
//       ),
//       {
//         storeName: 'mystore',
//         events: { 'mystore/someAction': 'some_event_name' },
//       },
//     ),
//     { name: 'MyStore' },
//   ),
// );
// ```
//
// ───────────────────────────────────────────────────────────────
// WHY THE ORDER MATTERS
// ───────────────────────────────────────────────────────────────
//
// - logger OUTSIDE devtools → logger sees the final action label that
//   devtools normalizes; otherwise logger would see raw set() args.
//
// - analytics INSIDE logger → logger captures EVERY action (debug
//   value); analytics only fires for allowlisted events (privacy).
//
// - persist INSIDE devtools → devtools shows hydration AS an action,
//   making the rehydration timing visible in the DevTools timeline.
//
// - encrypted-storage INSIDE TTL → the TTL metadata (just a numeric
//   timestamp, no PII) sits OUTSIDE encryption. Reading expiry doesn't
//   require decryption, so cleanup is fast and cheap.
//
// - createSafeStorage INNERMOST → handles iOS Safari quota errors
//   and disabled-localStorage gracefully. Every other layer assumes
//   the base storage is "tolerant".
//
// ───────────────────────────────────────────────────────────────
// WHEN TO OMIT A LAYER
// ───────────────────────────────────────────────────────────────
//
// UI store (no PII):       skip encrypted-storage, skip TTL.
// Auth store (token-free): skip encrypted-storage (tokens live in
//                          httpOnly cookies, not Zustand state).
// Consultation store:      use ALL layers — has PII and stale-risk.
// ═══════════════════════════════════════════════════════════════

// ─── Logger ───────────────────────────────────────────────────
export { logger } from './logger.middleware';
export type { LoggerOptions } from './logger.middleware';

// ─── Analytics ────────────────────────────────────────────────
export { analytics } from './analytics.middleware';
export type { AnalyticsOptions } from './analytics.middleware';

// ─── Hydration tracking ───────────────────────────────────────
export { withHydration, createHydrationState } from './with-hydration.middleware';

// ─── TTL storage ──────────────────────────────────────────────
export { createTTLStorage } from './ttl-storage.middleware';
export type { TTLStorageOptions } from './ttl-storage.middleware';

// ─── Encrypted storage ────────────────────────────────────────
export { createEncryptedStorage, getSessionPassphrase } from './encrypted-storage.middleware';
export type { EncryptedStorageOptions } from './encrypted-storage.middleware';
