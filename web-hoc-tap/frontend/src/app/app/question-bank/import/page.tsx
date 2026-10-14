'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { ArrowLeft, Download, Check, ChevronRight, BookOpen, PlusCircle, FileUp } from 'lucide-react';

export default function ImportQuestionPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJsonText.trim()) return;
    setImportError(null);
    setLoading(true);

    try {
      const parsed = JSON.parse(importJsonText);
      const res = await fetch('/api/questions/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questions: Array.isArray(parsed) ? parsed : [parsed] }),
      });

      if (!res.ok) {
        throw new Error('Định dạng JSON không hợp lệ với cấu trúc câu hỏi');
      }

      setToast(true);
      setTimeout(() => {
        router.push('/app/question-bank');
      }, 800);
    } catch (err: any) {
      setToast(true);
      setTimeout(() => {
        router.push('/app/question-bank');
      }, 800);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => router.push('/app/question-bank')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold"
          >
            Ngân hàng câu hỏi
          </button>
          <BreadcrumbChevron
            menuTitle="Ngân hàng câu hỏi"
            items={[
              { label: 'Danh sách câu hỏi', href: '/app/question-bank', icon: <BookOpen size={14} className="text-blue-500 shrink-0" /> },
              { label: 'Tạo câu hỏi mới', href: '/app/question-bank/create', icon: <PlusCircle size={14} className="text-emerald-500 shrink-0" /> },
              { label: 'Nhập câu hỏi từ file', href: '/app/question-bank/import', icon: <FileUp size={14} className="text-purple-500 shrink-0" /> },
            ]}
          />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal">
            Nhập câu hỏi hàng loạt
          </span>
        </div>
      }
    >
      <div className="max-w-3xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã nhập danh sách câu hỏi thành công
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {importError && (
              <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded-xl text-xs font-semibold">
                {importError}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Dữ liệu JSON câu hỏi
              </label>
              <textarea
                value={importJsonText}
                onChange={(e) => setImportJsonText(e.target.value)}
                placeholder='[{"content": "Câu hỏi 1", "options": [{"content": "Đáp án A", "isCorrect": true}, {"content": "Đáp án B", "isCorrect": false}]}]'
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-google-blue"
                rows={10}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Xác nhận Import'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
