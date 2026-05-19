# ADR-0007: Zustand Slice Pattern for the Consultation Store

- Status: **Accepted**
- Date: 2026-05-19
- Deciders: Mayank Vats (Founder/CEO), CTO
- Supersedes: none
- Superseded by: none

---

## Context

The consultation store is the single most complex piece of client-side state in Datun. As of Phase 1, it owned five concerns crammed into a 167-line monolithic file:

1. **Lifecycle**: `activeConsultationId`, `status`, `hasUnsavedChanges`, `startConsultation`, `clearConsultation`, `markSaved`.
2. **Messages**: `messages` array, `addMessage`, `setMessages`, `clearMessages` — with dedup logic to handle network retries.
3. **Intake**: `intakeDraft` (PII), `language`, `updateIntakeDraft`, `setLanguage` — with the language-interlock invariant that `intakeDraft.language` must always equal the top-level `language`.
4. **Media** (planned for Task #57): photo upload state machine with `queued → uploading → uploaded → analyzed | failed` transitions, tracking R2 keys + progress + Claude Vision analysis results.
5. **Streaming** (planned for Task #65): real-time AI response buffering with `streamingMessageId`, `streamingContent`, `isStreaming`, `lastStreamError`.

Phase 2 needed to add the media and streaming concerns. Doing so in the monolith would have pushed the file to ~450 lines covering five orthogonal state machines — unreviewable in one sitting, brittle to refactor, and impossible to unit-test in isolation.

We needed a way to split the consultation store along its natural domain boundaries while preserving:

- The **flat public API** (`useConsultationStore().messages`, `useConsultationStore.getState().addMessage(...)`, etc.) — 12+ component callsites must keep working without changes.
- **Cross-slice state writes** — e.g., `addMessage` must flip `hasUnsavedChanges` (owned by the core slice) to `true`.
- The **full middleware stack** (logger + analytics + devtools + persist + TTL + encryption + safe-storage) must wrap the composed result.
- **Single-store semantics** — components shouldn't have to subscribe to four separate stores to render a consultation.

---

## Decision

Split the consultation store using **Zustand's official slices pattern**: each domain becomes a `StateCreator` that produces a slice of the unified store state, and the main store file flat-composes the slice creators into a single Zustand store.

### Concrete shape

```
stores/
  consultation.store.ts        ← composer + core slice + middleware stack
  slices/
    messages.slice.ts          ← MessagesSlice + createMessagesSlice
    intake.slice.ts            ← IntakeSlice + createIntakeSlice
    media.slice.ts             ← MediaSlice + createMediaSlice
    streaming.slice.ts         ← StreamingSlice + createStreamingSlice
```

The full store type is the **union of all slice interfaces**:

```ts
export type ConsultationStore = ConsultationCoreSlice &
  MessagesSlice &
  IntakeSlice &
  MediaSlice &
  StreamingSlice &
  WithHydration;
```

Each slice creator is typed against the full `ConsultationStore` (via `import type` to avoid runtime cycles) so it can cross-write fields owned by other slices when necessary (e.g., the messages slice flipping `hasUnsavedChanges` from the core slice).

The store initializer flat-spreads slice outputs:

```ts
(set, get, store) => ({
  ...createHydrationState<ConsultationStore>(set),
  ...createConsultationCoreSlice(set, get, store),
  ...createMessagesSlice(set, get, store),
  ...createIntakeSlice(set, get, store),
  ...createMediaSlice(set, get, store),
  ...createStreamingSlice(set, get, store),
});
```

The end result is a SINGLE Zustand store with the SAME public API as the v1 monolith — every component callsite continues to work without changes.

---

## Alternatives Considered

### 1. Separate top-level stores per domain

```ts
useMessagesStore.getState().addMessage(...)
useIntakeStore.getState().updateDraft(...)
useMediaStore.getState().enqueuePhoto(...)
```

**Rejected because:**

- Cross-domain coordination (`startConsultation` must wipe messages + reset streaming) requires explicit multi-store updates in every callsite — error-prone.
- The `hasUnsavedChanges` invariant (true if ANY of messages/intake has pending changes) becomes a derived selector across stores — fragile.
- Component callsites would all break — 12+ files would need to change to read from multiple stores. The Phase 2 backward-compatibility goal is hard to meet.
- Cross-tab broadcast + hydration tracking would need to be implemented per-store, with synchronization between them.

### 2. Jotai atoms

Atom-per-field gives you maximally-fine-grained reactivity, and Jotai's `atomFamily` would model the photos map elegantly.

**Rejected because:**

- Migration cost: every existing component uses `useConsultationStore` directly. Switching to atoms means rewriting 12+ files PLUS the auth and UI stores for consistency.
- Devtools story is weaker than Zustand's first-class Redux DevTools integration.
- Sentry breadcrumb middleware would need to be reimplemented for Jotai semantics.
- Persist + hydration story is more complex with atoms — Jotai's `atomWithStorage` doesn't compose with our encryption + TTL stack cleanly.
- The Datun engineering team is small (one full-time CTO right now). Sticking with Zustand keeps the cognitive overhead low.

### 3. Redux Toolkit + RTK Query

Mature, well-documented, excellent devtools.

**Rejected because:**

- Boilerplate cost — slices + reducers + thunks add ~3x the lines of code vs Zustand.
- TanStack Query already handles server-state caching in Datun (Task #47). RTK Query would duplicate that.
- Performance: Redux requires careful `reselect` memoization for derived state; Zustand's atomic subscriptions get this for free.
- No new value over what Zustand slices give us, at significantly higher complexity.

### 4. XState for the lifecycle / streaming state machines

A formal state machine library would catch invalid transitions at the type level.

**Rejected because:**

- Heavy dependency (~50KB gzipped) for what is essentially four transitions in the consultation lifecycle and a similar number in the photo / streaming flows.
- Type-level transition guards in the slice creators (e.g., `media.slice.ts`'s `ALLOWED_TRANSITIONS` table) give us 80% of the safety at 0 additional dependency cost.
- Can revisit this if state machines proliferate beyond ~5 distinct flows.

### 5. Keep the monolith, add inline section headers

The simplest "do nothing" option.

**Rejected because:**

- The unit-testing story is poor — every test setup has to instantiate the full store with all five concerns active.
- Onboarding cost grows linearly with file size. 167 lines was manageable; 450+ lines would not be.
- Future features (audio messages, reactions, mentions) would keep growing the file.

---

## Consequences

### Positive

- **Reviewability**: each slice file is ~120-200 lines covering one concern. PRs touching one domain only touch one slice.
- **Testability**: Phase 3 ships isolated tests for each slice's state machine + edge cases (see `__tests__/stores/consultation.store.test.ts`).
- **Type-driven safety**: cross-slice writes are typed against the full `ConsultationStore`, so TypeScript catches typos in field names at compile time.
- **Backward compatibility**: 12+ component callsites continue to work without changes. Zero migration cost for the rest of the codebase.
- **Forward-proof for Task #57 (photo upload) and Task #65 (streaming)** — both already have their slice scaffolding in place; the feature tasks are now purely UI + network work.
- **Slice files are reusable** — if we ever build a "preview consultation" mode, we can reuse the same slice creators in a different store composition.

### Negative / Cost

- **Slight type complexity**: slice creators need explicit mutator tuple annotations (`StateCreator<ConsultationStore, [['zustand/devtools', never], ['zustand/persist', unknown]], [], SliceType>`) for the 3-arg `set(partial, replace, action)` form to typecheck. Mitigated by JSDoc and a worked example in every slice file.
- **Type-only import cycle**: slices import `ConsultationStore` type from `consultation.store.ts`, which imports them. Resolved via `import type` (erased at compile time) — no runtime cycle — but worth documenting for new contributors.
- **More files to navigate**: jumping from a slice file to the composed store + back can be jarring. Mitigated by VS Code's "Go to Definition".

### Neutral

- **Performance**: identical to the monolith. Slice composition is a compile-time concern; the runtime store is one Zustand store, same subscription semantics, same re-render characteristics.
- **Bundle size**: identical — slices are tree-shaken in the same way as inline functions would be.

---

## When to Re-Open This Decision

Re-evaluate the slice pattern if any of the following occur:

1. **A slice grows past ~250 lines** — split it further (e.g., `media.upload.slice.ts` + `media.analysis.slice.ts`) or extract to a child store.
2. **Cross-slice coordination becomes routine** — if `addMessage` starts needing to write to 4 other slices on every call, the concerns probably aren't actually orthogonal and a different decomposition is warranted.
3. **TypeScript inference breaks at scale** — if adding the 8th slice causes `tsc` to fail with "type instantiation too deep", we'll need to split the composed store type or use a different state library.
4. **A second store needs slicing** — if the UI store ends up with 4+ concerns, formalize the slice pattern as a reusable utility instead of repeating the boilerplate.

---

## References

- [Zustand official slices pattern](https://zustand.docs.pmnd.rs/guides/slices-pattern)
- TkDodo, "Working with Zustand" (2023): selectors + useShallow patterns
- Linear engineering blog (2024): splitting large Zustand stores
- ADR-0006 — Media Storage Architecture (informs the media slice's R2 integration)
