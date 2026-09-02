'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ArrowLeft, Check } from 'lucide-react';

export default function EditBirthdayPage() {
  const router = useRouter();
  const [birthday, setBirthday] = useState('6 tháng 6, 2006');
  const [toast, setToast] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setToast(true);
    setTimeout(() => {
      router.push('/settings');
    }, 1200);
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã cập nhật ngày sinh thành công
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/settings')}
            className="p-2 rounded-full hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-all"
            title="Quay lại Cài đặt"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Ngày sinh
            </h1>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Ngày tháng năm sinh"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              placeholder="6 tháng 6, 2006"
              required
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => router.push('/settings')}>
                Hủy
              </Button>
              <Button type="submit">
                Lưu ngày sinh
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
