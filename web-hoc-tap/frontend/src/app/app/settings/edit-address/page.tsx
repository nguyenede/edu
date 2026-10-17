'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { updateProfile } from '@/lib/profileApi';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';

export default function EditAddressPage() {
  const router = useRouter();
  const { token, user, updateUser } = useAuthStore();
  const [homeAddress, setHomeAddress] = useState(user?.homeAddress || '');
  const [workAddress, setWorkAddress] = useState(user?.workAddress || '');
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
      const updatedUser = await updateProfile(token, { homeAddress, workAddress });
      updateUser(updatedUser);
      setToast(true);
      setTimeout(() => {
        router.push('/app/settings/account');
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể cập nhật địa chỉ');
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
            className="cursor-pointer text-slate-900 dark:text-white font-normal shrink-0 whitespace-nowrap"
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
              { label: 'Gói', href: '/app/settings/plans' },
            ]}
          />
          <button
            type="button"
            onClick={() => router.push('/app/settings')}
            className="cursor-pointer text-slate-900 dark:text-white font-normal shrink-0 whitespace-nowrap"
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
          <span className="text-slate-900 dark:text-white font-normal truncate min-w-0 flex-1">
            Địa chỉ liên hệ
          </span>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã lưu địa chỉ thành công
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
              label="Địa chỉ nhà riêng"
              value={homeAddress}
              onChange={(e) => setHomeAddress(e.target.value)}
              placeholder="Nhập địa chỉ nhà"
            />
            <Input
              label="Địa chỉ cơ quan / nơi làm việc"
              value={workAddress}
              onChange={(e) => setWorkAddress(e.target.value)}
              placeholder="Nhập địa chỉ làm việc"
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => router.push('/app/settings/account')}>
                Hủy
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Đang lưu' : 'Lưu địa chỉ'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
