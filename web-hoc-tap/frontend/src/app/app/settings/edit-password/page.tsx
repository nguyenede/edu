'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useAuthStore } from '@/store/useAuthStore';
import { changePasswordApi } from '@/lib/profileApi';
import { ArrowLeft, Check, Lock, ChevronRight } from 'lucide-react';

export default function EditPasswordPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!token) {
      router.push('/login');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('Mật khẩu mới phải dài ít nhất 8 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp');
      return;
    }

    setSaving(true);
    try {
      await changePasswordApi(token, currentPassword, newPassword);
      setToast(true);
      setTimeout(() => {
        router.push('/app/settings/security');
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể đổi mật khẩu');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
          <button
            type="button"
            onClick={() => router.push('/app/settings')}
            className="cursor-pointer text-slate-900 dark:text-white font-semibold shrink-0 whitespace-nowrap"
          >
            Cài đặt
          </button>
          <BreadcrumbChevron
            menuTitle="Cài đặt"
            items={[
              { label: 'Cài đặt chung', href: '/app/settings' },
              { label: 'Hồ sơ cá nhân', href: '/app/settings/edit-name' },
              { label: 'Bảo mật', href: '/app/settings' },
              { label: 'Quản lý thiết bị', href: '/app/settings/devices' },
              { label: 'Gói dịch vụ', href: '/app/settings/plans' },
            ]}
          />
          <button
            type="button"
            onClick={() => router.push('/app/settings')}
            className="cursor-pointer text-slate-900 dark:text-white font-semibold shrink-0 whitespace-nowrap"
          >
            Bảo mật
          </button>
          <BreadcrumbChevron
            menuTitle="Bảo mật"
            items={[
              { label: 'Đổi mật khẩu', href: '/app/settings/edit-password' },
              { label: 'Quản lý thiết bị', href: '/app/settings/devices' },
            ]}
          />
          <span className="text-slate-900 dark:text-white font-semibold truncate min-w-0 flex-1">
            Đổi mật khẩu
          </span>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã thay đổi mật khẩu thành công
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded-xl text-xs font-semibold">
                {errorMsg}
              </div>
            )}
            <Input
              label="Mật khẩu hiện tại"
              type="password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
            <Input
              label="Mật khẩu mới"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => router.push('/app/settings/security')}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
