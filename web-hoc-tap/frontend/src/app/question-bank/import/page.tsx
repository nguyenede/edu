'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { ArrowLeft, Download, Check } from 'lucide-react';

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
        router.push('/question-bank');
      }, 1000);
    } catch (err: any) {
      setToast(true);
      setTimeout(() => {
        router.push('/question-bank');
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã nhập danh sách câu hỏi thành công
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all"
            title="Quay lại"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Download size={22} className="text-google-blue" />
              Nhập câu hỏi hàng loạt (Import JSON)
            </h1>
          </div>
        </div>

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
