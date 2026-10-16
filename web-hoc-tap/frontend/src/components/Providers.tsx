'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const initializeAuth = useAuthStore((state) => state.initialize);
  const initializeTheme = useThemeStore((state) => state.initialize);

  useEffect(() => {
    // Load authentication session
    initializeAuth();

    // Load theme & appearance
    initializeTheme();

    // Chặn các lỗi do Extension trình duyệt (như Urban VPN, Adblock...) gây ra
    // để không làm kích hoạt bảng đỏ Unhandled Runtime Error của Next.js
    const handleExtensionErrors = (event: ErrorEvent) => {
      const filename = event.filename || '';
      const stack = event.error?.stack ? String(event.error.stack) : '';
      if (
        filename.includes('chrome-extension://') ||
        filename.includes('moz-extension://') ||
        stack.includes('chrome-extension://') ||
        stack.includes('moz-extension://')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const stack = event.reason?.stack ? String(event.reason.stack) : '';
      if (stack.includes('chrome-extension://') || stack.includes('moz-extension://')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('error', handleExtensionErrors, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    return () => {
      window.removeEventListener('error', handleExtensionErrors, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, [initializeAuth, initializeTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
