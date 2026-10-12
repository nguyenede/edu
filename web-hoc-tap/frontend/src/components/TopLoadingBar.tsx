'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

let globalStartLoading: () => void = () => {};
let globalFinishLoading: () => void = () => {};

export const startTopLoading = () => globalStartLoading();
export const finishTopLoading = () => globalFinishLoading();

export const TopLoadingBar: React.FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  };

  const finish = () => {
    clearAllTimers();
    setProgress(100);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 220);
    timersRef.current.push(hideTimer);
  };

  const start = () => {
    clearAllTimers();
    setVisible(true);
    setProgress(25);

    const t1 = setTimeout(() => setProgress(65), 100);
    const t2 = setTimeout(() => setProgress(85), 200);

    // Watchdog timer: Automatically complete and hide after 600ms
    // Ensures the loading bar NEVER freezes or stays stuck on any page
    const watchdog = setTimeout(() => {
      finish();
    }, 600);

    timersRef.current.push(t1, t2, watchdog);
  };

  useEffect(() => {
    globalStartLoading = start;
    globalFinishLoading = finish;
    return () => {
      clearAllTimers();
    };
  }, []);

  // Trigger loading completion on route / search parameter changes
  useEffect(() => {
    finish();
  }, [pathname, searchParams]);

  // Intercept click on internal links to start progress bar instantly
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (target && target.href && !target.target && !target.hasAttribute('download')) {
        try {
          const targetUrl = new URL(target.href, window.location.origin);
          if (
            targetUrl.origin === window.location.origin &&
            targetUrl.pathname !== window.location.pathname &&
            !targetUrl.pathname.startsWith('/api')
          ) {
            start();
          }
        } catch {}
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  // Intercept history.pushState only for programmatic router navigation to DIFFERENT routes
  useEffect(() => {
    const origPushState = window.history.pushState;

    window.history.pushState = function (data, unused, url) {
      if (url) {
        try {
          const destUrl = new URL(url.toString(), window.location.origin);
          if (
            destUrl.origin === window.location.origin &&
            destUrl.pathname !== window.location.pathname
          ) {
            start();
          }
        } catch {}
      }
      return origPushState.apply(this, [data, unused, url]);
    };

    return () => {
      window.history.pushState = origPushState;
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[99999] pointer-events-none transition-opacity duration-150 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Simple 2.5px High Solid Single-Color Bar (No Gradient, No Shadow, No Blur) */}
      <div
        className="h-[2.5px] bg-google-blue transition-all duration-200 ease-linear"
        style={{
          width: `${progress}%`,
        }}
      />
    </div>
  );
};
