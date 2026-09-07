'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, School, ArrowRight, Sparkles, Hash, User } from 'lucide-react';
import { Button } from '../Button';

export const QuickJoinCard: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'quiz' | 'class'>('quiz');
  
  // Quiz states
  const [quickCode, setQuickCode] = useState('');
  const [quickNick, setQuickNick] = useState('');
  
  // Class states
  const [classCode, setClassCode] = useState('');

  const handleQuickJoinQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCode.trim() || !quickNick.trim()) return;
    router.push(`/play/${quickCode.trim()}?nick=${encodeURIComponent(quickNick.trim())}`);
  };

  const handleJoinClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCode.trim()) return;
    router.push(`/classes/join?code=${encodeURIComponent(classCode.trim())}`);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white/95 dark:bg-google-card-dark/95 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 transition-all duration-200">
      {/* Switcher Tab */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-6 select-none">
        <button
          type="button"
          onClick={() => setActiveTab('quiz')}
          className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'quiz'
              ? 'bg-white dark:bg-slate-900 text-google-blue shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Play size={14} className={activeTab === 'quiz' ? 'fill-current' : ''} />
          Vào phòng Game
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('class')}
          className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'class'
              ? 'bg-white dark:bg-slate-900 text-google-green shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <School size={14} />
          Vào lớp học
        </button>
      </div>

      {activeTab === 'quiz' ? (
        <form onSubmit={handleQuickJoinQuiz} className="space-y-4 text-left">
          <div className="space-y-1 text-center">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
              Nhập mã PIN thi đấu
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 dark:bg-blue-950/80 text-google-blue">
                Realtime
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhận mã PIN từ giáo viên hoặc bạn bè để vào sảnh
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Hash size={18} />
              </div>
              <input
                type="text"
                placeholder="MÃ PIN (VD: 849201)"
                maxLength={8}
                value={quickCode}
                onChange={(e) => setQuickCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-3 bg-google-input dark:bg-google-input-dark text-slate-900 dark:text-slate-100 rounded-2xl text-center font-mono font-bold text-lg tracking-widest focus:ring-2 focus:ring-google-blue focus:outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-sm"
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User size={16} />
              </div>
              <input
                type="text"
                placeholder="Biệt danh hiển thị trong phòng"
                maxLength={24}
                value={quickNick}
                onChange={(e) => setQuickNick(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-google-input dark:bg-google-input-dark text-slate-900 dark:text-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-google-blue focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            fullWidth
            size="lg"
            className="font-bold gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all cursor-pointer"
          >
            <Play size={18} className="fill-current" /> Tham gia thi đấu
          </Button>
        </form>
      ) : (
        <form onSubmit={handleJoinClass} className="space-y-4 text-left">
          <div className="space-y-1 text-center">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
              Tham gia lớp học
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-google-green">
                Lớp học
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nhập mã lớp do thầy/cô cung cấp để nhận bài tập
            </p>
          </div>

          <div className="pt-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <School size={18} />
              </div>
              <input
                type="text"
                placeholder="MÃ LỚP (VD: KY-8821)"
                maxLength={12}
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                className="w-full pl-10 pr-4 py-3 bg-google-input dark:bg-google-input-dark text-slate-900 dark:text-slate-100 rounded-2xl text-center font-mono font-bold text-base tracking-wider focus:ring-2 focus:ring-google-green focus:outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-sm"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="success"
            fullWidth
            size="lg"
            className="font-bold gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer"
          >
            Vào lớp ngay <ArrowRight size={18} />
          </Button>
        </form>
      )}

      {/* Footer Note inside card */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
          <Sparkles size={12} className="text-amber-500" /> Không cần đăng ký để chơi
        </span>
        <button
          type="button"
          onClick={() => router.push('/help')}
          className="hover:text-google-blue underline decoration-slate-300 dark:decoration-slate-700 cursor-pointer"
        >
          Hướng dẫn tham gia?
        </button>
      </div>
    </div>
  );
};
