// ═══════════════════════════════════════════════════════════════
// UI STORE TESTS — Interface preference state transitions
// ═══════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../../stores/ui.store';

describe('UI Store', () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarCollapsed: false,
      lastVisitedRoute: null,
      historyDrawerOpen: false,
      welcomeBannerDismissed: false,
      consultationSortOrder: 'newest',
    });
  });

  // ── Sidebar ──

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

  // ── Route Tracking ──

  it('setLastVisitedRoute stores route', () => {
    useUIStore.getState().setLastVisitedRoute('/consult/abc');
    expect(useUIStore.getState().lastVisitedRoute).toBe('/consult/abc');
  });

  // ── History Drawer ──

  it('setHistoryDrawerOpen toggles drawer', () => {
    useUIStore.getState().setHistoryDrawerOpen(true);
    expect(useUIStore.getState().historyDrawerOpen).toBe(true);
    useUIStore.getState().setHistoryDrawerOpen(false);
    expect(useUIStore.getState().historyDrawerOpen).toBe(false);
  });

  // ── Welcome Banner ──

  it('dismissWelcomeBanner sets to true permanently', () => {
    useUIStore.getState().dismissWelcomeBanner();
    expect(useUIStore.getState().welcomeBannerDismissed).toBe(true);
  });

  // ── Sort Order ──

  it('setConsultationSortOrder changes order', () => {
    useUIStore.getState().setConsultationSortOrder('oldest');
    expect(useUIStore.getState().consultationSortOrder).toBe('oldest');
    useUIStore.getState().setConsultationSortOrder('newest');
    expect(useUIStore.getState().consultationSortOrder).toBe('newest');
  });

  // ── Initial Defaults ──

  it('starts with correct defaults', () => {
    const state = useUIStore.getState();
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.lastVisitedRoute).toBeNull();
    expect(state.historyDrawerOpen).toBe(false);
    expect(state.welcomeBannerDismissed).toBe(false);
    expect(state.consultationSortOrder).toBe('newest');
  });
});
