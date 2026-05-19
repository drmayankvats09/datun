// ═══════════════════════════════════════════════════════════════
// UI STORE TESTS — Interface state transitions
//
// Phase 3 extends original test suite with:
//   - __hasHydrated initial state
//   - Toasts: pushToast, dismissToast, dismissAllToasts
//   - Modal singleton: openModal replaces, closeModal idempotent
//   - Feature flags: setFeatureFlag, setFeatureFlags (bulk)
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../stores/ui.store';

beforeEach(() => {
  useUIStore.setState({
    sidebarCollapsed: false,
    lastVisitedRoute: null,
    historyDrawerOpen: false,
    welcomeBannerDismissed: false,
    consultationSortOrder: 'newest',
    toasts: [],
    activeModal: null,
    featureFlags: {},
    __hasHydrated: false,
  });
});

// ─── Original state — sidebar ────────────────────────────────

describe('UI Store — Sidebar', () => {
  it('toggleSidebar flips collapsed state', () => {
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it('setSidebarCollapsed sets exact value', () => {
    useUIStore.getState().setSidebarCollapsed(true);
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    useUIStore.getState().setSidebarCollapsed(false);
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });
});

// ─── Original state — route, drawer, banner, sort ────────────

describe('UI Store — Original state actions', () => {
  it('setLastVisitedRoute stores route', () => {
    useUIStore.getState().setLastVisitedRoute('/consult/abc');
    expect(useUIStore.getState().lastVisitedRoute).toBe('/consult/abc');
  });

  it('setHistoryDrawerOpen toggles drawer', () => {
    useUIStore.getState().setHistoryDrawerOpen(true);
    expect(useUIStore.getState().historyDrawerOpen).toBe(true);
    useUIStore.getState().setHistoryDrawerOpen(false);
    expect(useUIStore.getState().historyDrawerOpen).toBe(false);
  });

  it('dismissWelcomeBanner sets flag to true', () => {
    useUIStore.getState().dismissWelcomeBanner();
    expect(useUIStore.getState().welcomeBannerDismissed).toBe(true);
  });

  it('setConsultationSortOrder updates order', () => {
    useUIStore.getState().setConsultationSortOrder('oldest');
    expect(useUIStore.getState().consultationSortOrder).toBe('oldest');
    useUIStore.getState().setConsultationSortOrder('newest');
    expect(useUIStore.getState().consultationSortOrder).toBe('newest');
  });
});

// ─── Hydration ───────────────────────────────────────────────

describe('UI Store — Hydration mixin', () => {
  it('starts with __hasHydrated false', () => {
    expect(useUIStore.getState().__hasHydrated).toBe(false);
  });

  it('__setHasHydrated flips the flag', () => {
    useUIStore.getState().__setHasHydrated(true);
    expect(useUIStore.getState().__hasHydrated).toBe(true);
  });
});

// ─── Toasts (Phase 2 new) ────────────────────────────────────

describe('UI Store — Toasts', () => {
  it('pushToast appends to toasts with auto-generated ID + timestamp', () => {
    const id = useUIStore.getState().pushToast({
      variant: 'success',
      title: 'Saved',
      durationMs: 4000,
    });
    expect(typeof id).toBe('string');
    expect(id.startsWith('toast_')).toBe(true);
    const toasts = useUIStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]!.id).toBe(id);
    expect(toasts[0]!.variant).toBe('success');
    expect(toasts[0]!.title).toBe('Saved');
    expect(typeof toasts[0]!.createdAt).toBe('number');
  });

  it('pushToast generates unique IDs across rapid calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) {
      ids.add(
        useUIStore.getState().pushToast({
          variant: 'info',
          title: `t${i}`,
          durationMs: null,
        }),
      );
    }
    expect(ids.size).toBe(20);
  });

  it('dismissToast removes by ID; idempotent for unknown IDs', () => {
    const id1 = useUIStore.getState().pushToast({
      variant: 'info',
      title: 'a',
      durationMs: null,
    });
    const id2 = useUIStore.getState().pushToast({
      variant: 'info',
      title: 'b',
      durationMs: null,
    });
    useUIStore.getState().dismissToast(id1);
    expect(useUIStore.getState().toasts.map((t) => t.id)).toEqual([id2]);
    // Dismissing unknown ID is a no-op
    useUIStore.getState().dismissToast('does-not-exist');
    expect(useUIStore.getState().toasts.map((t) => t.id)).toEqual([id2]);
  });

  it('dismissAllToasts clears the stack', () => {
    useUIStore.getState().pushToast({ variant: 'info', title: 'a', durationMs: null });
    useUIStore.getState().pushToast({ variant: 'info', title: 'b', durationMs: null });
    useUIStore.getState().dismissAllToasts();
    expect(useUIStore.getState().toasts).toEqual([]);
  });

  it('dismissAllToasts is a no-op (no identity change) when already empty', () => {
    const before = useUIStore.getState().toasts;
    useUIStore.getState().dismissAllToasts();
    const after = useUIStore.getState().toasts;
    // Same reference — proves the no-op short-circuit kicks in.
    expect(after).toBe(before);
  });
});

// ─── Modal singleton (Phase 2 new) ───────────────────────────

describe('UI Store — Modal singleton', () => {
  it('openModal sets activeModal', () => {
    useUIStore.getState().openModal('logout-confirm');
    expect(useUIStore.getState().activeModal).toBe('logout-confirm');
  });

  it('openModal replaces any prior modal (single-active rule)', () => {
    useUIStore.getState().openModal('logout-confirm');
    useUIStore.getState().openModal('photo-upload');
    expect(useUIStore.getState().activeModal).toBe('photo-upload');
  });

  it('closeModal resets to null', () => {
    useUIStore.getState().openModal('logout-confirm');
    useUIStore.getState().closeModal();
    expect(useUIStore.getState().activeModal).toBeNull();
  });

  it('closeModal is a no-op when no modal is open', () => {
    expect(useUIStore.getState().activeModal).toBeNull();
    useUIStore.getState().closeModal();
    expect(useUIStore.getState().activeModal).toBeNull();
  });
});

// ─── Feature flags (Phase 2 new) ─────────────────────────────

describe('UI Store — Feature flags', () => {
  it('setFeatureFlag sets a single flag value', () => {
    useUIStore.getState().setFeatureFlag('ui.toasts-v2', true);
    expect(useUIStore.getState().featureFlags['ui.toasts-v2']).toBe(true);
  });

  it('setFeatureFlag preserves other flags', () => {
    useUIStore.getState().setFeatureFlag('a', true);
    useUIStore.getState().setFeatureFlag('b', false);
    useUIStore.getState().setFeatureFlag('c', true);
    expect(useUIStore.getState().featureFlags).toEqual({
      a: true,
      b: false,
      c: true,
    });
  });

  it('setFeatureFlags merges multiple flags atomically', () => {
    useUIStore.getState().setFeatureFlag('keepMe', true);
    useUIStore.getState().setFeatureFlags({ a: true, b: false });
    expect(useUIStore.getState().featureFlags).toEqual({
      keepMe: true,
      a: true,
      b: false,
    });
  });
});
