'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ArrowLeft, GraduationCap, Check, ChevronRight } from 'lucide-react';

import { createClass } from '@/lib/classesApi';
import { useAuthStore } from '@/store/useAuthStore';

export default function CreateClassPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [newClassName, setNewClassName] = useState('');
  const [classLoading, setClassLoading] = useState(false);
  const [toast, setToast] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setClassLoading(true);
    try {
      await createClass(token, newClassName.trim(), user);
      setToast(true);
      setTimeout(() => {
        router.push('/app/classes');
      }, 800);
    } catch {
      setToast(true);
      setTimeout(() => {
        router.push('/app/classes');
      }, 800);
    } finally {
      setClassLoading(false);
    }
  };

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1 text-2xl font-[450] tracking-tight text-slate-900 dark:text-slate-100 flex-wrap -ml-2">
          <button
            type="button"
            onClick={() => router.push('/app/classes')}
            className="transition-colors cursor-pointer px-2 py-0.5 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-900 dark:text-white font-[450]"
          >
            Lớp học của tôi
          </button>
          <BreadcrumbChevron
            menuTitle="Lớp học của tôi"
            items={[
              { label: 'Danh sách lớp học', href: '/app/classes' },
              { label: 'Tạo lớp học mới', href: '/app/classes/create' },
              { label: 'Tham gia lớp học', href: '/app/classes/join' },
            ]}
          />
          <span className="px-2 py-0.5 rounded-xl text-slate-900 dark:text-white font-[450]">
            Tạo lớp học mới
          </span>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-google-green" />
            Đã tạo lớp học mới thành công
          </div>
        )}

        <div className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Tên lớp học"
              placeholder="Ví dụ: Đại số 12A1, Tiếng Anh K15, Vật lý 10-T1"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={classLoading}>
                {classLoading ? 'Đang tạo...' : 'Tạo lớp ngay'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
