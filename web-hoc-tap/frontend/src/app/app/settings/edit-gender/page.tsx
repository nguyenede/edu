'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { updateProfile } from '@/lib/profileApi';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowLeft, Check } from 'lucide-react';

export default function EditGenderPage() {
  const router = useRouter();
  const { token, user, updateUser } = useAuthStore();
  const [gender, setGender] = useState(user?.gender || '');
  const [toast, setToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (g: string) => {
    if (!token) {
      router.push('/login');
      return;
    }
    setGender(g);
    setSaving(true);
    setErrorMsg(null);
    try {
      const updatedUser = await updateProfile(token, { gender: g });
      updateUser(updatedUser);
      setToast(true);
      setTimeout(() => {
        router.push('/app/settings/account');
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể cập nhật giới tính');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6 pt-3.5 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã cập nhật giới tính thành công
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
              Chọn Giới tính
            </h1>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-3">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}
          {['Nam', 'Nữ', 'Khác', 'Không muốn tiết lộ'].map((g) => (
            <button
              key={g}
              disabled={saving}
              onClick={() => handleSelect(g)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl text-sm font-medium transition-all ${
                gender === g
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 text-google-blue border border-google-blue/30'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800'
              }`}
            >
              <span>{g}</span>
              {gender === g && <Check size={18} className="text-google-blue" />}
            </button>
          ))}

          <div className="flex justify-end pt-4">
            <Button variant="ghost" onClick={() => router.push('/settings')}>
              Quay lại
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
