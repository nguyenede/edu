'use client';

import React, { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error caught by boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-700 space-y-4">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center font-bold text-2xl">
          !
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Đã xảy ra sự cố khi tải trang</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {error?.message || 'Hệ thống cần làm mới bộ nhớ đệm trang.'}
          </p>
        </div>

        <div className="pt-2 flex justify-center gap-3">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            Thử lại ngay
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    </div>
  );
}
