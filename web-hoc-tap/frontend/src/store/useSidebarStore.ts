import { create } from 'zustand';

interface SidebarState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

const getInitialSidebarCollapsed = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved !== null) return saved === 'true';
    return window.innerWidth < 768;
  } catch {
    return false;
  }
};

export const useSidebarStore = create<SidebarState>((set) => ({
  sidebarCollapsed: getInitialSidebarCollapsed(),
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
