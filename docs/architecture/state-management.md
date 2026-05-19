# State Management Architecture

> Status: **Active** • Owner: Frontend platform • Last reviewed: 2026-05-19

Datun's client-side state lives in three Zustand stores composed with a layered middleware stack. This document explains the architecture, the trade-offs, and the canonical patterns engineers should follow when adding to or refactoring this layer.

---

## TL;DR

- Three stores: **auth** (user identity), **consultation** (chat + intake + media + streaming), **UI** (preferences + toasts + modals + flags).
- The consultation store is **sliced** into 4 domain files; the other two are monolithic by design (small enough that splitting adds more cost than value).
- A shared **middleware stack** wraps every store: `logger → analytics → devtools → persist → (TTL + encryption + safe-storage)`.
- Per-store **hydration tracking** (`__hasHydrated` flag) gates rendering on persist completion — eliminates SSR mismatch flash.
- **Cross-tab auth sync** uses BroadcastChannel with a stale-message threshold and a session-flag loop guard.
- **DPDP at-rest encryption** (AES-GCM 256 + PBKDF2 210k) is applied to the consultation store only — auth + UI have no PII.

---

## The Three Stores

| Store        | File                           | Responsibility                                                   |
| ------------ | ------------------------------ | ---------------------------------------------------------------- |
| Auth         | `stores/auth.store.ts`         | Current user, loading flag, last sync timestamp                  |
| Consultation | `stores/consultation.store.ts` | Chat messages, intake draft, photos, streaming buffer, lifecycle |
| UI           | `stores/ui.store.ts`           | Sidebar, drawer, toasts, modal, feature flags, sort preferences  |

### Why three (not one, not seven)

**Not one giant store**: cross-cutting state changes (e.g., a chat message arriving) shouldn't ripple-render unrelated components (e.g., the sidebar). Three independent stores = three independent subscription scopes = less re-render churn.

**Not seven small stores**: cross-store coordination (e.g., logout) becomes a nightmare with many stores. The current count maps to the three orthogonal concerns (who am I, what am I doing, how is the UI laid out) and stays manageable.

### Why the consultation store has slices

