'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuthStore } from '../store/useAuthStore';
import { Play, LogIn, UserPlus, Zap, GraduationCap, ArrowRight, HardDrive } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [quickCode, setQuickCode] = useState('');
  const [quickNick, setQuickNick] = useState('');

  const handleQuickJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCode.trim() || !quickNick.trim()) return;
    router.push(`/play/${quickCode.trim()}?nick=${encodeURIComponent(quickNick.trim())}`);
  };

  return (
    <div className="min-h-screen bg-google-bg dark:bg-google-bg-dark flex flex-col font-sans">
      {/* Google Header */}
      <header className="px-6 py-4 flex justify-between items-center select-none sticky top-0 z-20 bg-google-bg/90 dark:bg-google-bg-dark/90 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center p-1.5 shadow-xs">
            <svg viewBox="0 0 24 24" className="w-full h-full">
              <path fill="#4285F4" d="M12 2L2 19.7h8.4L12 16.2l3.6 3.5H22L12 2z" />
              <path fill="#FBBC05" d="M2 19.7h8.4L15.6 12 12 2 2 19.7z" />
              <path fill="#34A853" d="M12 16.2l3.6 3.5H22L17.2 12 12 16.2z" />
              <path fill="#EA4335" d="M12 2l5.2 10 4.8 7.7L12 2z" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-200">
            HocRealtime
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isAuthenticated ? (
            <Button size="sm" onClick={() => router.push('/app/dashboard')}>
              Vào Dashboard ({user?.name || user?.email})
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/login')}
                className="gap-1.5"
              >
                <LogIn size={15} /> Đăng nhập
              </Button>
              <Button
                size="sm"
                onClick={() => router.push('/register')}
                className="gap-1.5"
              >
                <UserPlus size={15} /> Đăng ký
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col items-center text-center space-y-10">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-google-pill text-google-pill-text dark:bg-google-pill-dark dark:text-google-pill-dark-text rounded-full text-xs font-bold select-none">
            <Zap size={14} className="text-google-blue" />
            Trải nghiệm Giáo dục trực tuyến & Chaos Quiz Material You
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
            Quản lý lớp học, chấm bài tự động & thi đấu trắc nghiệm realtime
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal">
            Lấy cảm hứng từ Google Workspace, kết hợp hệ thống giao bài kiểu Azota và chế độ Chaos Quiz 25 câu hỏi đồng thời.
          </p>
        </div>

        {/* Quick Join Game Widget */}
        <div className="w-full max-w-md bg-white dark:bg-google-card-dark p-8 rounded-3xl text-left space-y-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="space-y-1 text-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Tham gia phòng game ngay
            </h2>
            <p className="text-xs text-slate-500">
              Nhập mã PIN từ giáo viên để vào sảnh thi đấu
            </p>
          </div>

          <form onSubmit={handleQuickJoin} className="space-y-3">
            <input
              type="text"
              placeholder="MÃ PIN (VD: 849201)"
              maxLength={6}
              value={quickCode}
              onChange={(e) => setQuickCode(e.target.value)}
              className="w-full px-4 py-3 bg-google-input dark:bg-google-input-dark text-slate-900 dark:text-slate-100 rounded-full text-center font-mono font-bold text-lg tracking-widest focus:ring-2 focus:ring-google-blue focus:outline-none"
              required
            />
            <input
              type="text"
              placeholder="Biệt danh hiển thị của bạn"
              value={quickNick}
              onChange={(e) => setQuickNick(e.target.value)}
              className="w-full px-4 py-2.5 bg-google-input dark:bg-google-input-dark text-slate-900 dark:text-slate-100 rounded-full text-center text-sm font-medium focus:ring-2 focus:ring-google-blue focus:outline-none"
              required
            />
            <Button type="submit" fullWidth size="lg" className="font-bold gap-2 shadow-md">
              <Play size={18} /> Vào phòng chơi
            </Button>
          </form>
        </div>

        {/* 3 Pillars */}
        <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 text-left pt-6">
          <div className="space-y-3 p-6 bg-white dark:bg-google-card-dark rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-google-blue">
              <GraduationCap size={20} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Giao bài & Chấm điểm (Azota)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tạo thư mục lớp học, chia sẻ mã tham gia 1-click, giao bài tự luận và trắc nghiệm, chấm điểm và nhận xét chi tiết.
            </p>
          </div>

          <div className="space-y-3 p-6 bg-white dark:bg-google-card-dark rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-google-green">
              <Play size={20} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Trắc nghiệm Realtime (Quizizz)
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Phòng chơi đồng bộ nhiều người, bảng xếp hạng trực tiếp cập nhật tức thì, điểm tốc độ và chuỗi đúng (streak).
            </p>
          </div>

          <div className="space-y-3 p-6 bg-white dark:bg-google-card-dark rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-950/60 flex items-center justify-center text-google-red">
              <Zap size={20} />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
              Đấu trường Chaos Quiz
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ma trận 25 câu hỏi xuất hiện đồng thời trên cùng một màn hình. Đúng +100 điểm, sai -100 điểm và đổi câu mới ngay lập tức.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-xs text-slate-400">
        HocRealtime Education Platform © {new Date().getFullYear()} — Google Material Design 3 Style.
      </footer>
    </div>
  );
}
