// ═══════════════════════════════════════════════════════════════
// UI STORE — Interface preferences that survive reload
// NOTE: Theme handled by next-themes (not here).
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { createSafeStorage } from '@/lib/storage';

interface UIState {
  sidebarCollapsed: boolean;
  lastVisitedRoute: string | null;
  historyDrawerOpen: boolean;
  welcomeBannerDismissed: boolean;
  consultationSortOrder: 'newest' | 'oldest';

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLastVisitedRoute: (route: string) => void;
  setHistoryDrawerOpen: (open: boolean) => void;
  dismissWelcomeBanner: () => void;
  setConsultationSortOrder: (order: UIState['consultationSortOrder']) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarCollapsed: false,
        lastVisitedRoute: null,
        historyDrawerOpen: false,
        welcomeBannerDismissed: false,
        consultationSortOrder: 'newest',

        toggleSidebar: () =>
          set(
            (state) => ({ sidebarCollapsed: !state.sidebarCollapsed }),
            false,
            'ui/toggleSidebar',
          ),

        setSidebarCollapsed: (collapsed) =>
          set({ sidebarCollapsed: collapsed }, false, 'ui/setSidebarCollapsed'),

        setLastVisitedRoute: (route) =>
          set({ lastVisitedRoute: route }, false, 'ui/setLastVisitedRoute'),

        setHistoryDrawerOpen: (open) =>
          set({ historyDrawerOpen: open }, false, 'ui/setHistoryDrawer'),

        dismissWelcomeBanner: () =>
          set({ welcomeBannerDismissed: true }, false, 'ui/dismissBanner'),

        setConsultationSortOrder: (order) =>
          set({ consultationSortOrder: order }, false, 'ui/setSortOrder'),
      }),
      {
        name: 'datun-ui',
        version: 1,
        storage: createJSONStorage(() => createSafeStorage()),
        partialize: (state) => ({
          sidebarCollapsed: state.sidebarCollapsed,
          lastVisitedRoute: state.lastVisitedRoute,
          welcomeBannerDismissed: state.welcomeBannerDismissed,
          consultationSortOrder: state.consultationSortOrder,
        }),
        migrate: (persisted, version) => {
          // Future versions add migrations here
          if (version === 0) {
            return {
              ...(persisted as Record<string, unknown>),
              consultationSortOrder: 'newest',
            };
          }
          return persisted as Record<string, unknown>;
        },
      },
    ),
    { name: 'UIStore', enabled: process.env.NODE_ENV === 'development' },
  ),
);
