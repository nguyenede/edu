import { create } from 'zustand';

interface SidebarState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  initialize: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  sidebarCollapsed: false,
  initialize: () => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sidebar_collapsed');
        if (saved !== null) {
          set({ sidebarCollapsed: saved === 'true' });
        } else if (window.innerWidth < 768) {
          set({ sidebarCollapsed: true });
        }
      } catch (e) {}
    }
  },
  setSidebarCollapsed: (collapsed: boolean) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('sidebar_collapsed', String(collapsed));
      } catch (e) {}
    }
    set({ sidebarCollapsed: collapsed });
  },
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('sidebar_collapsed', String(next));
        } catch (e) {}
      }
      return { sidebarCollapsed: next };
    }),
}));
