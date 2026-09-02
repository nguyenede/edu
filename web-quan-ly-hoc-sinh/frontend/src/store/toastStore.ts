import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (type, message, duration = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 11);
    set({ toasts: [...useToastStore.getState().toasts, { id, type, message, duration }] });
    if (duration > 0) {
      setTimeout(() => {
        set({ toasts: useToastStore.getState().toasts.filter((t) => t.id !== id) });
      }, duration);
    }
  },
  removeToast: (id) => {
    set({ toasts: useToastStore.getState().toasts.filter((t) => t.id !== id) });
  },
}));

export const toast = {
  success: (message: string) => useToastStore.getState().addToast('success', message),
  error: (message: string) => useToastStore.getState().addToast('error', message),
  warning: (message: string) => useToastStore.getState().addToast('warning', message),
  info: (message: string) => useToastStore.getState().addToast('info', message),
};
