'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { Button } from '@/components/Button';
import { updateProfile } from '@/lib/profileApi';
import { useAuthStore } from '@/store/useAuthStore';
import { ArrowLeft, Check } from 'lucide-react';

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
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã chuyển đổi ngôn ngữ hiển thị
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
              Ngôn ngữ hệ thống
            </h1>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-3">
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
            <Button variant="ghost" onClick={() => router.push('/settings')}>
              Quay lại
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
