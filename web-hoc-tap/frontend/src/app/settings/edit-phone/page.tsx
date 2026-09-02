'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ArrowLeft, Check } from 'lucide-react';

export default function EditPhonePage() {
  const router = useRouter();
  const [phone, setPhone] = useState('0369 575 506');
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
      <div className="max-w-2xl mx-auto space-y-6 pt-3.5 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã cập nhật số điện thoại thành công
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
              Cập nhật Số điện thoại
            </h1>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Số điện thoại liên hệ"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0369 575 506"
              required
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => router.push('/settings')}>
                Hủy
              </Button>
              <Button type="submit">
                Lưu số điện thoại
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
