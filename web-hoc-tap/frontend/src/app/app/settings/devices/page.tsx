'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { ArrowLeft, Laptop, Smartphone, Globe, Check, ChevronRight, Settings, User, Lock, Crown, Shield } from 'lucide-react';

export default function DevicesPage() {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
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
              { label: 'Cài đặt chung', href: '/app/settings', icon: <Settings size={14} className="text-slate-500 shrink-0" /> },
              { label: 'Hồ sơ cá nhân', href: '/app/settings/edit-name', icon: <User size={14} className="text-blue-500 shrink-0" /> },
              { label: 'Bảo mật', href: '/app/settings', icon: <Shield size={14} className="text-rose-500 shrink-0" /> },
              { label: 'Quản lý thiết bị', href: '/app/settings/devices', icon: <Laptop size={14} className="text-purple-500 shrink-0" /> },
              { label: 'Gói dịch vụ', href: '/app/settings/plans', icon: <Crown size={14} className="text-amber-500 shrink-0" /> },
            ]}
          />
          <button
            type="button"
            onClick={() => router.push('/app/settings')}
            className="cursor-pointer text-slate-900 dark:text-white font-normal shrink-0 whitespace-nowrap"
          >
            Bảo mật
          </button>
          <BreadcrumbChevron
            menuTitle="Bảo mật"
            items={[
              { label: 'Đổi mật khẩu', href: '/app/settings/edit-password', icon: <Lock size={14} className="text-rose-500 shrink-0" /> },
              { label: 'Quản lý thiết bị', href: '/app/settings/devices', icon: <Laptop size={14} className="text-purple-500 shrink-0" /> },
            ]}
          />
          <span className="text-slate-900 dark:text-white font-normal truncate min-w-0 flex-1">
            Quản lý thiết bị
          </span>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            {toast}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Laptop size={22} className="text-google-blue" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Windows PC (Thiết bị này)
                </p>
                <span className="text-xs text-google-blue font-medium">
                  Đang hoạt động ngay bây giờ
                </span>
              </div>
            </div>
            <Badge variant="success">Hiện tại</Badge>
          </div>

          <div className="p-4 bg-slate-100/70 dark:bg-slate-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone size={22} className="text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Redmi 12C (Android)
                </p>
                <span className="text-xs text-slate-400">
                  Hoạt động 3 giờ trước · Hà Nội
                </span>
              </div>
            </div>
            <button
              onClick={() => showToast('Đã đăng xuất khỏi Redmi 12C')}
              className="text-xs font-medium text-google-red hover:underline px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Đăng xuất
            </button>
          </div>

          <div className="p-4 bg-slate-100/70 dark:bg-slate-800 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe size={22} className="text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Linux Workstation (43F)
                </p>
                <span className="text-xs text-slate-400">
                  Hoạt động 2 ngày trước
                </span>
              </div>
            </div>
            <button
              onClick={() => showToast('Đã đăng xuất khỏi Linux Workstation')}
              className="text-xs font-medium text-google-red hover:underline px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Đăng xuất
            </button>
          </div>

          <div className="pt-4 flex justify-end">
            <Button onClick={() => router.push('/app/settings/security')}>
              Hoàn tất
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
