'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ArrowLeft, Users, Check, ChevronRight, PlusCircle, LogIn } from 'lucide-react';
import { joinClass } from '@/lib/classesApi';

export default function JoinClassPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      await joinClass(token, joinCode.trim().toUpperCase());
      setToast(true);
      setTimeout(() => {
        router.push('/app/classes');
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi tham gia lớp');
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
            onClick={() => router.push('/app/classes')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold"
          >
            Lớp học của tôi
          </button>
          <BreadcrumbChevron
            menuTitle="Lớp học của tôi"
            items={[
              { label: 'Danh sách lớp học', href: '/app/classes', icon: <Users size={14} className="text-blue-500 shrink-0" /> },
              { label: 'Tạo lớp học mới', href: '/app/classes/create', icon: <PlusCircle size={14} className="text-emerald-500 shrink-0" /> },
              { label: 'Tham gia lớp học', href: '/app/classes/join', icon: <LogIn size={14} className="text-purple-500 shrink-0" /> },
            ]}
          />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal">
            Tham gia lớp học
          </span>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã tham gia lớp học thành công
          </div>
        )}

        <div className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <Input
              label="Mã lớp 6 ký tự"
              placeholder="MÃ 6 KÝ TỰ"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="text-center font-mono font-bold tracking-widest text-lg"
              required
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Tham gia ngay'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
