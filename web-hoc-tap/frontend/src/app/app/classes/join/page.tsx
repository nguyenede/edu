'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Users, Check, PlusCircle, LogIn } from 'lucide-react';
import { joinClass } from '@/lib/classesApi';

function JoinClassContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuthStore();
  const codeParam = searchParams.get('code') || '';
  const [joinCode, setJoinCode] = useState(codeParam.replace(/\D/g, ''));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (codeParam) {
      setJoinCode(codeParam.replace(/\D/g, ''));
    }
  }, [codeParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!activeToken) {
      router.push(`/login?returnUrl=${encodeURIComponent(`/app/classes/join?code=${joinCode.trim()}`)}`);
      return;
    }

    setErrorMsg(null);
    setLoading(true);
    try {
      await joinClass(activeToken, joinCode.trim().toUpperCase());
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
        <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
          <button
            type="button"
            onClick={() => router.push('/app/classes')}
            className="cursor-pointer text-slate-900 dark:text-white font-normal shrink-0 whitespace-nowrap"
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
          <span className="text-slate-900 dark:text-white font-normal truncate min-w-0 flex-1">
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
              label="Mã lớp gồm 6 chữ số"
              placeholder="Ví dụ: 123456"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
              className="text-center font-mono font-bold tracking-widest text-lg"
              required
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Đang xử lý' : 'Tham gia ngay'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

export default function JoinClassPage() {
  return (
    <Suspense fallback={null}>
      <JoinClassContent />
    </Suspense>
  );
}
