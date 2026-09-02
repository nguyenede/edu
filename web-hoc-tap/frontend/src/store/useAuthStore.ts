import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  name: string;
  avatar?: string | null;
  gender?: string | null;
  phone?: string | null;
  birthday?: string | null;
  language?: string | null;
  homeAddress?: string | null;
  workAddress?: string | null;
  plan?: string | null;
  hasSelectedPlan?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  initialize: () => void;
  updateUser: (partialUser: Partial<User>) => void;
  setPlan: (plan: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  login: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('pendingPlanSelection');
    }
    set({ user: null, token: null, isAuthenticated: false });
  },
  updateUser: (partialUser) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...partialUser };
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      return { user: updatedUser };
    });
  },
  setPlan: (plan) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, plan, hasSelectedPlan: true };
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(updatedUser));
        localStorage.removeItem('pendingPlanSelection');
      }
      return { user: updatedUser };
    });
  },
  initialize: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ user, token, isAuthenticated: true });
          return;
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      set({ user: null, token: null, isAuthenticated: false });
    }
  },
}));
