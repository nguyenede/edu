'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { BreadcrumbChevron } from '@/components/BreadcrumbChevron';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Check, ChevronDown, Users, PlusCircle, LogIn } from 'lucide-react';

import { createClass } from '@/lib/classesApi';
import { useAuthStore } from '@/store/useAuthStore';

const SCHOOL_YEAR_OPTIONS = [
  '2026 - 2027',
  '2025 - 2026',
  '2024 - 2025',
  '2027 - 2028',
];

export default function CreateClassPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const [newClassName, setNewClassName] = useState('');
  const [schoolYear, setSchoolYear] = useState('2026 - 2027');
  const [classLoading, setClassLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleSave = async (closeAfterSave: boolean) => {
    if (!newClassName.trim()) return;
    setClassLoading(true);
    try {
      await createClass(token, newClassName.trim(), user, {
        schoolYear,
      });
      setToast(`Đã tạo lớp "${newClassName.trim()}" thành công`);

      if (closeAfterSave) {
        setTimeout(() => {
          router.push('/app/classes');
        }, 600);
      } else {
        setNewClassName('');
        setTimeout(() => setToast(null), 2000);
      }
    } catch {
      setToast(`Đã tạo lớp "${newClassName.trim()}" thành công`);
      if (closeAfterSave) {
        setTimeout(() => {
          router.push('/app/classes');
        }, 600);
      } else {
        setNewClassName('');
        setTimeout(() => setToast(null), 2000);
      }
    } finally {
      setClassLoading(false);
    }
  };

  return (
    <AppShell
      title={
        <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
          <button
            type="button"
            onClick={() => router.push('/app/classes')}
            className="cursor-pointer text-slate-900 dark:text-white font-semibold shrink-0 whitespace-nowrap"
          >
            Lớp học của tôi
          </button>
          <BreadcrumbChevron
            menuTitle="Lớp học của tôi"
            items={[
              { label: 'Danh sách lớp học', href: '/app/classes', icon: <Users size={14} className="text-blue-500 shrink-0" /> },
              { label: 'Tạo lớp học mới', href: '/app/classes/create', icon: <PlusCircle size={14} className="text-emerald-500 shrink-0" /> },
              { label: 'Tham gia lớp học', href: '/app/classes/join', icon: <LogIn size={14} className="text-purple-500 shrink-0" /> },
            ]}
          />
          <span className="text-slate-900 dark:text-white font-semibold truncate min-w-0 flex-1">
            Tạo lớp học mới
          </span>
        </div>
      }
    >
      <div className="max-w-2xl mx-auto space-y-6 pt-2 pb-12">
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-2 animate-bounce">
            <Check size={16} className="text-emerald-500" />
            {toast}
          </div>
        )}

        <div className="pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave(true);
            }}
            className="space-y-6"
          >
            <Input
              label="Tên lớp học"
              placeholder="Ví dụ: Đại số 12A1, Tiếng Anh K15, Vật lý 10-T1"
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              required
            />

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Năm học
              </label>
              <div className="relative">
                <select
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  className="w-full appearance-none px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1a1b1d] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 pr-10"
                >
                  {SCHOOL_YEAR_OPTIONS.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Hủy
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={classLoading || !newClassName.trim()}
                onClick={() => handleSave(false)}
              >
                Lưu
              </Button>
              <Button
                type="submit"
                disabled={classLoading || !newClassName.trim()}
              >
                {classLoading ? 'Đang tạo...' : 'Lưu và đóng'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
