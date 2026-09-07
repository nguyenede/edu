import { create } from 'zustand';

interface SidebarState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  sidebarCollapsed: true,
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
