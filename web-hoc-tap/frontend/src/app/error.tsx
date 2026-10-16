'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../store/useAuthStore';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button } from '../components/Button';
import {
  Home,
  RotateCw,
  AlertTriangle,
  HelpCircle,
  FileText,
  GraduationCap,
  Sparkles,
  Compass,
} from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const { isAuthenticated, initialize } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initialize();
    setMounted(true);
    console.error('App Error caught by boundary:', error);
  }, [error, initialize]);

  const homeHref = mounted && isAuthenticated ? '/dashboard' : '/';

  return (
    <div className="min-h-screen flex flex-col bg-google-bg dark:bg-google-bg-dark text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href={homeHref}
            className="inline-flex items-center gap-2.5 group transition-transform active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center p-1.5 shadow-xs border border-slate-100 dark:border-slate-700/60 group-hover:shadow-md transition-all">
              <svg viewBox="0 0 24 24" width="24" height="24" className="w-full h-full" style={{ maxWidth: '24px', maxHeight: '24px' }}>
                <path fill="#4285F4" d="M12 2L2 19.7h8.4L12 16.2l3.6 3.5H22L12 2z" />
                <path fill="#FBBC05" d="M2 19.7h8.4L15.6 12 12 2 2 19.7z" />
                <path fill="#34A853" d="M12 16.2l3.6 3.5H22L17.2 12 12 16.2z" />
                <path fill="#EA4335" d="M12 2l5.2 10 4.8 7.7L12 2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                  KiyoEdu
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-google-blue">
                  v2.0
                </span>
              </div>
              <span className="text-[10px] font-semibold text-google-blue -mt-0.5 tracking-wider uppercase">
                Hệ thống Học tập & Quản lý Giáo dục
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={homeHref}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Home size={14} /> Trang chủ
            </Link>
            <Link
              href="/app/help"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <HelpCircle size={14} /> Hỗ trợ
            </Link>
            <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 hidden sm:block" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Error Hero */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-12 sm:py-16 relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[320px] bg-gradient-to-tr from-amber-500/15 via-red-500/10 to-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl w-full text-center space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold tracking-wide">
            <AlertTriangle size={14} className="shrink-0" />
            <span>ĐÃ XẢY RA SỰ CỐ KHI TẢI TRANG</span>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Rất tiếc, đã có lỗi phát sinh
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {error?.message || 'Hệ thống vừa gặp phải sự cố ngoài ý muốn. Vui lòng bấm thử lại hoặc làm mới trang.'}
            </p>
            {error?.digest && (
              <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                Mã định danh lỗi: {error.digest}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => reset()}
              className="gap-2 font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
            >
              <RotateCw size={16} /> Thử lại ngay
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => window.location.reload()}
              className="gap-2 font-semibold"
            >
              Làm mới trình duyệt
            </Button>

            <Button
              variant="outline"
              size="md"
              onClick={() => router.push(homeHref)}
              className="gap-2 font-semibold"
            >
              <Home size={16} /> Về Trang chủ
            </Button>
          </div>

          {/* Quick Suggestions Section */}
          <div className="pt-10 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass size={14} className="text-google-blue" />
                Các khu vực chính bạn có thể quan tâm
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/app/documents"
                className="p-4 rounded-2xl bg-white dark:bg-google-card-dark border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md transition-all group flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-google-blue flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-google-blue transition-colors">
                    Kho tài liệu
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    Soạn đề thi SI chuẩn Bộ GD&ĐT, lưu trữ tệp đề
                  </p>
                </div>
              </Link>

              <Link
                href="/app/classes"
                className="p-4 rounded-2xl bg-white dark:bg-google-card-dark border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-md transition-all group flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-google-green flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-google-green transition-colors">
                    Lớp học của tôi
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    Quản lý lớp, giao bài tập và theo dõi điểm số
                  </p>
                </div>
              </Link>

              <Link
                href="/app/si"
                className="p-4 rounded-2xl bg-white dark:bg-google-card-dark border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-purple-400 dark:hover:border-purple-500/50 hover:shadow-md transition-all group flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Trợ lý SI Thông minh
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    Hỏi đáp kiến thức, hỗ trợ giải toán và bóc tách đề
                  </p>
                </div>
              </Link>

              <Link
                href="/app/help"
                className="p-4 rounded-2xl bg-white dark:bg-google-card-dark border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-md transition-all group flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                    Trung tâm Hỗ trợ
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    Cẩm nang hướng dẫn tạo đề, giao bài và giải đáp
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200/80 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Hệ thống KiyoEdu đang hoạt động bình thường</span>
          </div>
          <div>
            <span>© {new Date().getFullYear()} KiyoEdu Platform. Bản quyền thuộc về nền tảng.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
