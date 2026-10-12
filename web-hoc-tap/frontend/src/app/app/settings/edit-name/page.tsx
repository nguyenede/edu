'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { useAuthStore } from '@/store/useAuthStore';
import { updateProfile } from '@/lib/profileApi';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ArrowLeft, Camera, Check, ChevronRight } from 'lucide-react';

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
      const updatedUser = await updateProfile(token, { name });
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
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => router.push('/app/settings')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-semibold"
          >
            Cài đặt
          </button>
          <BreadcrumbChevron
            menuTitle="Cài đặt"
            items={[
              { label: 'Cài đặt chung', href: '/app/settings' },
              { label: 'Hồ sơ cá nhân', href: '/app/settings/edit-name' },
              { label: 'Đổi mật khẩu', href: '/app/settings/edit-password' },
              { label: 'Quản lý thiết bị', href: '/app/settings/devices' },
              { label: 'Gói dịch vụ', href: '/app/settings/plans' },
            ]}
          />
          <button
            type="button"
            onClick={() => router.push('/app/settings')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-normal"
          >
            Tài khoản
          </button>
          <BreadcrumbChevron
            menuTitle="Thông tin tài khoản"
            items={[
              { label: 'Họ và tên & Ảnh hồ sơ', href: '/app/settings/edit-name' },
              { label: 'Số điện thoại', href: '/app/settings/edit-phone' },
              { label: 'Ngày sinh', href: '/app/settings/edit-birthday' },
              { label: 'Giới tính', href: '/app/settings/edit-gender' },
              { label: 'Địa chỉ', href: '/app/settings/edit-address' },
              { label: 'Ngôn ngữ', href: '/app/settings/edit-language' },
              { label: 'Đổi mật khẩu', href: '/app/settings/edit-password' },
            ]}
          />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-normal">
            Họ và tên & Ảnh hồ sơ
          </span>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6 pt-3.5 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã cập nhật Họ và tên thành công
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs space-y-6">
          {errorMsg && (
            <div className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 p-3 rounded-2xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="flex flex-col items-center justify-center space-y-3 pb-2">
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
                onClick={() => router.push('/app/settings/account')}
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
