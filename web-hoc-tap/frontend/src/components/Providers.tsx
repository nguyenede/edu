'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { TopLoadingBar } from './TopLoadingBar';

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
  const setTheme = useThemeStore((state) => state.setTheme);

  useEffect(() => {
    // Load authentication session
    initializeAuth();

    // Load theme
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  }, [initializeAuth, setTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={null}>
        <TopLoadingBar />
      </Suspense>
      {children}
    </QueryClientProvider>
  );
};
