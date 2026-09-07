'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Sparkles, Construction, ArrowLeft, Bot } from 'lucide-react';
import { Button } from '@/components/Button';

export default function AiRootPage() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-[75vh] w-full px-4 text-center select-none animate-in fade-in duration-300">
        {/* Animated AI Glowing Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500/20 via-indigo-500/20 to-purple-500/20 dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-purple-500/10 border border-blue-500/30 dark:border-blue-400/20 flex items-center justify-center shadow-lg shadow-blue-500/5">
            <Bot size={46} className="text-google-blue dark:text-blue-400" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md animate-bounce">
            <Sparkles size={16} />
          </div>
        </div>

        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-xs mb-4">
          <Construction size={14} className="text-amber-600 dark:text-amber-400" />
          <span>Tính năng này đang phát triển</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 max-w-md">
          Trợ lý AI KiyoEdu
        </h1>

        {/* Description */}
        <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
          Tính năng trợ lý học tập AI thông minh đang được đội ngũ KiyoEdu hoàn thiện và sẽ sớm ra mắt trong các bản cập nhật tiếp theo.
        </p>

        {/* Back Button */}
        <div className="mt-8 flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => router.push('/app/dashboard')}
            className="flex items-center gap-2 px-5 py-2.5 shadow-sm"
          >
            <ArrowLeft size={16} />
            <span>Quay lại Trang chủ</span>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
