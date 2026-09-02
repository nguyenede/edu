'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ArrowLeft, Users, Check } from 'lucide-react';

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
      const res = await fetch('/api/classes/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: joinCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể tham gia lớp');

      setToast(true);
      setTimeout(() => {
        router.push('/classes');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi tham gia lớp');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã tham gia lớp học thành công
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
            <h1 className="text-xl font-normal tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users size={22} className="text-google-blue" />
              Tham gia Lớp học mới
            </h1>
          </div>
        </div>

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
