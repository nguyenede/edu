'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { updateProfile } from '@/lib/profileApi';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowLeft, Check } from 'lucide-react';

export default function EditBirthdayPage() {
  const router = useRouter();
  const { token, user, updateUser } = useAuthStore();
  const [birthday, setBirthday] = useState(user?.birthday || '');
  const [toast, setToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      router.push('/login');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const updatedUser = await updateProfile(token, { birthday });
      updateUser(updatedUser);
      setToast(true);
      setTimeout(() => {
        router.push('/app/settings/account');
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể cập nhật ngày sinh');
    } finally {
      setSaving(false);
    }
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
            onClick={() => router.push('/app/settings/account')}
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
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}
            <Input
              label="Ngày tháng năm sinh"
              value={birthday}
              onChange={(e) => setBirthday(e.target.value)}
              placeholder="6 tháng 6, 2006"
              required
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => router.push('/app/settings/account')}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu ngày sinh'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
