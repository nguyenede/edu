import { create } from 'zustand';

export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student' | 'parent';
  avatar_url?: string;
  specificId?: number;
  phone?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token: string, remember?: boolean) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

const readUser = (): User | null => {
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    return null;
  }
};

const initialToken = localStorage.getItem('token') || sessionStorage.getItem('token');

export const useAuthStore = create<AuthState>((set) => ({
  user: readUser(),
  token: initialToken,
  isAuthenticated: Boolean(initialToken),
  isLoading: Boolean(initialToken),
  login: (user, token, remember = false) => {
    const storage = remember ? localStorage : sessionStorage;
    const otherStorage = remember ? sessionStorage : localStorage;
    otherStorage.removeItem('token');
    otherStorage.removeItem('user');
    storage.setItem('token', token);
    storage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },
  setUser: (user) => {
    const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(user));
    set({ user });
  },
  setLoading: (isLoading) => set({ isLoading }),
}));
