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

  const start = () => {
    setVisible(true);
    setProgress(20);
    setTimeout(() => setProgress(65), 100);
    setTimeout(() => setProgress(85), 200);
  };

  const finish = () => {
    setProgress(100);
    setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 200);
  };

  useEffect(() => {
    globalStartLoading = start;
    globalFinishLoading = finish;
  }, []);

  // Trigger loading completion on route / search parameter changes
  useEffect(() => {
    finish();
  }, [pathname, searchParams]);

  // Intercept click on internal links to start progress bar instantly
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (target && target.href) {
        const targetUrl = new URL(target.href, window.location.origin);
        if (
          targetUrl.origin === window.location.origin &&
          targetUrl.pathname !== window.location.pathname
        ) {
          start();
        }
      }
    };

    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  // Intercept history.pushState and history.replaceState for programmatic router.push navigation
  useEffect(() => {
    const origPushState = window.history.pushState;
    const origReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      start();
      return origPushState.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      start();
      return origReplaceState.apply(this, args);
    };

    return () => {
      window.history.pushState = origPushState;
      window.history.replaceState = origReplaceState;
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
