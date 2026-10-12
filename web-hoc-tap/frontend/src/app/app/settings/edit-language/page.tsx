'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { updateProfile } from '@/lib/profileApi';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';

export default function EditLanguagePage() {
  const router = useRouter();
  const { token, user, updateUser } = useAuthStore();
  const [language, setLanguage] = useState(user?.language || 'Tiếng Việt (Việt Nam)');
  const [toast, setToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelect = async (lang: string) => {
    if (!token) {
      router.push('/login');
      return;
    }
    setLanguage(lang);
    setSaving(true);
    setErrorMsg(null);
    try {
      const updatedUser = await updateProfile(token, { language: lang });
      updateUser(updatedUser);
      setToast(true);
      setTimeout(() => {
        router.push('/app/settings/account');
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể cập nhật ngôn ngữ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl font-[450] tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => router.push('/app/settings')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-[450]"
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
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-[450]"
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
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-[450]">
            Ngôn ngữ hệ thống
          </span>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã chuyển đổi ngôn ngữ hiển thị
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xs space-y-3">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}
          {[
            'Tiếng Việt (Việt Nam)',
            'English (United States)',
            'Français (France)',
            '日本語 (Japanese)',
          ].map((lang) => (
            <button
              key={lang}
              disabled={saving}
              onClick={() => handleSelect(lang)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl text-sm font-medium transition-all ${
                language === lang
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 text-google-blue border border-google-blue/30'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800'
              }`}
            >
              <span>{lang}</span>
              {language === lang && <Check size={18} className="text-google-blue" />}
            </button>
          ))}

          <div className="flex justify-end pt-4">
            <Button variant="ghost" onClick={() => router.push('/app/settings/account')}>
              Quay lại
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
