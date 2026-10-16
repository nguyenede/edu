'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Construction, ArrowLeft, FolderOpen } from 'lucide-react';

export default function QuestionBankPage() {
  const router = useRouter();

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-16 px-4 text-center space-y-5 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-google-blue flex items-center justify-center shadow-xs">
          <Construction size={32} className="stroke-[2]" />
        </div>

        <div className="space-y-2 max-w-md">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            Tính năng chưa được phát triển
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Mục Ngân hàng câu hỏi hiện đang trong quá trình hoàn thiện và sẽ sớm ra mắt trong các bản cập nhật tiếp theo.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2 flex-wrap justify-center">
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push('/dashboard')}
            className="gap-2 text-xs font-semibold"
          >
            <ArrowLeft size={15} />
            Về Trang chủ
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => router.push('/documents')}
            className="gap-2 text-xs font-semibold"
          >
            <FolderOpen size={15} />
            Đến Kho tài liệu
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
