'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { School, ArrowRight, BookOpen } from 'lucide-react';
import { Button } from '../Button';

export const QuickJoinCard: React.FC = () => {
  const router = useRouter();
  const [classCode, setClassCode] = useState('');

  const handleJoinClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCode.trim()) return;
    router.push(`/classes/join?code=${encodeURIComponent(classCode.trim())}`);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white/95 dark:bg-google-card-dark/95 backdrop-blur-xl p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 transition-all duration-200">
      <form onSubmit={handleJoinClass} className="space-y-4 text-left">
        <div className="space-y-1 text-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
            Vào lớp học nhanh
            <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-google-green">
              Học sinh
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Nhập mã lớp do thầy/cô cung cấp để nhận bài tập và đề thi
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
              className="w-full pl-10 pr-4 py-3.5 bg-google-input dark:bg-google-input-dark text-slate-900 dark:text-slate-100 rounded-2xl text-center font-mono font-bold text-base tracking-wider focus:ring-2 focus:ring-google-green focus:outline-none transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-sm"
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
          Tham gia lớp ngay <ArrowRight size={18} />
        </Button>
      </form>

      {/* Footer Note inside card */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium">
          <BookOpen size={12} className="text-google-blue" /> Đồng bộ bài tập theo thời gian thực
        </span>
        <button
          type="button"
          onClick={() => router.push('/app/help')}
          className="hover:text-google-blue underline decoration-slate-300 dark:decoration-slate-700 cursor-pointer"
        >
          Hướng dẫn tham gia?
        </button>
      </div>
    </div>
  );
};
