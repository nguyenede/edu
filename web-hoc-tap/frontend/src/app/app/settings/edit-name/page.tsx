'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ArrowLeft, Camera, Check } from 'lucide-react';

export default function EditNamePage() {
  const router = useRouter();
  const { user, token, updateUser, initialize } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [toast, setToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!token) {
      router.push('/login');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch('http://127.0.0.1:3005/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      const updatedUser = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(updatedUser?.message || 'Không thể cập nhật hồ sơ');
      }
      updateUser(updatedUser);
      setToast(true);
      setTimeout(() => {
        router.push('/app/settings/account');
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể cập nhật hồ sơ');
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
            Đã cập nhật Họ và tên thành công
          </div>
        )}

        {/* Back Navigation Bar */}
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
              Họ và tên & Ảnh hồ sơ
            </h1>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          {errorMsg && (
            <div className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 p-3 rounded-2xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col items-center justify-center space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full bg-google-blue text-white flex items-center justify-center font-bold text-3xl shadow-md">
                {name ? name[0].toUpperCase() : 'U'}
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 bg-slate-900 text-white p-2 rounded-full shadow-lg hover:scale-105 transition-all"
                title="Tải ảnh mới"
              >
                <Camera size={14} />
              </button>
            </div>
            <p className="text-xs text-slate-500">Bấm vào biểu tượng máy ảnh để thay đổi ảnh</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Họ và tên"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập họ và tên..."
              required
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/settings')}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
