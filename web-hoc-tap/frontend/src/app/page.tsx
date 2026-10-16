'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuthStore } from '../store/useAuthStore';
import { QuickJoinCard } from '../components/home/QuickJoinCard';
import { FeatureBentoGrid } from '../components/home/FeatureBentoGrid';
import {
  LogIn,
  UserPlus,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  BookOpen,
  GraduationCap,
  Layers,
  ChevronRight,
  Compass,
  CheckCircle,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="min-h-screen bg-google-bg dark:bg-google-bg-dark flex flex-col font-sans selection:bg-blue-500 selection:text-white transition-colors duration-200">
      {/* Header */}
      <header className="px-6 py-4 flex justify-between items-center select-none sticky top-0 z-30 bg-google-bg/85 dark:bg-google-bg-dark/85 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/')}>
          <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center p-2 shadow-sm border border-slate-200/70 dark:border-slate-800">
            <svg viewBox="0 0 24 24" width="24" height="24" className="w-full h-full" style={{ maxWidth: '24px', maxHeight: '24px' }}>
              <path fill="#4285F4" d="M12 2L2 19.7h8.4L12 16.2l3.6 3.5H22L12 2z" />
              <path fill="#FBBC05" d="M2 19.7h8.4L15.6 12 12 2 2 19.7z" />
              <path fill="#34A853" d="M12 16.2l3.6 3.5H22L17.2 12 12 16.2z" />
              <path fill="#EA4335" d="M12 2l5.2 10 4.8 7.7L12 2z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                KiyoEdu
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-google-blue">
                v2.0
              </span>
            </div>
            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 hidden sm:block">
              Nền tảng Học tập & Đấu trường Quiz
            </span>
          </div>
        </div>

        {/* Navigation links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <a href="#features" className="hover:text-google-blue transition-colors">
            Tính năng
          </a>
          <a href="#how-it-works" className="hover:text-google-blue transition-colors">
            Cách hoạt động
          </a>
          <button
            type="button"
            onClick={() => router.push('/app/help')}
            className="hover:text-google-blue transition-colors cursor-pointer"
          >
            Hỗ trợ
          </button>
        </nav>

        {/* Right side auth & theme */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button
              size="sm"
              onClick={() => router.push('/app/dashboard')}
              className="font-bold gap-1.5 shadow-sm"
            >
              Vào Dashboard ({user?.name || user?.email?.split('@')[0]})
              <ArrowRight size={14} />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/login')}
                className="gap-1.5 text-xs font-semibold"
              >
                <LogIn size={14} /> Đăng nhập
              </Button>
              <Button
                size="sm"
                onClick={() => router.push('/register')}
                className="gap-1.5 text-xs font-bold shadow-sm"
              >
                <UserPlus size={14} /> Đăng ký
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-20">
        
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline & Value Proposition */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-900/60 text-google-blue rounded-full text-xs font-bold select-none">
              <Sparkles size={14} className="text-google-blue" />
              Kỷ nguyên mới của Giáo dục Trực tuyến & SI
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-[1.12]">
              Dạy thông minh, <br className="hidden sm:block" />
              học hào hứng cùng{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500">
                KiyoEdu
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-normal leading-relaxed max-w-xl mx-auto lg:mx-0">
              Nền tảng all-in-one cho Thầy Cô và Học Sinh: Bóc tách đề thi tự động bằng SI & OCR, quản lý bài tập theo phong cách Azota, cùng kho tài liệu & đề kiểm tra phân hóa chuẩn Bộ GD&ĐT.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <Button
                size="lg"
                onClick={() => router.push(isAuthenticated ? '/app/dashboard' : '/register')}
                className="font-bold gap-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 cursor-pointer"
              >
                {isAuthenticated ? 'Vào khu vực học tập' : 'Bắt đầu miễn phí ngay'}
                <ArrowRight size={16} />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  const el = document.getElementById('features');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="font-semibold gap-2 cursor-pointer"
              >
                <Compass size={16} /> Khám phá tính năng
              </Button>
            </div>

            {/* Micro proof badges */}
            <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-emerald-500" /> Miễn phí trọn đời
              </span>
              <span className="flex items-center gap-1.5">
                <Zap size={16} className="text-amber-500" /> Không cần cài app
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen size={16} className="text-blue-500" /> Kho đề chuẩn BGD
              </span>
            </div>
          </div>

          {/* Right Column: Quick Join Interactive Card */}
          <div className="lg:col-span-5 flex justify-center">
            <QuickJoinCard />
          </div>
        </section>

        {/* Live Metrics Bar */}
        <section className="w-full bg-white dark:bg-google-card-dark rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-google-blue font-mono">
                50,000+
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Câu hỏi trong ngân hàng đề
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-google-red font-mono">
                4 Mức
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Ma trận đề thi chuẩn phân hóa Bộ GD&ĐT
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-google-green font-mono">
                100%
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Bóc tách đề & chấm thi tự động
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-amber-500 font-mono">
                0ms
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Độ trễ cập nhật bảng vàng trực tiếp
              </p>
            </div>
          </div>
        </section>

        {/* Bento Grid Features Section */}
        <div id="features">
          <FeatureBentoGrid />
        </div>

        {/* How It Works (3 Steps) */}
        <section id="how-it-works" className="space-y-10 text-center">
          <div className="space-y-2 max-w-xl mx-auto">
            <span className="text-xs font-bold text-google-blue tracking-wide">
              Quy trình tinh gọn
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
              Bắt đầu với KiyoEdu trong 3 bước
            </h2>
            <p className="text-sm text-slate-500">
              Chỉ mất chưa đầy 60 giây để tổ chức một buổi học hoặc trận đấu trắc nghiệm bùng nổ.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="bg-white dark:bg-google-card-dark p-7 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 relative">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-google-blue flex items-center justify-center font-bold text-base">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Đăng ký & Tham gia lớp học
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tạo tài khoản Giáo viên hoặc Học sinh. Mở lớp học mới hoặc nhập mã lớp để kết nối ngay lập tức.
              </p>
            </div>

            <div className="bg-white dark:bg-google-card-dark p-7 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 relative">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-google-green flex items-center justify-center font-bold text-base">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Soạn đề thần tốc với SI
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tải lên file đề PDF hoặc dùng ngân hàng câu hỏi sẵn có. SI tự động tinh chỉnh ma trận câu hỏi và phân loại độ khó.
              </p>
            </div>

            <div className="bg-white dark:bg-google-card-dark p-7 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4 relative">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 flex items-center justify-center font-bold text-base">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Chia sẻ mã PIN & Bắt đầu
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Học sinh chỉ cần quét mã QR hoặc nhập 6 chữ số PIN trên điện thoại là có thể bước vào trận đấu ngay tức khắc!
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA Banner */}
        <section className="bg-blue-600 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-8 sm:p-14 text-white text-center space-y-6 shadow-xl shadow-blue-500/25 relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Sẵn sàng nâng tầm trải nghiệm dạy và học cùng KiyoEdu?
            </h2>
            <p className="text-sm sm:text-base text-blue-50 leading-relaxed">
              Gia nhập hàng nghìn thầy cô và học sinh trên toàn quốc đang tạo nên những lớp học năng động, hiện đại và hiệu quả.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full text-base font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-lg cursor-pointer transition-all gap-2"
              >
                Đăng ký tài khoản miễn phí <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="inline-flex items-center justify-center px-6 py-3 rounded-full text-base font-semibold bg-blue-700/80 hover:bg-blue-700 text-white border border-white/40 cursor-pointer transition-all"
              >
                Đăng nhập ngay
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-10 px-6 text-center text-xs text-slate-500 dark:text-slate-400 space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-6 font-medium">
          <a href="#features" className="hover:text-google-blue">Tính năng</a>
          <a href="#how-it-works" className="hover:text-google-blue">Cách hoạt động</a>
          <button type="button" onClick={() => router.push('/app/help')} className="hover:text-google-blue cursor-pointer">
            Trung tâm trợ giúp
          </button>
          <button type="button" onClick={() => router.push('/app/settings')} className="hover:text-google-blue cursor-pointer">
            Cài đặt
          </button>
        </div>
        <p>
          KiyoEdu Platform © {new Date().getFullYear()} — Nền tảng Giáo dục trực tuyến & Đấu trường Realtime. Thiết kế chuẩn Google Material You.
        </p>
      </footer>
    </div>
  );
}