The consultation store grew large (chat + intake + media + streaming = four distinct concerns). Splitting into slices keeps each file ~150 lines, allows independent unit-testing, and lets new features (e.g., the upcoming streaming feature in Task #65) layer on cleanly without touching unrelated code.

```
ConsultationStore =
    ConsultationCore       // lifecycle: start/resume/clear/setStatus/markSaved
  & MessagesSlice          // chat history
  & IntakeSlice            // form draft + language interlock
  & MediaSlice             // photo upload state machine
  & StreamingSlice         // real-time AI response buffer
  & WithHydration          // __hasHydrated flag
```

---

## Middleware Stack

Every store is wrapped in the same middleware order:

```
       outermost
          │
          ▼
   ┌─────────────┐
   │   logger    │  console (dev) + Sentry breadcrumb (always)
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  analytics  │  PostHog event (allowlisted actions only)
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │  devtools   │  Redux DevTools (dev only, gated by devtoolsEnabled)
   └──────┬──────┘
          │
          ▼
   ┌─────────────┐
   │   persist   │  rehydrate from storage on boot
   │             │  + withHydration helper sets __hasHydrated
   └──────┬──────┘
          │
          ▼
     storage stack (innermost → outermost):
          ┌─────────────────────┐
          │  createSafeStorage  │  iOS Safari quota safe, SSR safe
          └─────────────────────┘
                    ▲
          ┌─────────┴───────────┐
          │ createEncryptedStorage │  AES-GCM 256 + PBKDF2 210k
          └─────────────────────┘
                    ▲
          ┌─────────┴───────────┐
          │  createTTLStorage   │  expiry metadata in sibling key
          └─────────────────────┘
                    ▲
          ┌─────────┴───────────┐
          │ createJSONStorage   │  JSON serialize/deserialize
          └─────────────────────┘
```

### Why this order

- **logger outside devtools**: logger sees the final action label that devtools normalizes.
- **analytics inside logger**: logger captures EVERYTHING for debug; analytics filters to funnel events for privacy.
- **persist inside devtools**: hydration appears as a tracked action in the DevTools timeline.
- **encryption inside TTL**: TTL metadata is a numeric timestamp (no PII); leaving it outside encryption avoids paying decryption cost on every expiry check.
- **safe-storage innermost**: handles iOS Safari quota errors + SSR — every other layer assumes the base is "tolerant".

### Which layers apply to which store

| Layer                  | Auth | Consultation | UI  |
| ---------------------- | :--: | :----------: | :-: |
| logger                 |  ✅  |      ✅      | ✅  |
| analytics              |  ✅  |      ✅      | ✅  |
| devtools               |  ✅  |      ✅      | ✅  |
| persist + safe-storage |  ✅  |      ✅      | ✅  |
| **encryption**         |  ❌  |      ✅      | ❌  |
| **TTL**                |  ❌  |   ✅ (7d)    | ❌  |

Auth has no PII (tokens live in httpOnly cookies; the persisted user object is just `{id, email, name, role}`). UI has only preferences. Only the consultation store carries patient PII through the intake draft.

---

## Hydration Tracking

Persist middleware rehydrates state asynchronously when storage is async (encrypted storage is async due to `crypto.subtle`). Components rendering before rehydration completes will see default values — bad UX.

The `withHydration` helper (from `stores/middleware/with-hydration.middleware.ts`) augments `persist`'s `onRehydrateStorage` callback to flip a `__hasHydrated: boolean` flag on the state. Components gate on this flag.

### Reading the flag

```tsx
import { useAuthStore } from '@/stores';
import { useStoreHydration } from '@/hooks/use-store-hydration';

function ProfilePanel() {
  const hydrated = useStoreHydration(useAuthStore);
  const user = useAuthStore((s) => s.user);
  if (!hydrated) return <ProfileSkeleton />;
  if (!user) return <LoggedOut />;
  return <Profile user={user} />;
}
```

For multi-store gates, use `useAllStoresHydrated([store1, store2])`.

---

## Cross-Tab Auth Sync

Two tabs of Datun on the same browser should share auth state — if tab A logs out, tab B should immediately become logged out too.

This is implemented via `BroadcastChannel`. The primitives live in `stores/auth-broadcast.ts` (no store coupling for testability), and the high-level zero-arg listener `listenCrossTabAuth()` is re-exported from `stores/auth.store.ts` and called once in the app shell.

### Loop guard

When tab A broadcasts `login`, tab B receives, reloads, and during post-reload hydration calls `setUser` — without protection that would re-broadcast and tab A would also reload, ad infinitum.

The guard: tab B's listener sets a `sessionStorage` flag (`datun-cross-tab-reload`) BEFORE reloading. Post-reload, `setUser` sees the flag, clears it, and skips re-broadcast. Stale-message threshold (5 seconds) catches any other corner cases.

---

## DPDP At-Rest Encryption

The Indian DPDP Act requires PII to be stored encrypted at rest, including on the client. Our threat model:

- ✅ Casual inspection of localStorage in DevTools
- ✅ Third-party scripts on the same origin
- ✅ Browser extensions reading storage
- ✅ DPDP audit "data at rest is not plain text"

- ❌ XSS on the same origin (attacker can call decrypt themselves)
- ❌ Malicious browser extension with content-script access
- ❌ Stolen device with an open browser session

For truly confidential PII, the only correct pattern is to NOT persist client-side at all (use sessionStorage + server sync). The consultation store's `partialize` already excludes the riskiest fields (photos, streaming buffer); the intake draft is moderate-risk and goes through the encrypted storage layer.

The passphrase is currently session-scoped (a 32-byte random in `sessionStorage`). Phase 2+ will replace this with a backend-issued device key in an httpOnly cookie for true confidentiality.

---

## Selectors Pattern

Components should NEVER use the raw store hook directly with inline selectors except for action functions:

```tsx
// ❌ Avoid in non-trivial components — re-renders on ANY store change
const { user, isLoading, lastSyncedAt } = useAuthStore();

// ❌ Still bad — anonymous selector means no refactor safety
const user = useAuthStore((s) => s.user);

// ✅ Atomic, refactor-safe, optimal re-renders
import { useUser } from '@/stores';
const user = useUser();

// ✅ Multi-value: useShallow built in
const fields = useIntakeFields();
```

The 27 pre-built selectors are in `stores/selectors.ts`. Add new selectors there as new fields are introduced — never inline them in components.

---

## Reset / Logout

`resetAllStores()` (from `@/stores/reset`) clears auth + consultation + ephemeral UI but PRESERVES UX preferences (welcome banner dismissal, sort order). Called from `useLogout()` hook.

`hardResetAllStores()` wipes EVERYTHING including UX prefs. Use only for "Delete my account" flow.

Both functions are idempotent and safe to call from non-React code.

---

## Anti-Patterns to Avoid

1. **Don't put PII in the auth store** — keep it in the consultation store (which has encryption).
2. **Don't add a "global isLoading" flag** — each store has its own `isLoading` if it needs one; don't merge them.
3. **Don't reset stores from inside actions** — actions live in their own slice; cross-store coordination belongs in `stores/reset.ts`.
4. **Don't subscribe to the entire store** in components except for trivial leaf components.
5. **Don't bypass selectors** with `useStore((s) => s.deeply.nested.field)` — add a named selector to `stores/selectors.ts`.
6. **Don't persist transient state** — streaming buffer, upload progress, toasts — all in-memory only.
7. **Don't add encryption to non-PII stores** — it costs ~5-10ms hydration with no security upside.

---

## Adding a New Slice

When the consultation store needs a new domain (e.g., reactions, mentions, audio messages):

1. Create `stores/slices/<domain>.slice.ts` exporting an interface + a `StateCreator` factory.
2. Add the interface to `ConsultationStore`'s union in `stores/consultation.store.ts`.
3. Spread the slice creator into the initializer.
4. Add fields to `partialize` (or not, if in-memory only).
5. Add a migration step if the field is persisted: `version < N: state.newField = default`.
6. Add selectors to `stores/selectors.ts` for the new fields.
7. Bump version + ship.

Reference: `stores/slices/streaming.slice.ts` is a clean example.

---

## Adding a New Store

Default answer: **don't**. Add a slice to the consultation store, or a new domain (toasts/modals/flags pattern) to the UI store.

If you must add a new top-level store (e.g., "billing" — orthogonal to auth/consultation/UI):

1. Copy `stores/auth.store.ts` as the skeleton (full middleware stack + persist + hydration).
2. Decide which middleware layers apply (PII → encryption; stale risk → TTL).
3. Export from `stores/index.ts`.
4. Add selectors + reset coverage.
5. Write tests at parity with existing stores.
6. Write an ADR explaining why a new store was justified over adding to an existing one.

---

## Related Documents

- [ADR-0007 — Zustand Slice Pattern for Consultation Store](../adr/ADR-0007-zustand-slice-pattern.md)
- Phase 1, 2, 3 task PDFs in the Task #48 deliverable bundle.
